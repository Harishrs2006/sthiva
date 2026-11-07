import Link from 'next/link';
import { buyerDeliveryRange, deliveryTimeLabel, type ProductSummary } from '@sthiva/web-core';
import { illustrationFor } from '@/lib/illustrations';

type ProductExtras = {
  images?: { url: string; isPrimary?: boolean }[];
  supplierId?: { businessName?: string };
  sellerCount?: number; // suppliers selling this item (Sthiva picks one at order time)
  categoryId?: { name?: string };
  deliveryDays?: number;
  deliveryDaysMax?: number;
  supply?: 'IN_STOCK' | 'ON_ORDER';
  distanceKm?: number | null;
  avgRating?: number;
  totalReviews?: number;
};

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

// The supplier's usual time as buyers see it (a single number gets a day of slack); on-order items have
// no fixed time until the supplier confirms
function deliveryLabel(p: ProductExtras): string | null {
  if (p.supply === 'ON_ORDER') return 'On order, date confirmed in 24h';
  if (p.deliveryDays === undefined) return null;
  const r = buyerDeliveryRange(p.deliveryDays, p.deliveryDaysMax);
  return r.min === 0 && r.max === 1 ? 'Same or next day' : deliveryTimeLabel(r.min, r.max);
}

export function ProductListCard({ product }: { product: ProductSummary }) {
  const extra = product as ProductSummary & ProductExtras;
  const image = extra.images?.find((i) => i.isPrimary) ?? extra.images?.[0];
  const rated = (extra.totalReviews ?? 0) > 0 && extra.avgRating !== undefined;
  const delivery = deliveryLabel(extra);
  const km = typeof extra.distanceKm === 'number' ? extra.distanceKm : null;

  return (
    <Link
      href={`/product/${product._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-sand-4/80 bg-sand-2 transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-ink/30 hover:shadow-[0_30px_60px_-30px_rgba(11,12,10,0.4)]"
    >
      <div className="relative m-2 aspect-[4/3] overflow-hidden rounded-[18px] bg-sand-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={illustrationFor(product.name, extra.categoryId?.name)}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-sand backdrop-blur">
              Illustration
            </span>
          </>
        )}
        {rated && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sand-2/95 px-2.5 py-1 text-[12px] font-semibold text-ink backdrop-blur">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">star</span>
            {extra.avgRating!.toFixed(1)}
            <span className="font-normal text-stone">({extra.totalReviews})</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <h3 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.02em] text-ink">{product.name}</h3>
        {(extra.sellerCount ?? 0) > 1 && <p className="mt-1 text-[14px] text-stone">{extra.sellerCount} verified suppliers</p>}
        {km !== null && <p className="mt-1 text-[13px] text-stone">About {km < 1 ? '1' : Math.round(km)} km from your site</p>}

        <div className="mt-auto flex items-end justify-between gap-3 pt-6">
          <div>
            <p className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
              {rupees.format(product.basePrice)}
              <span className="ml-1 text-[14px] font-medium text-stone">/ {product.unit.toLowerCase()}</span>
            </p>
            {delivery && (
              <p className="mt-1 flex items-center gap-1 text-[13px] text-stone">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">local_shipping</span>
                {delivery}
              </p>
            )}
          </div>
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-lime transition-transform duration-500 ease-out-expo group-hover:rotate-[-45deg]"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
