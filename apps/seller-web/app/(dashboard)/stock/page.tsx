'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@sthiva/web-core';
import { productErrorText, updateSupplierProduct, useSupplierProducts, type SupplierProduct } from '../../../lib/products';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pager, Pill, PRODUCT_STATUS, UNIT, unitLabel } from '../../../components/ui';

type Filter = { key: string; label: string; status?: string; lowStock?: boolean };
const FILTERS: Filter[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Running low', lowStock: true },
  { key: 'out', label: 'Out of stock', status: 'OUT_OF_STOCK' },
  { key: 'live', label: 'Live', status: 'ACTIVE' },
  { key: 'paused', label: 'Paused', status: 'INACTIVE' },
  { key: 'draft', label: 'Drafts', status: 'DRAFT' },
];

// Lorries come in by the hundred, not one at a time
const QUICK_ADD = [10, 50, 100];

const parse = (v: string) => (/^\d+$/.test(v) ? Number(v) : NaN);

// Stock is the quantity you can deliver right now, in the product's selling unit. The server
// marks a live product "Out of stock" at 0 and puts it back on sale when you restock.
function StockRow({ product, value, onValue, onSave, busy, error, saved }: {
  product: SupplierProduct;
  value: string;
  onValue: (v: string) => void;
  onSave: () => void;
  busy: boolean;
  error?: string;
  saved: boolean;
}) {
  const unit = UNIT[product.unit] ?? product.unit.toLowerCase();
  const n = parse(value);
  const valid = !Number.isNaN(n);
  const changed = valid && n !== product.stockQuantity;
  const minOrder = product.minOrderQuantity ?? 1;
  const alertAt = product.lowStockAlert ?? 0;
  const status = PRODUCT_STATUS[product.status] ?? { label: product.status, tone: 'muted' as const };
  const locked = product.status === 'DISCONTINUED';
  const low = product.stockQuantity > 0 && product.stockQuantity <= alertAt;
  const base = valid ? n : product.stockQuantity;

  return (
    <li className={`card p-4 ${product.stockQuantity === 0 && !locked ? 'border-error/40' : changed ? 'border-ink' : ''}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={status.tone}>{status.label}</Pill>
            {low && <Pill tone="wait">Running low</Pill>}
            {product.stockQuantity > 0 && product.stockQuantity < minOrder && <Pill tone="bad">Below minimum order ({minOrder})</Pill>}
            {product.specifications?.Brand && <span className="text-[13px] text-stone">{product.specifications.Brand}</span>}
          </div>
          <Link href={`/products/${product._id}/edit`} className="mt-1.5 block truncate text-[16px] font-semibold hover:underline">{product.name}</Link>
          <p className="mt-0.5 text-[14px] text-stone">
            In stock: <span className={`font-mono font-medium ${product.stockQuantity === 0 ? 'text-error' : 'text-ink'}`}>{product.stockQuantity.toLocaleString('en-IN')}</span> {unitLabel(product.unit, product.stockQuantity)}
            {alertAt > 0 && <> · warn below {alertAt.toLocaleString('en-IN')}</>}
            {changed && <span className="font-medium text-ink"> · new: {n.toLocaleString('en-IN')} ({n > product.stockQuantity ? '+' : ''}{(n - product.stockQuantity).toLocaleString('en-IN')})</span>}
          </p>
        </div>

        {locked ? (
          <p className="text-[14px] text-stone">Discontinued listings can&apos;t take stock.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" role="group" aria-label={`Add received stock to ${product.name}`}>
              {QUICK_ADD.map((q) => (
                <button key={q} type="button" disabled={busy} onClick={() => onValue(String(base + q))} className="h-12 rounded-full border border-sand-4 bg-sand px-3 font-mono text-[14px] hover:border-ink">
                  +{q}
                </button>
              ))}
            </div>
            <div className="flex h-12 items-center rounded-full border border-sand-4 bg-sand">
              <button type="button" onClick={() => onValue(String(Math.max(0, base - 1)))} disabled={busy || base === 0} className="grid h-12 w-11 place-items-center rounded-full text-ink disabled:opacity-40" aria-label={`One ${unit} less`}>
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <input
                value={value}
                onChange={(e) => onValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
                onKeyDown={(e) => { if (e.key === 'Enter' && changed) onSave(); }}
                inputMode="numeric"
                className="h-full w-20 bg-transparent text-center font-mono text-[16px] outline-none"
                aria-label={`Stock of ${product.name} in ${unit}`}
              />
              <button type="button" onClick={() => onValue(String(base + 1))} disabled={busy} className="grid h-12 w-11 place-items-center rounded-full text-ink" aria-label={`One ${unit} more`}>
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
            <button type="button" onClick={onSave} disabled={!changed || busy} className="btn-ink h-12 min-w-[88px] px-5">
              {busy ? 'Saving' : saved && !changed ? 'Saved' : 'Save'}
            </button>
            {changed && !busy && (
              <button type="button" onClick={() => onValue(String(product.stockQuantity))} className="text-[13px] font-medium text-stone underline-offset-2 hover:underline">Undo</button>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-[14px] text-error">{error}</p>}
    </li>
  );
}

export default function StockPage() {
  const client = useApiClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>(FILTERS[0]);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const list = useSupplierProducts(page, filter.status, { q, lowStock: filter.lowStock });
  const [rows, setRows] = useState<SupplierProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // a fresh page from the server replaces local rows; saved rows are patched in place below
  const fetched = list.status === 'success' ? list.products : null;
  useEffect(() => {
    if (fetched) {
      // On-order listings have no stock to count
      setRows(fetched.filter((p) => p.supply !== 'ON_ORDER'));
      setDrafts({});
      setErrors({});
    }
  }, [fetched]);

  const pending = rows.filter((p) => {
    const v = drafts[p._id];
    return v !== undefined && !Number.isNaN(parse(v)) && parse(v) !== p.stockQuantity;
  });

  // Unsaved stock changes ask before the page is left
  useEffect(() => {
    if (pending.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending.length]);

  async function saveOne(p: SupplierProduct) {
    const n = parse(drafts[p._id] ?? '');
    if (Number.isNaN(n) || n === p.stockQuantity) return;
    setBusy((b) => ({ ...b, [p._id]: true }));
    setErrors(({ [p._id]: _, ...rest }) => rest);
    try {
      const next = await updateSupplierProduct(client, p._id, { stockQuantity: n });
      setRows((r) => r.map((x) => (x._id === next._id ? { ...x, ...next } : x)));
      setDrafts(({ [p._id]: _, ...rest }) => rest);
      setSaved((s) => ({ ...s, [p._id]: true }));
      window.setTimeout(() => setSaved(({ [p._id]: _, ...rest }) => rest), 2000);
    } catch (err) {
      setErrors((e) => ({ ...e, [p._id]: productErrorText(err, 'Could not save stock.') }));
    } finally {
      setBusy(({ [p._id]: _, ...rest }) => rest);
    }
  }

  async function saveAll() {
    setSavingAll(true);
    for (const p of pending) await saveOne(p);
    setSavingAll(false);
  }

  const out = rows.filter((p) => p.stockQuantity === 0 && p.status !== 'DISCONTINUED').length;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHead eyebrow="Inventory" title="Stock">
        <p className="max-w-sm text-[15px] text-stone">Buyers can only order what you have. Use +10, +50 or +100 when a delivery comes in; 0 shows the listing as out of stock.</p>
      </PageHead>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 rounded-full border border-sand-4 bg-sand-2 px-4 focus-within:border-ink">
          <span className="material-symbols-outlined text-stone" aria-hidden="true">search</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value.slice(0, 60))} placeholder="Find a product" className="h-12 w-full bg-transparent text-[15px] outline-none" aria-label="Find a product" />
        </label>
        <ChipRow label="Filter stock">
          {FILTERS.map((f) => (
            <Chip key={f.key} active={filter.key === f.key} onClick={() => { setFilter(f); setPage(1); }}>{f.label}</Chip>
          ))}
        </ChipRow>
      </div>

      {list.status === 'loading' && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading stock">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
        </div>
      )}
      {list.status === 'error' && <ErrorNote>Couldn&apos;t load your stock. Check your connection and try again.</ErrorNote>}

      {list.status === 'success' && (
        <>
          {out > 0 && filter.key !== 'out' && (
            <p className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-[15px] text-on-error-container">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              {out} product{out === 1 ? ' is' : 's are'} out of stock on this page.
            </p>
          )}
          {rows.length === 0 ? (
            q || filter.key !== 'all' ? (
              <EmptyState icon="search_off" title="Nothing here" body={filter.lowStock ? 'Nothing is running low right now.' : q ? `No product matches “${q}”.` : 'No products with this status.'} />
            ) : (
              <EmptyState icon="stacks" title="No products yet" body="List a product first, then keep its stock up to date here." cta={{ href: '/products/new', label: 'List a product' }} />
            )
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((p) => (
                <StockRow
                  key={p._id}
                  product={p}
                  value={drafts[p._id] ?? String(p.stockQuantity)}
                  onValue={(v) => setDrafts((d) => ({ ...d, [p._id]: v }))}
                  onSave={() => saveOne(p)}
                  busy={!!busy[p._id] || savingAll}
                  error={errors[p._id]}
                  saved={!!saved[p._id]}
                />
              ))}
            </ul>
          )}
          <Pager page={list.meta.page} totalPages={list.meta.totalPages} hasPrev={list.meta.hasPrev} hasNext={list.meta.hasNext} onPage={(p) => {
            if (pending.length && !window.confirm('You have unsaved stock changes on this page. Leave them?')) return;
            setPage(p);
          }} />
        </>
      )}

      {pending.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-4 bg-ink text-sand max-sm:bottom-[84px] max-sm:mx-3 max-sm:rounded-2xl max-sm:border-0">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <p className="flex-1 text-[15px]">{pending.length} unsaved change{pending.length === 1 ? '' : 's'}</p>
            <button type="button" onClick={() => setDrafts({})} disabled={savingAll} className="h-11 rounded-full px-4 text-[14px] font-medium text-sand/70 hover:text-sand">Undo all</button>
            <button type="button" onClick={saveAll} disabled={savingAll} className="btn-lime h-11 px-5">{savingAll ? 'Saving' : 'Save all'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
