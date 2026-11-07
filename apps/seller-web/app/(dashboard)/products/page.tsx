'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApiClient } from '@sthiva/web-core';
import {
  useSupplierProducts, discontinueSupplierProduct, updateSupplierProduct, productErrorText, type SupplierProduct,
} from '../../../lib/products';
import { gstBreakdown } from '../../../lib/pricing';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pager, Pill, PRODUCT_STATUS, rupees, UNIT, unitLabel } from '../../../components/ui';

type Filter = { key: string; label: string; status?: string; lowStock?: boolean };
const FILTERS: Filter[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live', status: 'ACTIVE' },
  { key: 'low', label: 'Running low', lowStock: true },
  { key: 'out', label: 'Out of stock', status: 'OUT_OF_STOCK' },
  { key: 'paused', label: 'Paused', status: 'INACTIVE' },
  { key: 'draft', label: 'Drafts', status: 'DRAFT' },
  { key: 'gone', label: 'Discontinued', status: 'DISCONTINUED' },
];

const SAVED: Record<string, string> = {
  publish: 'Your listing is saved.',
  draft: 'Saved as a draft. Buyers can’t see it until you publish.',
  edit: 'Changes saved.',
};

function ProductRow({ product, onChange, onDiscontinue }: {
  product: SupplierProduct;
  onChange: (p: SupplierProduct) => void;
  onDiscontinue: (id: string) => Promise<void>;
}) {
  const client = useApiClient();
  const [mode, setMode] = useState<'view' | 'quick' | 'discontinue'>('view');
  const [price, setPrice] = useState(String(product.basePrice));
  const [stock, setStock] = useState(String(product.stockQuantity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const image = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
  const status = PRODUCT_STATUS[product.status] ?? { label: product.status, tone: 'muted' as const };
  const unit = UNIT[product.unit] ?? product.unit.toLowerCase();
  const brand = product.specifications?.Brand;
  const rate = product.gstRate ?? 18;
  const buyerPrice = gstBreakdown(product.basePrice, rate, product.isGstInclusive ?? true)?.total ?? product.basePrice;
  const low = product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockAlert ?? 0);
  const paused = product.status === 'INACTIVE';
  const canPause = product.status === 'ACTIVE' || product.status === 'OUT_OF_STOCK';

  async function run(fn: () => Promise<SupplierProduct>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
      setMode('view');
    } catch (err) {
      setError(productErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  const quickValid = Number(price) > 0 && /^\d+$/.test(stock);
  const saveQuick = () =>
    run(() => updateSupplierProduct(client, product._id, {
      ...(Number(price) !== product.basePrice ? { basePrice: Number(price) } : {}),
      ...(Number(stock) !== product.stockQuantity ? { stockQuantity: Number(stock) } : {}),
    }));
  // Resuming puts it back on sale, or out of stock if there is nothing left
  const togglePause = () =>
    run(() => updateSupplierProduct(client, product._id, { status: paused ? (product.stockQuantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK') : 'INACTIVE' }));

  return (
    <li className={`card overflow-hidden ${paused ? 'opacity-80' : ''}`}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-sand-3 sm:h-20 sm:w-20">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-stone" aria-hidden="true">image</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={status.tone}>{status.label}</Pill>
              {low && <Pill tone="wait">Running low</Pill>}
              {brand && <span className="text-[13px] text-stone">{brand}</span>}
            </div>
            <Link href={`/products/${product._id}/edit`} className="mt-1.5 block truncate text-[16px] font-semibold hover:underline">{product.name}</Link>
            <p className="mt-0.5 flex flex-wrap gap-x-3 text-[14px] text-stone">
              <span className="font-medium text-ink">{rupees.format(buyerPrice)} / {unit}</span>
              <span>incl. {rate}% GST</span>
              {product.supply === 'ON_ORDER'
                ? <span>On order</span>
                : <span className={product.stockQuantity > 0 ? '' : 'text-error'}>{product.stockQuantity.toLocaleString('en-IN')} {unitLabel(product.unit, product.stockQuantity)} in stock</span>}
              {(product.bulkPricing?.length ?? 0) > 0 && <span>{product.bulkPricing!.length} bulk price{product.bulkPricing!.length === 1 ? '' : 's'}</span>}
            </p>
          </div>
        </div>

        {product.status !== 'DISCONTINUED' && mode === 'view' && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={() => { setPrice(String(product.basePrice)); setStock(String(product.stockQuantity)); setMode('quick'); }} className="btn-ghost h-11 px-4">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">bolt</span>
              Price &amp; stock
            </button>
            <Link href={`/products/new?from=${product._id}`} className="btn-ghost h-11 px-4" title="Copy this listing for another size or grade">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">content_copy</span>
              <span className="max-sm:hidden">Another size</span>
            </Link>
            {canPause || paused ? (
              <button type="button" disabled={busy} onClick={togglePause} className="btn-ghost h-11 px-4" aria-label={paused ? `Resume ${product.name}` : `Pause ${product.name}`}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{paused ? 'play_arrow' : 'pause'}</span>
                {paused ? 'Resume' : 'Pause'}
              </button>
            ) : null}
            <Link href={`/products/${product._id}/edit`} className="grid h-11 w-11 place-items-center rounded-full text-stone transition-colors hover:bg-sand-3 hover:text-ink" aria-label={`Edit ${product.name}`}>
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </Link>
            <button type="button" onClick={() => setMode('discontinue')} className="grid h-11 w-11 place-items-center rounded-full text-stone transition-colors hover:bg-error-container hover:text-error" aria-label={`Discontinue ${product.name}`}>
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        )}
      </div>

      {mode === 'quick' && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (quickValid) saveQuick(); }}
          className="flex flex-wrap items-end gap-3 border-t border-sand-4 bg-sand px-4 py-3"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold">Your price per {unit} (₹)</span>
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="field h-11 w-32 font-mono" autoFocus />
          </label>
          {product.supply !== 'ON_ORDER' && (
            <label className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold">In stock ({unitLabel(product.unit, 2)})</span>
              <input value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="field h-11 w-32 font-mono" />
            </label>
          )}
          <p className="min-w-[160px] flex-1 pb-3 text-[13px] text-stone">
            {Number(price) > 0 && <>Buyers pay {rupees.format(gstBreakdown(Number(price), rate, product.isGstInclusive ?? true)?.total ?? 0)} incl. GST</>}
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !quickValid} className="btn-ink h-11 px-5">{busy ? 'Saving' : 'Save'}</button>
            <button type="button" disabled={busy} onClick={() => { setMode('view'); setError(null); }} className="btn-ghost h-11">Cancel</button>
          </div>
        </form>
      )}

      {mode === 'discontinue' && (
        <div role="alertdialog" aria-label="Discontinue this product?" className="flex flex-col gap-3 border-t border-sand-4 bg-sand px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-[15px]">Discontinue this listing for good? Buyers stop seeing it. To hide it for a while, use Pause instead.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => { setBusy(true); await onDiscontinue(product._id); setBusy(false); setMode('view'); }}
              className="btn bg-error text-white hover:bg-[#A51F24]"
            >
              Discontinue
            </button>
            <button type="button" disabled={busy} onClick={() => setMode('view')} className="btn-ghost">Keep</button>
          </div>
        </div>
      )}
      {error && <p className="border-t border-sand-4 px-4 py-3 text-[14px] text-error">{error}</p>}
    </li>
  );
}

function Products() {
  const client = useApiClient();
  const router = useRouter();
  const params = useSearchParams();
  const savedId = params.get('saved');
  const savedMode = params.get('mode') ?? 'publish';

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>(FILTERS[0]);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SupplierProduct[]>([]);
  const list = useSupplierProducts(page, filter.status, { q, lowStock: filter.lowStock });

  // Search as the seller types, without a request per key press
  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetched = list.status === 'success' ? list.products : null;
  useEffect(() => {
    if (fetched) setRows(fetched);
  }, [fetched]);

  async function handleDiscontinue(id: string) {
    setError(null);
    try {
      await discontinueSupplierProduct(client, id);
      list.reload();
    } catch (err) {
      setError(productErrorText(err, 'Could not discontinue the product.'));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Catalogue" title="Your products">
        <Link href="/products/new" className="btn-lime self-start sm:self-auto">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
          List a product
        </Link>
      </PageHead>

      {savedId && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl bg-ink p-4 text-sand sm:flex-row sm:items-center">
          <span className="material-symbols-outlined text-lime" aria-hidden="true">check_circle</span>
          <p className="flex-1 text-[15px]">{SAVED[savedMode] ?? SAVED.publish}</p>
          <div className="flex flex-wrap gap-2">
            {savedMode !== 'edit' && (
              <Link href={`/products/new?from=${savedId}`} className="btn-lime h-11 px-5">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">content_copy</span>
                List another size
              </Link>
            )}
            <button type="button" onClick={() => router.replace('/products')} className="grid h-11 w-11 place-items-center rounded-full text-sand/70 hover:bg-white/10 hover:text-sand" aria-label="Dismiss">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 rounded-full border border-sand-4 bg-sand-2 px-4 focus-within:border-ink">
          <span className="material-symbols-outlined text-stone" aria-hidden="true">search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, 60))}
            placeholder="Search your products, e.g. 12 mm or UltraTech"
            className="h-12 w-full bg-transparent text-[15px] outline-none"
            aria-label="Search your products"
          />
        </label>
        <ChipRow label="Filter products">
          {FILTERS.map((f) => (
            <Chip key={f.key} active={filter.key === f.key} onClick={() => { setFilter(f); setPage(1); }}>{f.label}</Chip>
          ))}
        </ChipRow>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {list.status === 'loading' && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading products">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
        </div>
      )}
      {list.status === 'error' && <ErrorNote>Couldn&apos;t load your products. Check your connection and try again.</ErrorNote>}

      {list.status === 'success' && (
        <>
          {rows.length === 0 ? (
            q || filter.key !== 'all' ? (
              <EmptyState icon="search_off" title="Nothing here" body={q ? `No product matches “${q}”.` : filter.lowStock ? 'Nothing is running low. Set the warning level on each product.' : 'No products with this status.'} />
            ) : (
              <EmptyState icon="inventory_2" title="List your first product" body="Pick the material, brand and size. Buyers near you can order as soon as it is live." cta={{ href: '/products/new', label: 'List a product' }} />
            )
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((p) => (
                <ProductRow
                  key={p._id}
                  product={p}
                  onDiscontinue={handleDiscontinue}
                  onChange={(next) => setRows((r) => r.map((x) => (x._id === next._id ? { ...x, ...next, categoryId: x.categoryId } : x)))}
                />
              ))}
            </ul>
          )}
          <Pager page={list.meta.page} totalPages={list.meta.totalPages} hasPrev={list.meta.hasPrev} hasNext={list.meta.hasNext} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64" />}>
      <Products />
    </Suspense>
  );
}
