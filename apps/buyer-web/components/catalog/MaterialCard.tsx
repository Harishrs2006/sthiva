import Image from 'next/image';
import Link from 'next/link';
import type { CatalogItem } from '@sthiva/web-core';

// A material type in the catalogue (not a supplier listing): what it is, sizes and how it is sold
export function MaterialCard({ item }: { item: CatalogItem }) {
  const sizes = item.variants[item.variants.length - 1];
  return (
    <Link
      href={`/materials/${item.id}`}
      className="group flex h-full flex-col rounded-2xl border border-sand-4/80 bg-sand-2 p-4 transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-ink hover:shadow-[0_24px_60px_-28px_rgba(11,12,10,0.45)] sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand-3">
          <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow text-stone">{item.group}</p>
          <h3 className="mt-1 font-display text-[19px] font-semibold leading-tight tracking-[-0.02em]">{item.name}</h3>
          {item.standard && <p className="mt-1 font-mono text-[11px] text-stone">{item.standard}</p>}
          {item.madeToOrder && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-sand">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">straighten</span>
              Made to order
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-relaxed text-stone">{item.summary}</p>
      {sizes && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {sizes.options.slice(0, 5).map((o) => (
            <span key={o} className="rounded-full bg-sand-3 px-2.5 py-1 text-[12px] font-medium">{o}</span>
          ))}
          {sizes.options.length > 5 && <span className="rounded-full px-2 py-1 text-[12px] text-stone">+{sizes.options.length - 5} more</span>}
        </div>
      )}
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p className="text-[13px] text-stone">
          <span className="font-medium text-ink">Sold </span>
          {item.soldAs.map((s) => s.label.replace(/^Per /, 'per ')).slice(0, 2).join(' or ')}
        </p>
        <span className="material-symbols-outlined text-[22px] text-stone transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true">
          arrow_forward
        </span>
      </div>
    </Link>
  );
}
