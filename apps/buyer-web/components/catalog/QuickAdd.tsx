'use client';

import { useState } from 'react';
import Link from 'next/link';
import { buyerDeliveryPhrase, type ProductSummary } from '@sthiva/web-core';
import { addToCart } from '@/lib/cart';
import { rupees } from '@/lib/format';

type Offer = ProductSummary & {
  supplierId?: { _id?: string; businessName?: string } | null;
  images?: { url: string; isPrimary?: boolean }[];
  minOrderQuantity?: number;
  stockQuantity?: number;
  deliveryDays?: number;
  deliveryDaysMax?: number;
  supply?: 'IN_STOCK' | 'ON_ORDER';
  distanceKm?: number | null;
};

// The best matching offer for this material, addable in one tap: no scrolling through the offers list.
// Checkout always re-prices from the live listing, so the price here is the listing's own.
export function QuickAdd({ offer, total }: { offer: ProductSummary; total: number }) {
  const o = offer as Offer;
  const min = Math.max(1, o.minOrderQuantity ?? 1);
  const onOrder = o.supply === 'ON_ORDER';
  const stock = onOrder ? Infinity : o.stockQuantity ?? 0;
  const [qty, setQty] = useState(min);
  const [added, setAdded] = useState(false);
  if (stock < min) return null;

  const unit = o.unit.toLowerCase().replace('_', ' ');
  const set = (n: number) => { setAdded(false); setQty(Math.min(Math.max(min, Math.round(n) || min), Number.isFinite(stock) ? stock : 1_000_000)); };

  function add() {
    addToCart(o.supplierId?._id ?? 'unknown', o.supplierId?.businessName ?? 'Supplier', {
      productId: o._id,
      name: o.name,
      imageUrl: o.images?.find((i) => i.isPrimary)?.url ?? o.images?.[0]?.url,
      unit: o.unit,
      basePrice: o.basePrice,
      quantity: qty,
      minOrderQuantity: min,
    });
    setAdded(true);
  }

  return (
    <section className="rounded-2xl border border-ink bg-sand-2 p-5" aria-labelledby="quick-add-title">
      <p id="quick-add-title" className="eyebrow text-stone">Best offer for you</p>
      <Link href={`/product/${o._id}`} className="mt-2 block font-semibold leading-snug hover:underline">{o.name}</Link>
      <p className="mt-0.5 text-[13px] text-stone">
        {o.supplierId?.businessName ?? 'Verified supplier'}
        {typeof o.distanceKm === 'number' && ` · about ${Math.max(1, Math.round(o.distanceKm))} km away`}
      </p>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums">
        {rupees.format(o.basePrice)}<span className="text-[14px] font-medium text-stone"> / {unit}</span>
      </p>
      <p className="mt-1 text-[13px] text-stone">
        {onOrder ? 'On order: the supplier confirms the date within 24 hours' : `Usually delivered ${buyerDeliveryPhrase(o.deliveryDays, o.deliveryDaysMax)}`}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center rounded-full border border-sand-4 bg-sand">
          <button type="button" onClick={() => set(qty - 1)} disabled={qty <= min} className="grid h-11 w-11 place-items-center rounded-full disabled:opacity-40" aria-label="Less">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">remove</span>
          </button>
          <input
            value={qty}
            onChange={(e) => set(Number(e.target.value.replace(/\D/g, '')))}
            inputMode="numeric"
            className="w-14 bg-transparent text-center font-mono text-[16px] focus:outline-none"
            aria-label={`Quantity in ${unit}`}
          />
          <button type="button" onClick={() => set(qty + 1)} className="grid h-11 w-11 place-items-center rounded-full" aria-label="More">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
          </button>
        </div>
        {added ? (
          <Link href="/cart" className="btn-ink flex-1 whitespace-nowrap px-3 py-3">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">shopping_cart</span>
            View cart
          </Link>
        ) : (
          <button type="button" onClick={add} className="btn-lime flex-1 whitespace-nowrap px-3 py-3">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_shopping_cart</span>
            Add to cart
          </button>
        )}
      </div>
      <p className="mt-2 text-[13px] text-stone" role={added ? 'status' : undefined}>
        {added ? `Added ${qty} ${unit}. Price and GST are confirmed at checkout.` : `${rupees.format(o.basePrice * qty)} for ${qty} ${unit}, before GST and delivery${min > 1 ? ` (minimum ${min})` : ''}.`}
      </p>
      {total > 1 && <a href="#offers" className="mt-3 inline-block text-[14px] font-medium underline underline-offset-4">Compare all {total} offers</a>}
    </section>
  );
}
