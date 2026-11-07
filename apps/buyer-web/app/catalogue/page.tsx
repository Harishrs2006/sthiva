'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { catalogCategory, useProductsForLocation, useSelectedLocation } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProductListCard } from '@/components/ProductListCard';

// What sellers have uploaded with their own photos: laminate shades, doors, tiles, fittings... Nearest
// sellers first when the buyer has set a PIN. Each item is a normal listing (in stock or on order).
const TYPES: { label: string; category?: string; q?: string }[] = [
  { label: 'Everything' },
  { label: 'Laminates', category: 'plywood-timber', q: 'laminate veneer' },
  { label: 'Doors', q: 'door' },
  { label: 'Windows and glass', category: 'plywood-timber', q: 'window glass mesh' },
  { label: 'Kitchens and wardrobes', category: 'plywood-timber', q: 'kitchen wardrobe' },
  { label: 'Ceilings and wall panels', category: 'plywood-timber', q: 'ceiling gypsum panel' },
  { label: 'Tiles and flooring', category: 'tiles-flooring' },
  { label: 'Sanitaryware and taps', category: 'plumbing', q: 'sanitary tap shower basin sink' },
  { label: 'Paints and textures', category: 'paints-chemicals' },
  { label: 'Hardware', category: 'hardware-fittings' },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${active ? 'bg-ink text-sand' : 'border border-sand-4 bg-sand-2 hover:border-ink'}`}
    >
      {children}
    </button>
  );
}

function Catalogue() {
  const params = useSearchParams();
  const location = useSelectedLocation();
  // A category page's "See catalogue" opens the first type of that category
  const fromCategory = params.get('category');
  const initial = TYPES.find((t) => t.category === fromCategory && !t.q) ?? TYPES.find((t) => t.category === fromCategory) ?? TYPES[0];
  const [type, setType] = useState(initial);
  const [page, setPage] = useState(1);
  const products = useProductsForLocation({ category: type.category, q: type.q, page, limit: 24, withPhotos: true });

  return (
    <>
      <section className="sticky top-[var(--header-h)] z-30 mt-8 border-y border-ink/[0.07] bg-sand/90 backdrop-blur-xl" aria-label="Type">
        <div className="container-x -mx-0 flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group">
          {TYPES.map((t) => (
            <Chip key={t.label} active={type.label === t.label} onClick={() => { setType(t); setPage(1); }}>{t.label}</Chip>
          ))}
        </div>
      </section>

      <section className="container-x pt-8" aria-live="polite">
        <p className="mb-6 text-[14px] text-stone">
          {location
            ? <>Sellers who deliver to PIN <span className="font-mono text-ink">{location.pincode}</span>, nearest first.</>
            : 'Set your site PIN on the home page to see sellers near you first.'}
        </p>
        {products.status === 'loading' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading catalogue">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[400px]" />)}
          </div>
        )}
        {products.status === 'error' && (
          <p role="alert" className="card px-6 py-10 text-center text-[15px] text-error">Could not load the catalogue right now. Try refreshing the page.</p>
        )}
        {products.status === 'success' && products.data.products.length === 0 && (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">photo_library</span>
            <p className="font-display text-xl font-semibold">Nothing uploaded here yet</p>
            <p className="max-w-md text-[15px] text-stone">
              Sellers are adding photos of what they stock. Meanwhile, browse {type.category ? catalogCategory(type.category)?.name ?? 'the materials' : 'the materials'} by category.
            </p>
            <Link href={type.category ? `/category/${type.category}` : '/#categories'} className="btn-ink mt-1">Browse materials</Link>
          </div>
        )}
        {products.status === 'success' && products.data.products.length > 0 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.data.products.map((p) => <ProductListCard key={p._id} product={p} />)}
            </div>
            {products.data.pagination.pages > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Pages">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost h-11 px-4">Previous</button>
                <span className="font-mono text-[13px] text-stone">Page {page} of {products.data.pagination.pages}</span>
                <button disabled={page >= products.data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost h-11 px-4">Next</button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}

export default function CataloguePage() {
  return (
    <>
      <Header />
      <main id="main" className="pb-24">
        <section className="container-x pt-[calc(var(--header-h)+40px)]">
          <nav aria-label="Breadcrumb" className="text-[13px] text-stone">
            <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span> Catalogue
          </nav>
          <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-tightest">Catalogue</h1>
            <p className="max-w-sm text-[15px] leading-relaxed text-stone">
              Laminates, doors, tiles, fittings and more, with photos from the sellers who have them. In stock items show the seller&apos;s delivery time; on-order items are confirmed within 24 hours.
            </p>
          </div>
        </section>
        <Suspense fallback={<div className="container-x mt-8 skeleton h-[400px]" />}>
          <Catalogue />
        </Suspense>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
