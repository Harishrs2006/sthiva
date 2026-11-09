'use client';

import { Suspense, use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { catalogCategory, catalogItems, useProductsForLocation, useSelectedLocation, type CatalogItem } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProductListCard } from '@/components/ProductListCard';
import { MaterialCard } from '@/components/catalog/MaterialCard';
import { useCategories } from '@/lib/categories';

// The materials page, laid out like the big marketplaces:
//   title, then type chips across the top (the catalogue options), filters (brand, size) on the left on
//   computers and in a bottom sheet on phones, then material types and live supplier listings.
// Filters live in the address (?type=&brand=&opt=Label:Option) so a filtered page can be shared or reloaded.

// Only sort orders the API actually supports, so no option promises a feature that isn't real
const SORTS = [
  { value: undefined, label: 'Popular' },
  { value: 'price_asc' as const, label: 'Price: low to high' },
] as const;

const SIZE_LIMIT = 12;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-[14px] font-medium transition-colors ${
        active ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 text-ink hover:border-ink'
      }`}
    >
      {children}
    </button>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-[14px] hover:bg-ink/5">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-ink" />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Option filters (Size, Colour, Grade...) come from the variant groups of the items in view.
// In the address each choice is opt=Label:Option.
type OptionGroup = { label: string; options: string[] };
const MAX_OPTION_GROUPS = 4;

function optionGroups(items: CatalogItem[]): OptionGroup[] {
  const map = new Map<string, Set<string>>();
  for (const i of items) for (const v of i.variants) {
    const set = map.get(v.label) ?? new Set<string>();
    v.options.forEach((o) => set.add(o));
    map.set(v.label, set);
  }
  // groups shared by most items first (Size usually), then the rest
  const count = (label: string) => items.filter((i) => i.variants.some((v) => v.label === label)).length;
  return Array.from(map, ([label, set]) => ({ label, options: Array.from(set) }))
    .sort((a, b) => count(b.label) - count(a.label))
    .slice(0, MAX_OPTION_GROUPS);
}

function parseOpts(values: string[]) {
  const by = new Map<string, string[]>();
  for (const v of values) {
    const at = v.indexOf(':');
    if (at < 1) continue;
    const label = v.slice(0, at);
    by.set(label, [...(by.get(label) ?? []), v.slice(at + 1)]);
  }
  return by;
}

function matchesOpts(item: CatalogItem, opts: Map<string, string[]>) {
  for (const [label, chosen] of opts) {
    const group = item.variants.find((v) => v.label === label);
    if (!group || !chosen.some((c) => group.options.includes(c))) return false;
  }
  return true;
}

// Words a supplier listing for this item is likely to use
function itemTerms(item: CatalogItem) {
  return [item.name, item.search, ...(item.aliases ?? [])].map((t) => t.toLowerCase());
}

function OptionButtons({ group, chosen, onToggle }: { group: OptionGroup; chosen: string[]; onToggle: (o: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? group.options : group.options.slice(0, SIZE_LIMIT);
  return (
    <fieldset>
      <legend className="mb-2 px-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-stone">{group.label}</legend>
      <div className="flex flex-wrap gap-2 px-2">
        {shown.map((o) => {
          const on = chosen.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o)}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${on ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'}`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {group.options.length > SIZE_LIMIT && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 px-2 text-[13px] font-semibold text-cobalt hover:underline">
          {all ? 'Show fewer' : `Show all ${group.options.length}`}
        </button>
      )}
    </fieldset>
  );
}

function FilterPanel({
  brands,
  groups,
  selBrands,
  selOpts,
  onBrand,
  onOpt,
}: {
  brands: string[];
  groups: OptionGroup[];
  selBrands: string[];
  selOpts: Map<string, string[]>;
  onBrand: (b: string) => void;
  onOpt: (label: string, option: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {brands.length > 0 && (
        <fieldset>
          <legend className="mb-2 px-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-stone">Brand</legend>
          <div className="flex flex-col">
            {brands.map((b) => (
              <CheckRow key={b} checked={selBrands.includes(b)} onChange={() => onBrand(b)} label={b} />
            ))}
          </div>
        </fieldset>
      )}
      {groups.map((g) => (
        <OptionButtons key={g.label} group={g} chosen={selOpts.get(g.label) ?? []} onToggle={(o) => onOpt(g.label, o)} />
      ))}
      {brands.length === 0 && groups.length === 0 && <p className="px-2 text-[14px] text-stone">No brand or size filters for this type.</p>}
    </div>
  );
}

function MaterialsPage({ slug }: { slug: string }) {
  const categories = useCategories();
  const location = useSelectedLocation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const products = useProductsForLocation({ category: slug, sort });

  const category = categories.status === 'success' ? categories.data.find((c) => c.slug === slug) : undefined;
  const meta = catalogCategory(slug);
  const items = catalogItems(slug);
  const name = category?.name ?? meta?.name;

  const type = params.get('type');
  const selBrands = params.getAll('brand');
  const selSizes = params.getAll('opt');
  const selOpts = useMemo(() => parseOpts(selSizes), [selSizes.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  function setFilters(next: { type?: string | null; brands?: string[]; sizes?: string[] }) {
    const q = new URLSearchParams();
    const t = next.type !== undefined ? next.type : type;
    if (t) q.set('type', t);
    (next.brands ?? selBrands).forEach((b) => q.append('brand', b));
    (next.sizes ?? selSizes).forEach((s) => q.append('opt', s));
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const scoped = useMemo(() => (type ? items.filter((i) => i.group === type) : items), [items, type]);
  const brands = useMemo(() => Array.from(new Set(scoped.flatMap((i) => i.brands))).sort((a, b) => a.localeCompare(b)), [scoped]);
  const groups = useMemo(() => optionGroups(scoped), [scoped]);

  const shown = scoped.filter(
    (i) => (selBrands.length === 0 || selBrands.some((b) => i.brands.includes(b))) && matchesOpts(i, selOpts),
  );

  // Live listings follow the same choices: type by the words suppliers use, brand and size by name or specs
  const listings = useMemo(() => {
    if (products.status !== 'success') return [];
    const typeTerms = type ? scoped.flatMap(itemTerms) : [];
    return products.data.products.filter((p) => {
      const specs = (p as { specifications?: Record<string, string> }).specifications ?? {};
      const text = `${p.name} ${Object.values(specs).join(' ')}`.toLowerCase();
      if (typeTerms.length > 0 && !typeTerms.some((t) => text.includes(t))) return false;
      if (selBrands.length > 0 && !selBrands.some((b) => text.includes(b.toLowerCase()))) return false;
      for (const chosen of selOpts.values()) if (!chosen.some((o) => text.includes(o.toLowerCase()))) return false;
      return true;
    });
    // selBrands/selSizes are new arrays each render; their joined values are the real dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, type, scoped, selBrands.join('|'), selOpts]);

  const filterCount = selBrands.length + selSizes.length;

  // Close the phone sheet with Escape, and stop the page behind it from scrolling
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const panel = (
    <FilterPanel
      brands={brands}
      groups={groups}
      selBrands={selBrands}
      selOpts={selOpts}
      onBrand={(b) => setFilters({ brands: toggle(selBrands, b) })}
      onOpt={(label, o) => setFilters({ sizes: toggle(selSizes, `${label}:${o}`) })}
    />
  );

  return (
    <>
      <Header />
      <main id="main" className="pb-24 pt-[var(--header-h)]">
        {/* title */}
        <section className="border-b border-ink/10 bg-sand-2">
          <div className="container-x flex items-center gap-5 py-5 md:py-7">
            <div className="min-w-0 flex-1">
              <nav aria-label="Breadcrumb" className="text-[13px] text-stone">
                <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">›</span>{' '}
                <Link href="/#categories" className="hover:text-ink">Materials</Link> <span aria-hidden="true">›</span>{' '}
                <span className="text-ink">{name}</span>
              </nav>
              <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[40px]">
                {name ?? <span className="skeleton inline-block h-[0.9em] w-[8ch] align-middle" />}
              </h1>
              {meta?.tagline && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-stone">{meta.tagline}</p>}
            </div>
            {meta?.photo && (
              <div className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-xl sm:block md:h-28 md:w-44">
                <Image src={meta.photo} alt="" fill priority sizes="176px" className="object-cover" />
              </div>
            )}
          </div>
        </section>

        {/* catalogue options: the types in this category, always at the top */}
        {meta && meta.groups.length > 1 && (
          <div className="sticky top-[var(--header-h)] z-30 border-b border-ink/10 bg-sand/95 backdrop-blur-xl">
            <div className="container-x flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Type">
              <Chip active={!type} onClick={() => setFilters({ type: null, brands: [], sizes: [] })}>All</Chip>
              {meta.groups.map((g) => (
                <Chip key={g} active={type === g} onClick={() => setFilters({ type: g, brands: [], sizes: [] })}>{g}</Chip>
              ))}
            </div>
          </div>
        )}

        <div className="container-x pt-6 md:pt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
          {/* filters: left column on computers */}
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-[calc(var(--header-h)+80px)] max-h-[calc(100vh-var(--header-h)-100px)] overflow-y-auto pb-6">
              <div className="mb-4 flex items-center justify-between px-2">
                <h2 className="font-display text-[18px] font-semibold">Filters</h2>
                {filterCount > 0 && (
                  <button type="button" onClick={() => setFilters({ brands: [], sizes: [] })} className="text-[13px] font-semibold text-cobalt hover:underline">
                    Clear all
                  </button>
                )}
              </div>
              {panel}
            </div>
          </aside>

          <div className="min-w-0">
            {/* results bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px] text-stone">
                <span className="font-semibold text-ink">{shown.length}</span> material {shown.length === 1 ? 'type' : 'types'}
                {type && <> in <span className="font-semibold text-ink">{type}</span></>}
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-ink px-4 text-[14px] font-semibold lg:hidden"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">tune</span>
                Filters{filterCount > 0 && ` (${filterCount})`}
              </button>
            </div>

            {filterCount > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[...selBrands.map((v) => ({ v, kind: 'brand' as const })), ...selSizes.map((v) => ({ v, kind: 'size' as const }))].map(({ v, kind }) => (
                  <button
                    key={`${kind}-${v}`}
                    type="button"
                    onClick={() => setFilters(kind === 'brand' ? { brands: toggle(selBrands, v) } : { sizes: toggle(selSizes, v) })}
                    className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-3 py-1 text-[13px] font-medium hover:bg-ink/10"
                    aria-label={`Remove ${kind === 'size' ? v.slice(v.indexOf(':') + 1) : v}`}
                  >
                    {kind === 'size' ? v.slice(v.indexOf(':') + 1) : v}
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                  </button>
                ))}
              </div>
            )}

            {/* material types */}
            {shown.length > 0 ? (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((item) => (
                  <li key={item.id}>
                    <MaterialCard item={item} />
                  </li>
                ))}
              </ul>
            ) : (
              items.length > 0 && (
                <div className="card mt-5 flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <p className="font-display text-lg font-semibold">Nothing matches these filters</p>
                  <button type="button" onClick={() => setFilters({ brands: [], sizes: [] })} className="btn-ghost mt-2">Clear filters</button>
                </div>
              )
            )}

            {/* live listings */}
            <section className="mt-14" aria-labelledby="listings-title">
              <div className="flex flex-col gap-3 border-t border-ink/10 pt-8 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 id="listings-title" className="font-display text-[24px] font-bold tracking-[-0.02em] md:text-[28px]">
                    {location ? <>From suppliers delivering to <span className="font-mono">{location.pincode}</span></> : 'From suppliers'}
                  </h2>
                  {!location && (
                    <p className="mt-1 text-[14px] text-stone">
                      <Link href="/#site-pin" className="font-semibold text-cobalt hover:underline">Set your site PIN</Link> to see what reaches you, nearby sellers first.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SORTS.map((s) => (
                    <Chip key={s.label} active={sort === s.value} onClick={() => setSort(s.value)}>{s.label}</Chip>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                {products.status === 'loading' && (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading products">
                    {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[360px]" />)}
                  </div>
                )}
                {products.status === 'error' && (
                  <div role="alert" className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
                    <p className="text-[15px] text-stone">Listings are taking longer than usual to load.</p>
                    <button type="button" onClick={() => window.location.reload()} className="btn-ghost">Try again</button>
                  </div>
                )}
                {products.status === 'success' && listings.length === 0 && (
                  <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">storefront</span>
                    <p className="font-display text-xl font-semibold">No listings here yet</p>
                    <p className="max-w-md text-[15px] text-stone">
                      {products.data.products.length > 0
                        ? 'No supplier listing matches these choices yet. Clear a filter to see more.'
                        : location
                          ? `No supplier delivering to ${location.pincode} lists ${name ?? 'this category'} yet.`
                          : `Suppliers have not listed ${name ?? 'products in this category'} yet.`}
                    </p>
                  </div>
                )}
                {listings.length > 0 && (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {listings.map((p) => <ProductListCard key={p._id} product={p} />)}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* filters: bottom sheet on phones and tablets */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="filters-title">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close filters" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85svh] flex-col rounded-t-3xl bg-sand shadow-[0_-20px_60px_-20px_rgba(11,12,10,0.5)]">
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <h2 id="filters-title" className="font-display text-[20px] font-semibold">Filters</h2>
              <button type="button" onClick={() => setSheetOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label="Close">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">{panel}</div>
            <div className="flex gap-3 border-t border-ink/10 px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setFilters({ brands: [], sizes: [] })} className="btn-ghost flex-1" disabled={filterCount === 0}>
                Clear
              </button>
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-ink flex-[2]">
                Show {shown.length} {shown.length === 1 ? 'type' : 'types'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
      <BottomNav />
    </>
  );
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense>
      <MaterialsPage slug={slug} />
    </Suspense>
  );
}
