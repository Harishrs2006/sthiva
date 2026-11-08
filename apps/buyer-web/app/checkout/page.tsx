'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buyerDeliveryPhrase, useApiClient, useSelectedLocation } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorNote, PageHead, SummaryRow } from '@/components/account/AccountUI';
import { useCart, clearCart } from '@/lib/cart';
import { quoteCart, placeOrder, type Quote } from '@/lib/orders';
import { rupees } from '@/lib/format';
import { readSavedAddress, saveAddress } from '@/lib/saved-address';

const LABELS = ['Site', 'Home', 'Office', 'Warehouse'];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-[13px] text-lime">{n}</span>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CheckoutForm() {
  const client = useApiClient();
  const { user } = useAuth();
  const cart = useCart();
  const location = useSelectedLocation();
  const router = useRouter();

  const [quote, setQuote] = useState<{ status: 'loading' } | { status: 'success'; data: Quote } | { status: 'error'; message: string }>({ status: 'loading' });
  const [label, setLabel] = useState('Site');
  const [fullAddress, setFullAddress] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone?.replace(/\D/g, '').slice(-10) ?? '');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [usedSaved, setUsedSaved] = useState(false);

  // A repeat order starts with the address used last time for this site (editable as usual)
  useEffect(() => {
    const saved = readSavedAddress(location?.pincode);
    if (!saved) return;
    setLabel(saved.label);
    setFullAddress((a) => a || saved.fullAddress);
    setContactPhone((p) => p || saved.contactPhone);
    setUsedSaved(true);
  }, [location?.pincode]);

  const items = useMemo(() => cart?.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) ?? [], [cart]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    let cancelled = false;
    setQuote({ status: 'loading' });
    quoteCart(client, items, location?.pincode)
      .then((data) => { if (!cancelled) setQuote({ status: 'success', data }); })
      .catch((err) => {
        if (cancelled) return;
        setQuote({ status: 'error', message: err instanceof Error ? err.message : 'Could not price your cart' });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, JSON.stringify(items), location?.pincode]);

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon="shopping_cart"
        title="Nothing to check out"
        body="Your cart is empty. Add materials from a supplier first."
        cta={{ href: '/#categories', label: 'Browse materials' }}
      />
    );
  }

  // Out of area is allowed (Sthiva finds a supplier); any other not-serviceable answer blocks the order
  const notServiceable = quote.status === 'success' && quote.data.delivery !== null && !quote.data.delivery.serviceable && !quote.data.outOfArea;
  const canPlace =
    !placing && quote.status === 'success' && !notServiceable && quote.data.deliveryPricing?.status !== 'UNPRICED' && fullAddress.trim().length >= 5 && /^[6-9]\d{9}$/.test(contactPhone);

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (quote.status !== 'success') return;
    setPlaceError(null);
    setPlacing(true);
    try {
      const result = await placeOrder(
        client,
        {
          items,
          deliveryAddress: { label, fullAddress, pincode: location?.pincode, contactPhone },
          expectedTotal: quote.data.total,
        },
        idempotencyKey
      );
      saveAddress({ label, fullAddress, contactPhone, pincode: location?.pincode });
      clearCart();
      router.push(`/orders/${result.orderId}`);
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <form onSubmit={handlePlaceOrder} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-4">
        <Step n={1} title="Delivery address">
          <fieldset>
            <legend className="text-[14px] font-medium text-stone">Save this address as</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LABELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  aria-pressed={label === l}
                  className={`h-11 rounded-full border px-4 text-[14px] font-medium transition-colors ${
                    label === l ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 flex flex-col gap-2">
            <span className="text-[14px] font-medium text-stone">Full address</span>
            {usedSaved && <span className="text-[13px] text-stone">Filled in from your last order. Edit it if this order goes somewhere else.</span>}
            <textarea
              required
              rows={3}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="Plot or house no., street, area, landmark, city"
              autoComplete="street-address"
              className="field resize-none"
            />
          </label>

          {location?.pincode ? (
            <p className="mt-3 flex items-center gap-1.5 text-[14px] text-stone">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
              Delivering to PIN <span className="font-mono text-ink">{location.pincode}</span> ({location.label})
            </p>
          ) : (
            <p className="mt-3 text-[14px] text-stone">Tip: set your site PIN on the home page so we can check delivery before you order.</p>
          )}
        </Step>

        <Step n={2} title="Contact on site">
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-medium text-stone">Mobile number to call on delivery</span>
            <div className="flex items-center gap-2 rounded-xl border border-sand-4 bg-sand-2 pl-4 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(243,184,6,0.55)]">
              <span className="font-mono text-[15px] text-stone">+91</span>
              <input
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent py-3.5 pr-4 font-mono text-[15px] tracking-wide outline-none"
              />
            </div>
          </label>
        </Step>

        <Step n={3} title="Payment">
          <div className="flex items-center gap-4 rounded-xl border-2 border-ink bg-sand p-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-lime text-ink">
              <span className="material-symbols-outlined" aria-hidden="true">payments</span>
            </span>
            <div>
              <p className="font-semibold">Cash on delivery</p>
              <p className="text-[14px] text-stone">Pay when the materials reach your site.</p>
            </div>
          </div>
        </Step>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
        <div className="rounded-3xl bg-ink p-6 text-sand">
          <p className="eyebrow text-stone-light">Order summary</p>
          <p className="mt-2 text-[14px] text-stone-light">Supplied by a verified Sthiva supplier near you</p>

          {quote.status === 'loading' && (
            <div className="mt-5 flex flex-col gap-3" role="status" aria-label="Pricing your cart">
              {[0, 1, 2].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-white/10" />)}
            </div>
          )}

          {quote.status === 'error' && <p role="alert" className="mt-5 text-[15px] text-signal-red">{quote.message}</p>}

          {quote.status === 'success' && (
            <>
              <ul className="mt-5 flex flex-col gap-3 border-b border-white/10 pb-5">
                {quote.data.items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-4 text-[14px]">
                    <span className="min-w-0 text-stone-light">
                      <span className="font-mono text-sand">{item.quantity}</span> {item.unit.toLowerCase()} × {item.name}
                      {item.pricePerUnit < item.listPrice && (
                        <span className="mt-0.5 block text-[12px] text-lime">Bulk price {rupees.format(item.pricePerUnit)} / {item.unit.toLowerCase()}</span>
                      )}
                      {!item.inStock && <span className="mt-0.5 block text-[12px] text-signal-red">Only {item.stockQuantity} left</span>}
                    </span>
                    <span className="flex-shrink-0 tabular-nums">{rupees.format(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-2">
                <SummaryRow onDark label="Subtotal" value={rupees.format(quote.data.subtotal)} />
                <SummaryRow onDark label="GST" value={rupees.format(quote.data.gstAmount)} />
                <SummaryRow onDark label="Delivery" value={quote.data.deliveryCharge > 0 ? rupees.format(quote.data.deliveryCharge) : 'No charge'} />
                {quote.data.deliveryPricing?.status === 'PRICED' && (
                  <p className="text-[13px] text-stone-light">{quote.data.deliveryPricing.vehicle}, {quote.data.deliveryPricing.weightKg} kg, about {quote.data.deliveryPricing.distanceKm} km</p>
                )}
                <div className="mt-2 border-t border-white/10 pt-3">
                  <SummaryRow strong label="Total" value={rupees.format(quote.data.total)} />
                </div>
              </div>
              {(quote.data.outOfArea || quote.data.onOrder) ? (
                <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/[0.06] px-4 py-3 text-[14px] text-sand/80">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-lime" aria-hidden="true">pending</span>
                  <span>
                    <strong className="font-semibold text-sand">Your order will be in process.</strong>{' '}
                    {quote.data.outOfArea
                      ? 'No supplier delivers to your PIN yet. Sthiva finds one and tells you the delivery date and charge within 24 hours. You can cancel if it does not suit you.'
                      : 'Something here is ordered from the company or made for you. The supplier confirms the delivery date within 24 hours and you will be notified.'}
                  </span>
                </p>
              ) : quote.data.expectedDelivery && (
                <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/[0.06] px-4 py-3 text-[14px] text-sand/80">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-lime" aria-hidden="true">event</span>
                  <span>
                    Usually delivered <strong className="font-semibold text-sand">{buyerDeliveryPhrase(quote.data.expectedDelivery.minDays, quote.data.expectedDelivery.maxDays)}</strong> after
                    the supplier accepts. They confirm the exact date then, and your order page shows it.
                  </span>
                </p>
              )}
              {quote.data.deliveryPricing?.status === 'UNPRICED' && (
                <p role="alert" className="mt-4 rounded-xl bg-signal-red/15 px-4 py-3 text-[14px] text-[#FFB4B6]">{quote.data.deliveryPricing.message}</p>
              )}
              {notServiceable && (
                <p role="alert" className="mt-4 rounded-xl bg-signal-red/15 px-4 py-3 text-[14px] text-[#FFB4B6]">
                  This supplier does not deliver to PIN {quote.data.delivery?.pincode}. Change your PIN on the home page or pick another supplier.
                </p>
              )}
            </>
          )}

          {placeError && <p role="alert" className="mt-4 text-[14px] text-signal-red">{placeError}</p>}

          <button type="submit" disabled={!canPlace} className="btn-lime mt-6 w-full py-4 text-[16px]">
            {placing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]" aria-hidden="true">progress_activity</span>
                Placing order
              </>
            ) : (
              <>
                Place order{quote.status === 'success' && ` · ${rupees.format(quote.data.total)}`}
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[12px] text-stone-light">The supplier confirms the order before it is dispatched.</p>
        </div>
      </aside>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main id="main" className="container-x min-h-[70vh] pb-32 pt-[calc(var(--header-h)+40px)]">
        <PageHead eyebrow="Checkout" title="Almost" accent="there" />
        <div className="mt-10">
          <RequireAuth>
            <CheckoutForm />
          </RequireAuth>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
