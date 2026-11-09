import Image from 'next/image';
import Link from 'next/link';
import { categoryIcon, type Category } from '@/lib/categories';
import { catalogCategory, catalogItems } from '@sthiva/web-core';
import { Reveal } from './motion/Reveal';

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">inventory_2</span>
        <p className="font-display text-xl font-semibold">No categories listed yet</p>
        <p className="max-w-sm text-[15px] text-stone">Suppliers are still setting up their catalogues. Check back soon.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {categories.map((category, i) => {
        const meta = catalogCategory(category.slug);
        const types = catalogItems(category.slug).length;
        return (
          <Reveal as="li" key={category._id} delay={(i % 4) * 70}>
            <Link
              href={`/category/${category.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-sand-4/80 bg-sand-2 transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-ink hover:shadow-[0_24px_60px_-28px_rgba(11,12,10,0.45)]"
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-sand-3">
                {meta?.photo ? (
                  <Image
                    src={meta.photo}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
                  />
                ) : (
                  <span className="material-symbols-outlined absolute inset-0 m-auto h-fit w-fit text-5xl text-stone" aria-hidden="true">
                    {categoryIcon(category.name)}
                  </span>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(11,12,10,0.45))]" aria-hidden="true" />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-[16px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[18px]">{category.name}</h3>
                  <span className="material-symbols-outlined mt-0.5 hidden text-[22px] text-stone transition-transform sm:inline duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true">
                    arrow_outward
                  </span>
                </div>
                {meta?.tagline && <p className="hidden text-[14px] leading-snug text-stone sm:block">{meta.tagline}</p>}
                {types > 0 && <p className="mt-auto pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-stone sm:pt-2 sm:text-[11px]">{types} material types</p>}
              </div>
            </Link>
          </Reveal>
        );
      })}
    </ul>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-label="Loading categories" role="status">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton aspect-[4/5]" />
      ))}
    </div>
  );
}
