'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSelectedLocation } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProductGallery } from '@/components/ProductGallery';
import { DeliveryCheck } from '@/components/catalog/DeliveryCheck';
import { QuantityHelper } from '@/components/catalog/QuantityHelper';
import { useProduct } from '@/lib/products';
import { useSupplierReviews } from '@/lib/reviews';
import { addToCart } from '@/lib/cart';
import { buyerDeliveryPhrase, matchCatalogItem } from '@sthiva/web-core';
import { rupees } from '@/lib/format';

const relativeDate = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function timeAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days < 30) return relativeDate.format(-days, 'day');
  if (days < 365) return relativeDate.format(-Math.round(days / 30), 'month');
  return relativeDate.format(-Math.round(days / 365), 'year');
}

function bestBulkPrice(base: number, tiers: { minQty: number; price: number }[] | undefined, qty: number) {
  if (!tiers?.length) return base;
  const applicable = tiers.filter((t) => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty)[0];
  return applicable ? applicable.price : base;
}

const UNIT_LABEL: Record<string, string> = {
  KG: 'kg', TON: 'tonne', PIECE: 'piece', BAG: 'bag', BUNDLE: 'bundle', CUBIC_METER: 'm³', SQUARE_METER: 'm²', LITER: 'litre', METER: 'metre', BOX: 'box', SHEET: 'sheet',
};
const unitLabel = (u: string) => UNIT_LABEL[u] ?? u.toLowerCase();

function Stars({ value, size = 'text-[18px]' }: { value: number; size?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`material-symbols-outlined ${size} ${i < Math.round(value) ? 'text-ink' : 'text-sand-4'}`} style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
          star
        </span>
      ))}
    </span>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const location = useSelectedLocation();
  const [quantity, setQuantity] = useState<number | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  // Phones see the buy box only after the gallery and details, so a slim bar keeps price and
  // Add to cart in reach until the real button scrolls into view
  const buyButtonRef = useRef<HTMLButtonElement>(null);
  const [buyButtonVisible, setBuyButtonVisible] = useState(true);

  const product = useProduct(id, location?.pincode ?? null);
  const data = product.status === 'success' ? product.data : undefined;
  const reviews = useSupplierReviews(data?.supplierId?._id);

  const minQty = data?.minOrderQuantity ?? 1;
  const qty = Math.max(quantity ?? minQty, minQty);
  const unitPrice = useMemo(() => (data ? bestBulkPrice(data.basePrice, data.bulkPricing, qty) : 0), [data, qty]);
  const tiers = data?.bulkPricing?.slice().sort((a, b) => a.minQty - b.minQty) ?? [];
  const catalog = data ? matchCatalogItem(data.name, data.categoryId?.slug) : undefined;
  const inStock = (data?.stockQuantity ?? 0) > 0;
  const onOrder = data?.supply === 'ON_ORDER';
  const notDeliverable = !!(location && data?.availability && !data.availability.deliverable);
  // No supplier serves this PIN yet: the order is still taken and Sthiva finds a supplier (in process)
  const outOfArea = notDeliverable && data?.availability?.reason === 'PINCODE_NOT_SERVED';
  const blockedByPin = notDeliverable && !outOfArea;
  const unit = data ? unitLabel(data.unit) : '';
  const canBuy = inStock && !blockedByPin;

  useEffect(() => {
    const el = buyButtonRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setBuyButtonVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [data]);

  function handleAddToCart() {
    if (!data) return;
    const result = addToCart(data.supplierId?._id ?? 'unknown', data.supplierId?.businessName ?? 'Supplier', {
      productId: data._id,
      name: data.name,
      imageUrl: data.images?.find((img) => img.isPrimary)?.url ?? data.images?.[0]?.url,
      unit: data.unit,
      basePrice: unitPrice,
      quantity: qty,
      minOrderQuantity: minQty,
    });
    setCartNotice(result === 'added' ? `Added ${qty} ${unit} to your cart.` : '');
  }

  return (
    <>
      <Header />
      <main id="main" className="container-x pb-24 pt-[calc(var(--header-h)+32px)]">
        {product.status === 'loading' && (
          <div className="grid gap-10 lg:grid-cols-12" role="status" aria-label="Loading product">
            <div className="skeleton aspect-square lg:col-span-7" />
            <div className="flex flex-col gap-4 lg:col-span-5">
              <div className="skeleton h-12 w-3/4" />
              <div className="skeleton h-40" />
              <div className="skeleton h-32" />
            </div>
          </div>
        )}
        {product.status === 'error' && (
          <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">inventory_2</span>
            <p className="font-display text-xl font-semibold">This listing isn&apos;t available</p>
            <p className="max-w-sm text-[15px] text-stone">It may have been removed by the supplier.</p>
            <Link href="/#categories" className="btn-ink mt-3">Browse materials</Link>
          </div>
        )}

        {data && (
          <>
            <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-stone">
              <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span>{' '}
              {data.categoryId && (
                <>
                  <Link href={`/category/${data.categoryId.slug}`} className="hover:text-ink">{data.categoryId.name}</Link> <span aria-hidden="true">/</span>{' '}
                </>
              )}
              <span className="text-ink">{data.name}</span>
            </nav>

            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              {/* left: media + details */}
              <div className="flex flex-col gap-10 lg:col-span-7">
                <ProductGallery
                  images={data.images ?? []}
                  name={data.name}
                  category={data.categoryId?.name}
                  badges={data.supplierId?.verificationStatus === 'VERIFIED' ? ['Verified supplier'] : undefined}
                />

                {data.description && (
                  <section aria-labelledby="about-title">
                    <h2 id="about-title" className="font-display text-xl font-semibold tracking-tight">About this listing</h2>
                    <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed text-stone">{data.description}</p>
                  </section>
                )}

                {data.specifications && Object.keys(data.specifications).length > 0 && (
                  <section aria-labelledby="spec-title">
                    <h2 id="spec-title" className="font-display text-xl font-semibold tracking-tight">Specifications</h2>
                    <dl className="mt-3 divide-y divide-sand-4 overflow-hidden rounded-2xl border border-sand-4 bg-sand-2">
                      {Object.entries(data.specifications).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 px-5 py-3.5 text-[15px]">
                          <dt className="text-stone">{k}</dt>
                          <dd className="font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                {catalog && (
                  <section className="card p-5 sm:p-6" aria-labelledby="material-title">
                    <p className="eyebrow text-stone">About the material</p>
                    <h2 id="material-title" className="mt-2 font-display text-xl font-semibold tracking-tight">{catalog.name}</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone">{catalog.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {catalog.standard && <span className="rounded-full bg-cobalt-soft px-3 py-1 font-mono text-[12px] text-[#0F2A8A]">{catalog.standard}</span>}
                      {catalog.soldAs.map((s) => (
                        <span key={s.label} className="rounded-full bg-sand-3 px-3 py-1 text-[13px]">{s.label}{s.note ? ` (${s.note})` : ''}</span>
                      ))}
                    </div>
                    <Link href={`/materials/${catalog.id}`} className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-cobalt hover:underline">
                      Sizes, uses and other brands
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </section>
                )}

                {catalog?.calculator && <QuantityHelper calculator={catalog.calculator} />}
              </div>

              {/* right: buy box */}
              <aside className="flex flex-col gap-5 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:col-span-5 lg:self-start">
                <div>
                  {data.categoryId?.name && <p className="eyebrow text-stone">{data.categoryId.name}</p>}
                  <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[0.98] tracking-tightest">{data.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]">
                    <span className="text-stone">by <span className="font-semibold text-ink">{data.supplierId?.businessName ?? 'Supplier'}</span></span>
                    {data.supplierId?.verificationStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 font-medium text-tertiary">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">verified</span>
                        Verified supplier
                      </span>
                    )}
                    {(data.totalReviews ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Stars value={data.avgRating ?? 0} size="text-[16px]" />
                        <span className="text-stone">({data.totalReviews})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* price */}
                <section className="rounded-2xl bg-ink p-5 text-sand sm:p-6" aria-label="Price">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold tabular-nums">{rupees.format(data.basePrice)}</span>
                    <span className="text-[16px] text-stone-light">per {unit}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-stone-light">Excluding GST and delivery, which are shown at checkout.</p>
                  {tiers.length > 0 && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <p className="eyebrow text-lime">Bulk prices</p>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {tiers.map((t) => (
                          <li key={t.minQty} className={`flex justify-between text-[14px] ${qty >= t.minQty ? 'text-sand' : 'text-stone-light'}`}>
                            <span>{t.minQty}+ {unit}</span>
                            <span className="tabular-nums">{rupees.format(t.price)} / {unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className={`mt-4 flex items-center gap-1.5 text-[14px] ${inStock ? 'text-lime' : 'text-signal-red'}`}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{onOrder ? 'local_shipping' : inStock ? 'inventory' : 'block'}</span>
                    {onOrder ? 'On order: the supplier gets it from the company or makes it for you' : inStock ? 'In stock with this supplier' : 'Out of stock'}
                  </p>
                  {inStock && data.deliveryDays !== undefined && !onOrder && !outOfArea && (
                    <p className="mt-2 flex items-center gap-1.5 text-[14px] text-stone-light">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">schedule</span>
                      Usually delivered {buyerDeliveryPhrase(data.deliveryDays, data.deliveryDaysMax)} after the supplier accepts
                    </p>
                  )}
                  {(onOrder || outOfArea) && (
                    <p className="mt-2 flex items-start gap-1.5 text-[14px] text-stone-light">
                      <span className="material-symbols-outlined mt-0.5 text-[18px]" aria-hidden="true">pending</span>
                      <span>
                        Your order will be in process.{' '}
                        {outOfArea
                          ? 'No supplier delivers to your PIN yet; Sthiva finds one and tells you the date within 24 hours.'
                          : 'The supplier confirms the delivery date within 24 hours and you will be notified.'}
                      </span>
                    </p>
                  )}
                </section>

                {/* delivery check, right where the decision is made */}
                {!outOfArea && <DeliveryCheck availability={location ? data.availability : undefined} title="Delivery to your site" />}

                {/* quantity */}
                <section className="rounded-2xl border border-sand-4 bg-sand-2 p-5" aria-labelledby="qty-title">
                  <div className="flex items-center justify-between gap-4">
                    <h2 id="qty-title" className="text-[15px] font-semibold">Quantity <span className="font-normal text-stone">({unit})</span></h2>
                    <div className="flex items-center rounded-full border border-sand-4 bg-sand">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(minQty, qty - 1))}
                        disabled={qty <= minQty}
                        className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand-3 disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={minQty}
                        value={qty}
                        onChange={(e) => setQuantity(Math.max(minQty, Math.floor(Number(e.target.value) || minQty)))}
                        className="w-16 bg-transparent text-center font-mono text-[16px] outline-none"
                        aria-label={`Quantity in ${unit}`}
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(qty + 1)}
                        className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand-3"
                        aria-label="Increase quantity"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                  {minQty > 1 && <p className="mt-2 text-[13px] text-stone">Minimum order: {minQty} {unit}</p>}
                  <div className="mt-4 flex items-baseline justify-between border-t border-sand-4 pt-4">
                    <span className="text-[14px] text-stone">Estimated total</span>
                    <span className="font-display text-2xl font-bold tabular-nums">{rupees.format(unitPrice * qty)}</span>
                  </div>
                </section>

                <button ref={buyButtonRef} type="button" onClick={handleAddToCart} disabled={!canBuy} className="btn-lime w-full py-4 text-[16px]">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_shopping_cart</span>
                  {blockedByPin ? 'Not deliverable to your PIN' : !inStock ? 'Out of stock' : 'Add to cart'}
                </button>
                {cartNotice && (
                  <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-sand-3 px-4 py-3">
                    <p className="text-[14px]">{cartNotice}</p>
                    <Link href="/cart" className="shrink-0 text-[14px] font-semibold text-cobalt hover:underline">View cart</Link>
                  </div>
                )}
                <p className="flex items-center justify-center gap-1.5 text-[13px] text-stone">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">payments</span>
                  Cash on delivery
                </p>
              </aside>
            </div>

            {!buyButtonVisible && (
              <div className="fixed inset-x-3 bottom-[92px] z-40 flex items-center justify-between gap-3 rounded-2xl border border-sand-4 bg-sand px-4 py-3 shadow-[0_18px_50px_-12px_rgba(11,12,10,0.45)] md:bottom-4 lg:hidden">
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-stone" role={cartNotice ? 'status' : undefined}>
                    {cartNotice ? 'Added to your cart' : `${qty} ${unit} · + GST, delivery`}
                  </p>
                  <p className="font-display text-xl font-bold tabular-nums">{rupees.format(unitPrice * qty)}</p>
                </div>
                {cartNotice ? (
                  <Link href="/cart" className="btn-ink shrink-0 px-5 py-3 text-[15px]">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">shopping_cart</span>
                    View cart
                  </Link>
                ) : canBuy ? (
                  <button type="button" onClick={handleAddToCart} className="btn-lime shrink-0 px-5 py-3 text-[15px]">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_shopping_cart</span>
                    Add to cart
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => buyButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="btn-ink shrink-0 px-5 py-3 text-[15px]"
                  >
                    {blockedByPin ? 'Not deliverable' : 'Out of stock'}
                  </button>
                )}
              </div>
            )}

            {/* supplier + reviews */}
            <section className="mt-20 grid gap-4 md:grid-cols-3" aria-labelledby="reviews-title">
              <div className="card flex flex-col items-center p-8 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink font-display text-2xl font-bold text-lime">
                  {data.supplierId?.businessName?.[0] ?? '?'}
                </span>
                <p className="mt-4 font-display text-xl font-semibold">{data.supplierId?.businessName ?? 'Supplier'}</p>
                {data.supplierId?.verificationStatus === 'VERIFIED' && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[14px] text-tertiary">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified</span> Verified
                  </p>
                )}
                {(data.supplierId?.avgRating ?? 0) > 0 && <div className="mt-3"><Stars value={data.supplierId!.avgRating!} /></div>}
              </div>
              <div className="card p-6 md:col-span-2 sm:p-8">
                <h2 id="reviews-title" className="font-display text-xl font-semibold tracking-tight">Buyer reviews</h2>
                <div className="mt-5">
                  {reviews.status === 'loading' && <div className="skeleton h-20" />}
                  {reviews.status === 'error' && <p className="text-[15px] text-error">Couldn&apos;t load reviews.</p>}
                  {reviews.status === 'success' && reviews.data.length === 0 && (
                    <p className="text-[15px] text-stone">No reviews yet. Reviews appear here after buyers receive their orders.</p>
                  )}
                  {reviews.status === 'success' && reviews.data.length > 0 && (
                    <ul className="flex flex-col gap-6">
                      {reviews.data.map((r) => (
                        <li key={r._id} className="flex gap-4">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand-3 font-semibold">{r.reviewerId?.name?.[0] ?? 'B'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="text-[15px] font-semibold">{r.reviewerId?.name ?? 'Buyer'}</p>
                              <span className="font-mono text-[11px] uppercase text-stone">{timeAgo(r.createdAt)}</span>
                            </div>
                            <div className="mt-1"><Stars value={r.rating} size="text-[14px]" /></div>
                            {r.comment && <p className="mt-2 text-[15px] text-stone">{r.comment}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        <Link href="/#categories" className="btn-ghost mt-12">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
          All materials
        </Link>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
