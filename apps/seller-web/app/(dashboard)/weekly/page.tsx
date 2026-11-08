'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@sthiva/web-core';
import { EmptyState, ErrorNote, PageHead, Pill, rupees, shortDate, unitLabel } from '../../../components/ui';
import { productErrorText } from '../../../lib/products';
import { confirmWeekly, fetchWeekly, type Weekly } from '../../../lib/weekly';

// Once a week: go through everything you list, set how much you can supply and at what price, confirm.
// Sthiva sends a reminder on Monday morning until it is done.

type Row = { qty: string; price: string };
const qtyOk = (v: string) => /^\d{1,8}$/.test(v);
const priceOk = (v: string) => /^\d{1,8}(\.\d{1,2})?$/.test(v) && Number(v) > 0;

export default function WeeklyPage() {
  const client = useApiClient();
  const [data, setData] = useState<Weekly | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = () => fetchWeekly(client).then((w) => {
    setData(w);
    setRows(Object.fromEntries(w.items.map((i) => [i._id, { qty: String(i.stockQuantity), price: String(i.basePrice) }])));
  }).catch(() => setLoadError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [client]);

  const invalid = data?.items.filter((i) => !qtyOk(rows[i._id]?.qty ?? '') || !priceOk(rows[i._id]?.price ?? '')) ?? [];

  async function submit() {
    if (!data) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await confirmWeekly(client, data.items.map((i) => ({ productId: i._id, stockQuantity: Number(rows[i._id].qty), basePrice: Number(rows[i._id].price) })));
      setDone(`Confirmed ${res.items} item${res.items === 1 ? '' : 's'} for this week.`);
      await load();
    } catch (err) {
      setError(productErrorText(err, 'Couldn’t confirm. Check the numbers and try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <ErrorNote>Couldn’t load your items. Check your connection and refresh.</ErrorNote>;
  if (!data) return <div className="skeleton h-96" role="status" aria-label="Loading weekly check" />;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHead eyebrow={`Week of ${new Date(data.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}`} title="Weekly check">
        <div className="flex flex-col gap-2 sm:items-end">
          {data.confirmedThisWeek
            ? <Pill tone="done">Confirmed {data.confirmedAt ? shortDate.format(new Date(data.confirmedAt)) : ''}</Pill>
            : <Pill tone="wait">Not confirmed this week</Pill>}
          <p className="max-w-sm text-[15px] text-stone sm:text-right">You can change stock and prices any time. Every Monday, confirm the whole list here before midnight.</p>
        </div>
      </PageHead>

      {data.hidden && (
        <div role="alert" className="rounded-2xl border-2 border-error bg-error-container p-4 text-[15px]">
          <p className="font-semibold text-error">Buyers can&apos;t see your items right now</p>
          <p className="mt-1">This week&apos;s Monday check was missed. Confirm below and your items are back on Sthiva straight away.</p>
        </div>
      )}
      {!data.hidden && !data.confirmedThisWeek && (
        <p className="rounded-2xl bg-[#FFF4D6] px-4 py-3 text-[15px] text-[#5C4300]">
          Confirm before midnight on Monday {new Date(data.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}. After that, buyers won&apos;t see your items until you do.
        </p>
      )}

      {data.items.length === 0 ? (
        <EmptyState icon="inventory_2" title="Nothing listed yet" body="Add the materials you supply first. They show up here every week." cta={{ href: '/products/new', label: 'Add a product' }} />
      ) : (
        <>
          <ul className="card divide-y divide-sand-4">
            {data.items.map((i) => {
              const r = rows[i._id] ?? { qty: '', price: '' };
              return (
                <li key={i._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${i._id}/edit`} className="font-semibold hover:underline">{i.name}</Link>
                    <p className="text-[13px] text-stone">Last week: {i.supply === 'ON_ORDER' ? 'on order' : `${i.stockQuantity.toLocaleString('en-IN')} ${unitLabel(i.unit, i.stockQuantity)}`} at {rupees.format(i.basePrice)}</p>
                  </div>
                  {i.supply === 'ON_ORDER' ? (
                    <span className="text-[13px] text-stone">On order: confirm the price only</span>
                  ) : (
                  <label className="flex items-center gap-2 text-[13px] text-stone">
                    Quantity
                    <input value={r.qty} inputMode="numeric" onChange={(e) => setRows({ ...rows, [i._id]: { ...r, qty: e.target.value.replace(/\D/g, '').slice(0, 8) } })}
                      className={`field w-28 font-mono ${qtyOk(r.qty) ? '' : 'border-error'}`} aria-label={`${i.name}: quantity you can supply this week`} />
                    <span>{unitLabel(i.unit, Number(r.qty) || 0)}</span>
                  </label>
                  )}
                  <label className="flex items-center gap-2 text-[13px] text-stone">
                    Price ₹
                    <input value={r.price} inputMode="decimal" onChange={(e) => setRows({ ...rows, [i._id]: { ...r, price: e.target.value.replace(/[^\d.]/g, '').slice(0, 11) } })}
                      className={`field w-28 font-mono ${priceOk(r.price) ? '' : 'border-error'}`} aria-label={`${i.name}: your price per ${i.unit.toLowerCase()}`} />
                  </label>
                </li>
              );
            })}
          </ul>
          {error && <ErrorNote>{error}</ErrorNote>}
          {done && <p role="status" className="text-[15px] font-medium">{done}</p>}
          <div className="sticky bottom-20 flex items-center justify-between gap-3 rounded-2xl bg-ink p-4 text-sand sm:bottom-4">
            <p className="text-[14px]">{invalid.length ? `${invalid.length} item${invalid.length === 1 ? ' needs' : 's need'} a valid quantity and price` : 'Quantity 0 shows an item as out of stock.'}</p>
            <button type="button" disabled={busy || invalid.length > 0} onClick={submit} className="btn-lime px-6">{busy ? 'Confirming' : 'Confirm this week'}</button>
          </div>
        </>
      )}
    </div>
  );
}
