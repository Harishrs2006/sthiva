'use client';

import { use, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useProductsForLocation, useSelectedLocation } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProductListCard } from '@/components/ProductListCard';
import { MaterialCard } from '@/components/catalog/MaterialCard';
import { useCategories } from '@/lib/categories';
import { catalogCategory, catalogItems } from '@sthiva/web-core';

// Only sort orders the API actually supports, so no filter promises a feature that isn't real
const SORTS = [
  { value: undefined, label: 'Popular' },
  { value: 'price_asc' as const, label: 'Price: low to high' },
] as const;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-[14px] font-medium transition-colors ${
        active ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'
      }`}
    >
      {children}
    </button>
  );
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const categories = useCategories();
  const location = useSelectedLocation();
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>(undefined);
  const [group, setGroup] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const products = useProductsForLocation({ category: slug, sort });

  const category = categories.status === 'success' ? categories.data.find((c) => c.slug === slug) : undefined;
  const meta = catalogCategory(slug);
  const items = catalogItems(slug);

  const brands = useMemo(() => {
    const scoped = group ? items.filter((i) => i.group === group) : items;
    return Array.from(new Set(scoped.flatMap((i) => i.brands))).sort((a, b) => a.localeCompare(b));
  }, [items, group]);

  const shown = items.filter((i) => (!group || i.group === group) && (!brand || i.brands.includes(brand)));

  return (
    <>
      <Header tone="dark" darkUntilId="category-hero" />
      <main id="main" className="pb-24">
        {/* banner */}
        <section id="category-hero" className="on-ink relative isolate overflow-hidden bg-ink text-sand">
          {meta?.photo && (
            <Image src={meta.photo} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-55" />
          )}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,12,10,0.88)_0%,rgba(11,12,10,0.55)_55%,rgba(11,12,10,0.25)_100%)]" aria-hidden="true" />
          <div className="container-x pb-12 pt-[calc(var(--header-h)+40px)] md:pb-16">
            <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-sand/60">
              <Link href="/" className="hover:text-sand">Home</Link> <span aria-hidden="true">/</span>{' '}
              <Link href="/#categories" className="hover:text-sand">Materials</Link>
            </nav>
            <h1 className="max-w-3xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-tightest">
              {category?.name ?? meta?.name ?? <span className="skeleton inline-block h-[0.9em] w-[6ch] align-middle opacity-30" />}
            </h1>
            {(meta?.tagline || category?.description) && (
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-sand/75">{meta?.tagline ?? category?.description}</p>
            )}
            {items.length > 0 && (
              <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.16em] text-lime">{items.length} material types</p>
            )}
          </div>
        </section>

        {/* catalogue */}
        {items.length > 0 && (
          <section className="container-x pt-12 md:pt-16" aria-labelledby="catalogue-title">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow text-stone">The catalogue</p>
                <h2 id="catalogue-title" className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[0.98] tracking-tightest">
                  What you can order
                </h2>
              </div>
              <p className="max-w-md text-[15px] text-stone">
                Specs, sizes and how each item is sold in India. Open one to compare offers from suppliers who deliver to you.
              </p>
            </div>

            {meta && meta.groups.length > 1 && (
              <div className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Type">
                <Chip active={group === null} onClick={() => { setGroup(null); setBrand(null); }}>All types</Chip>
                {meta.groups.map((g) => (
                  <Chip key={g} active={group === g} onClick={() => { setGroup(g); setBrand(null); }}>{g}</Chip>
                ))}
              </div>
            )}

            {brands.length > 0 && (
              <div className="mt-5">
                <p className="text-[13px] font-medium text-stone">Brands in the market</p>
                <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Brand">
                  <Chip active={brand === null} onClick={() => setBrand(null)}>Any brand</Chip>
                  {brands.map((b) => (
                    <Chip key={b} active={brand === b} onClick={() => setBrand(b)}>{b}</Chip>
                  ))}
                </div>
              </div>
            )}

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <li key={item.id}>
                  <MaterialCard item={item} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* live listings */}
        <section className="container-x pt-16 md:pt-20" aria-labelledby="listings-title">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-stone">Live from suppliers</p>
              <h2 id="listings-title" className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[0.98] tracking-tightest">
                {location ? <>Listings that deliver to <span className="font-mono">{location.pincode}</span></> : 'All listings'}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <Chip key={s.label} active={sort === s.value} onClick={() => setSort(s.value)}>{s.label}</Chip>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {products.status === 'loading' && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading products">
                {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[400px]" />)}
              </div>
            )}
            {products.status === 'error' && (
              <p role="alert" className="card px-6 py-10 text-center text-[15px] text-error">Couldn&apos;t load listings right now. Try refreshing the page.</p>
            )}
            {products.status === 'success' && products.data.products.length === 0 && (
              <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">storefront</span>
                <p className="font-display text-xl font-semibold">No listings here yet</p>
                <p className="max-w-md text-[15px] text-stone">
                  {location
                    ? `No supplier delivering to ${location.pincode} lists ${category?.name ?? meta?.name ?? 'this category'} yet.`
                    : 'Suppliers have not listed products in this category yet.'}
                </p>
              </div>
            )}
            {products.status === 'success' && products.data.products.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.data.products.map((p) => <ProductListCard key={p._id} product={p} />)}
              </div>
            )}
          </div>
        </section>

        <div className="container-x">
          <Link href="/#categories" className="btn-ghost mt-12">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
            All materials
          </Link>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
