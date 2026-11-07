'use client';

import { use, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useProductsForLocation, useSelectedLocation } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProductListCard } from '@/components/ProductListCard';
import { DeliveryCheck } from '@/components/catalog/DeliveryCheck';
import { QuantityHelper } from '@/components/catalog/QuantityHelper';
import { MaterialCard } from '@/components/catalog/MaterialCard';
import { useCategories } from '@/lib/categories';
import { catalogCategory, catalogItem, catalogItems, matchCatalogItem, offerQuery } from '@sthiva/web-core';

function OptionChips({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(value === o ? null : o)}
            className={`min-h-[40px] rounded-full border px-3.5 text-[14px] font-medium transition-colors ${
              value === o ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export default function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const found = catalogItem(id);

  const categories = useCategories();
  const location = useSelectedLocation();
  const [choices, setChoices] = useState<Record<string, string | null>>({});
  const [brand, setBrand] = useState<string | null>(null);

  const category = (categories.status === 'success' ? categories.data.find((c) => c.slug === found?.categorySlug) : undefined) ??
    (found ? catalogCategory(found.categorySlug) : undefined);
  const offers = useProductsForLocation({ category: found?.categorySlug, q: found ? offerQuery(found) : undefined, limit: 50 });

  // Listings are matched by text; a chosen brand must appear in the listing, chosen sizes rank first
  const shownOffers = useMemo(() => {
    if (offers.status !== 'success') return [];
    const text = (p: Record<string, unknown>) =>
      norm(`${p.name as string} ${JSON.stringify((p as { specifications?: unknown }).specifications ?? {})}`);
    const picked = Object.values(choices).filter(Boolean).map((v) => norm(v!));
    return offers.data.products
      // text search matches any word, so keep only listings that really are this material
      .filter((p) => found && matchCatalogItem(p.name, found.categorySlug)?.id === found.id)
      .filter((p) => !brand || text(p).includes(norm(brand)))
      .map((p) => ({ p, score: picked.filter((v) => text(p).includes(v)).length }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
  }, [offers, brand, choices, found]);

  if (!found) notFound();
  const item = found;

  const related = catalogItems(item.categorySlug).filter((i) => i.id !== item.id).slice(0, 3);
  const selection = [...Object.entries(choices).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), brand ? `Brand: ${brand}` : null].filter(Boolean);

  return (
    <>
      <Header />
      <main id="main" className="container-x pb-24 pt-[calc(var(--header-h)+32px)]">
        <nav aria-label="Breadcrumb" className="text-[13px] text-stone">
          <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span>{' '}
          <Link href={`/category/${item.categorySlug}`} className="hover:text-ink">{category?.name ?? 'Materials'}</Link>{' '}
          <span aria-hidden="true">/</span> <span className="text-ink">{item.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
          {/* details */}
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-sand-3 sm:h-36 sm:w-36">
                <Image src={item.image} alt="" fill sizes="144px" className="object-cover" priority />
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-sand-2/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-stone">Illustration</span>
              </div>
              <div>
                <p className="eyebrow text-stone">{item.group}</p>
                <h1 className="mt-2 font-display text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[0.95] tracking-tightest">{item.name}</h1>
                {item.standard && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cobalt-soft px-3 py-1 font-mono text-[12px] text-[#0F2A8A]">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified</span>
                    Made to {item.standard}
                  </p>
                )}
              </div>
            </header>

            <p className="max-w-2xl text-[18px] leading-relaxed">{item.summary}</p>

            <section aria-labelledby="uses-title">
              <h2 id="uses-title" className="font-display text-xl font-semibold tracking-tight">Where it is used</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {item.uses.map((u) => (
                  <li key={u} className="flex items-start gap-2.5 rounded-xl bg-sand-2 px-4 py-3 text-[15px]">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-tertiary" aria-hidden="true">check_circle</span>
                    {u}
                  </li>
                ))}
              </ul>
            </section>

            {(item.variants.length > 0 || item.brands.length > 0) && (
              <section className="card flex flex-col gap-6 p-5 sm:p-6" aria-labelledby="choose-title">
                <h2 id="choose-title" className="font-display text-xl font-semibold tracking-tight">Choose what you need</h2>
                {item.variants.map((v) => (
                  <OptionChips
                    key={v.label}
                    label={v.label}
                    options={v.options}
                    value={choices[v.label] ?? null}
                    onChange={(val) => setChoices((c) => ({ ...c, [v.label]: val }))}
                  />
                ))}
                {item.brands.length > 0 && (
                  <div>
                    <OptionChips label="Brand" options={item.brands} value={brand} onChange={setBrand} />
                    <p className="mt-2.5 text-[13px] text-stone">Brands available in the Indian market. What you can order depends on what suppliers near you list.</p>
                  </div>
                )}
              </section>
            )}

            <section aria-labelledby="sold-title">
              <h2 id="sold-title" className="font-display text-xl font-semibold tracking-tight">How it is sold</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {item.soldAs.map((s) => (
                  <li key={s.label} className="rounded-xl border border-sand-4 bg-sand-2 px-4 py-2.5 text-[15px]">
                    <span className="font-medium">{s.label}</span>
                    {s.note && <span className="text-stone"> · {s.note}</span>}
                  </li>
                ))}
              </ul>
            </section>

            {item.specs.length > 0 && (
              <section aria-labelledby="specs-title">
                <h2 id="specs-title" className="font-display text-xl font-semibold tracking-tight">Specifications</h2>
                <dl className="mt-3 divide-y divide-sand-4 overflow-hidden rounded-2xl border border-sand-4 bg-sand-2">
                  {item.standard && (
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 px-5 py-3.5 text-[15px]">
                      <dt className="text-stone">Standard</dt>
                      <dd className="font-medium">{item.standard}</dd>
                    </div>
                  )}
                  {item.specs.map((s) => (
                    <div key={s.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 px-5 py-3.5 text-[15px]">
                      <dt className="text-stone">{s.label}</dt>
                      <dd className="font-medium">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {item.note && (
              <p className="flex items-start gap-3 rounded-2xl bg-[#FFF4D6] px-5 py-4 text-[15px] text-[#5C4300]">
                <span className="material-symbols-outlined mt-0.5 text-[20px]" aria-hidden="true">info</span>
                {item.note}
              </p>
            )}
          </div>

          {/* order panel */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
            <DeliveryCheck title="Delivery to your site" />
            {selection.length > 0 && (
              <div className="rounded-2xl border border-sand-4 bg-sand-2 p-5">
                <p className="text-[14px] font-semibold">Your selection</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {selection.map((s) => (
                    <li key={s} className="rounded-full bg-lime px-3 py-1 text-[13px] font-medium text-ink">{s}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] text-stone">Matching offers are listed first below.</p>
              </div>
            )}
            {item.calculator && <QuantityHelper calculator={item.calculator} />}
            <a href="#offers" className="btn-ink w-full py-4">
              See offers{location ? ` for ${location.pincode}` : ''}
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_downward</span>
            </a>
          </aside>
        </div>

        {/* offers */}
        <section id="offers" className="scroll-mt-24 pt-16 md:pt-20" aria-labelledby="offers-title">
          <p className="eyebrow text-stone">Live from suppliers</p>
          <h2 id="offers-title" className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[0.98] tracking-tightest">
            Offers{location ? <> that deliver to <span className="font-mono">{location.pincode}</span></> : ''}
          </h2>
          <div className="mt-8">
            {offers.status === 'loading' && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading offers">
                {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[400px]" />)}
              </div>
            )}
            {offers.status === 'error' && (
              <p role="alert" className="card px-6 py-10 text-center text-[15px] text-error">Couldn&apos;t load offers right now. Try again in a moment.</p>
            )}
            {offers.status === 'success' && shownOffers.length === 0 && (
              <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">storefront</span>
                <p className="font-display text-xl font-semibold">
                  No {brand ? `${brand} ` : ''}{item.name.toLowerCase()} listed{location ? ` for ${location.pincode}` : ''} yet
                </p>
                <p className="max-w-md text-[15px] text-stone">
                  Suppliers add new listings regularly. Try another brand, check a different site PIN, or browse the rest of{' '}
                  <Link href={`/category/${item.categorySlug}`} className="font-medium text-cobalt hover:underline">{category?.name ?? 'this category'}</Link>.
                </p>
              </div>
            )}
            {shownOffers.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shownOffers.map((p) => <ProductListCard key={p._id} product={p} />)}
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <section className="pt-16 md:pt-20" aria-labelledby="related-title">
            <h2 id="related-title" className="font-display text-2xl font-semibold tracking-tight">More in {category?.name ?? 'this category'}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <li key={r.id}><MaterialCard item={r} /></li>)}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
