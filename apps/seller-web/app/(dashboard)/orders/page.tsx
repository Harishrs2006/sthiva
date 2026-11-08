'use client';

import { useState } from 'react';
import { deliveryTimePhrase, formatDeliveryDate, istDate, useApiClient } from '@sthiva/web-core';
import {
  acceptSupplierOrder, rejectSupplierOrder, reportDeliveryProblem, confirmCashCollected, setSupplierDeliveryDate, useSupplierOrders, updateSupplierOrderStatus,
  type SupplierOrder, type SupplierOrderAction,
} from '../../../lib/orders';
import { productErrorText } from '../../../lib/products';
import { Chip, ChipRow, EmptyState, ErrorNote, ORDER_STATUS, PageHead, Pager, Pill, rupees, shortDate, unitLabel } from '../../../components/ui';
import { DeliveryDatePicker } from '../../../components/DeliveryDatePicker';

// Tabs follow what the seller has to do next, not the raw status names
type Tab = { key: string; label: string; status?: string; cashPending?: boolean; empty: string };
const TABS: Tab[] = [
  { key: 'offers', label: 'New: accept or reject', status: 'PENDING', empty: 'No new orders waiting for your answer.' },
  { key: 'todo', label: 'To dispatch', status: 'CONFIRMED', empty: 'Nothing to dispatch. Orders you accept land here.' },
  { key: 'cash', label: 'Cash to confirm', cashPending: true, empty: 'No cash waiting. Orders you deliver yourself show here until you confirm the cash.' },
  { key: 'driver', label: 'With Sthiva driver', status: 'READY_FOR_PICKUP,ASSIGNED,PICKED_UP', empty: 'No orders waiting for or with a Sthiva driver.' },
  { key: 'road', label: 'On the way', status: 'IN_TRANSIT', empty: 'Nothing on the road right now.' },
  { key: 'done', label: 'Delivered', status: 'DELIVERED', empty: 'No delivered orders yet.' },
  { key: 'cancelled', label: 'Cancelled', status: 'CANCELLED', empty: 'No cancelled orders.' },
  { key: 'all', label: 'All', empty: 'When buyers order from your listings, the orders appear here.' },
];

const REJECT_REASONS = ['Out of stock', 'Can’t deliver to this area', 'Can’t deliver in time', 'Price changed'];
const CANCEL_REASONS = ['Out of stock', 'Can’t deliver to this address', 'Buyer asked to cancel', 'Vehicle not available'];

const waNumber = (n: string) => {
  const d = n.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};

type Confirming = null | 'cancel' | 'delivered' | 'cash' | 'reject' | 'problem' | 'accept' | 'date';

// Orders whose delivery date the supplier can still set or change
const DATED_STATUSES = ['CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'];

function timeLeft(iso?: string) {
  if (!iso) return null;
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return m <= 0 ? 'Time is up' : m < 60 ? `${m} min left to answer` : `${Math.floor(m / 60)} h ${m % 60} min left to answer`;
}

function OrderCard({ order, onDone }: { order: SupplierOrder; onDone: () => void }) {
  const client = useApiClient();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Suggested date: the start of this supplier's usual delivery window
  const [date, setDate] = useState(order.deliveryDate ?? istDate(order.expectedDelivery?.minDays ?? 0));
  const dated = DATED_STATUSES.includes(order.status);
  const status = ORDER_STATUS[order.status];
  const buyer = order.buyerId && typeof order.buyerId === 'object' ? order.buyerId : null;
  const driver = order.driverId && typeof order.driverId === 'object' ? order.driverId : null;
  const a = order.deliveryAddress;
  const own = order.deliveryMode === 'SUPPLIER';
  const cod = (order.paymentMethod ?? 'COD') === 'COD';
  const cashDue = cod && order.status === 'DELIVERED' && own && order.paymentStatus === 'PENDING';
  // The supplier may still take over or cancel until a Sthiva driver has accepted it
  const canDispatch = order.status === 'CONFIRMED';
  const canTakeOver = order.status === 'READY_FOR_PICKUP' && !driver;
  const canCancel = order.status === 'CONFIRMED' || canTakeOver;
  const isOffer = order.status === 'PENDING' && order.allocation?.state === 'OFFERED';
  const left = isOffer ? timeLeft(order.allocation?.expiresAt) : null;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setConfirming(null);
      onDone();
    } catch (err) {
      setError(productErrorText(err, 'Could not update the order. Try again.'));
    } finally {
      setBusy(false);
    }
  }
  const move = (to: SupplierOrderAction, why?: string) => run(() => updateSupplierOrderStatus(client, order._id, to, why));

  return (
    <article className={`card overflow-hidden ${isOffer || order.status === 'CONFIRMED' || cashDue ? 'ring-2 ring-lime' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[15px] font-medium">{order.orderNumber}</span>
          <Pill tone={status.tone} pulse={isOffer || order.status === 'CONFIRMED'}>{order.status === 'CONFIRMED' ? 'New, to dispatch' : status.label}</Pill>
          {cod && order.paymentStatus === 'CAPTURED' && <Pill tone="done">Cash collected</Pill>}
          {cashDue && <Pill tone="wait">Confirm cash</Pill>}
        </div>
        <span className="font-mono text-[12px] text-stone">{shortDate.format(new Date(order.createdAt))}</span>
      </div>

      <div className="grid gap-5 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="eyebrow text-stone">Items</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[15px]">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span><span className="font-mono font-semibold">{item.quantity.toLocaleString('en-IN')}</span> <span className="text-stone">{unitLabel(item.unit, item.quantity)} ·</span> {item.name}</span>
                <span className="shrink-0 tabular-nums">{rupees.format(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-sand-4 pt-3">
            <span className="text-[14px] text-stone">Total incl. GST{cod ? ' · cash on delivery' : ''}</span>
            <span className="font-display text-xl font-bold tabular-nums">{rupees.format(order.total)}</span>
          </div>
        </div>

        {order.earnings && (
          <div className="rounded-xl border border-sand-4 p-4 text-[15px]">
            <p className="eyebrow text-stone">What you earn</p>
            {order.earnings.expectedPayout !== null ? (
              <p className="mt-2"><span className="font-display text-lg font-bold tabular-nums">{rupees.format(order.earnings.expectedPayout)}</span> <span className="text-stone">after Sthiva&apos;s commission of {rupees.format(order.deliveryMode === 'SUPPLIER' ? order.earnings.commissionIfYouDeliver : order.earnings.commissionIfSthivaDelivers)}</span></p>
            ) : (
              <div className="mt-2 flex flex-col gap-1">
                <p><span className="font-semibold tabular-nums">{rupees.format(order.earnings.payoutIfSthivaDelivers)}</span> <span className="text-stone">if a Sthiva driver delivers (commission {rupees.format(order.earnings.commissionIfSthivaDelivers)})</span></p>
                {order.earnings.payoutIfYouDeliver !== order.earnings.payoutIfSthivaDelivers && (
                  <p><span className="font-semibold tabular-nums">{rupees.format(order.earnings.payoutIfYouDeliver)}</span> <span className="text-stone">if you deliver yourself (commission {rupees.format(order.earnings.commissionIfYouDeliver)})</span></p>
                )}
              </div>
            )}
            <p className="mt-1 text-[13px] text-stone">The buyer pays {rupees.format(order.earnings.orderValue)} in total.</p>
          </div>
        )}

        <div className="rounded-xl bg-sand-3/60 p-4 text-[15px]">
          <p className="eyebrow text-stone">Deliver to</p>
          <p className="mt-2 font-semibold">{buyer?.name ?? 'Buyer'} · {a.label}</p>
          <p className="mt-0.5 text-stone">{a.fullAddress}</p>
          {(a.pincode || a.district) && (
            <p className="mt-0.5 text-[14px] text-stone">{[a.district, a.state].filter(Boolean).join(', ')}{a.pincode && <> · PIN <span className="font-mono text-ink">{a.pincode}</span></>}</p>
          )}
          {typeof order.distanceKm === 'number' && (
            <p className="mt-0.5 text-[14px] text-stone">About <span className="font-mono text-ink">{order.distanceKm}</span> km from your pickup point (straight line)</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${a.contactPhone}`} className="btn-ghost h-10 px-3 text-[14px]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
              {a.contactPhone}
            </a>
            <a href={`https://wa.me/${waNumber(a.contactPhone)}?text=${encodeURIComponent(`Sthiva order ${order.orderNumber}: `)}`} target="_blank" rel="noreferrer" className="btn-ghost h-10 px-3 text-[14px]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>
              WhatsApp
            </a>
          </div>
          {order.deliveryMode && (
            <p className="mt-3 text-[13px] text-stone">
              {own ? 'You are delivering this order with your own vehicle.' : driver ? `Sthiva driver: ${driver.name ?? 'assigned'}${driver.phone ? ` (${driver.phone})` : ''}.` : 'Waiting for a Sthiva driver to accept it.'}
            </p>
          )}
        </div>
      </div>

      {(isOffer || dated || canDispatch || canTakeOver || (order.status === 'IN_TRANSIT' && own) || cashDue || error) && (
        <div className="flex flex-col gap-3 border-t border-sand-4 bg-sand px-5 py-4">
          {error && <p role="alert" className="text-[14px] text-error">{error}</p>}

          {confirming === null && isOffer && (
            <div className="flex flex-col gap-2">
              <p className="text-[14px] text-stone">
                Sthiva offered you this order. Accept only if you can supply every item at this quantity.{left ? ` ${left}.` : ''}
              </p>
              {order.onOrder && (
                <p className="rounded-lg bg-[#FFF4D6] px-3 py-2 text-[14px] text-[#5C4300]">
                  On order: the buyer was told you will confirm the delivery date within 24 hours. Pick the date when you accept.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => setConfirming('accept')} className="btn-lime">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">check</span>
                  Accept order
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirming('reject')} className="btn-ghost">Reject</button>
              </div>
            </div>
          )}

          {(confirming === 'accept' || confirming === 'date') && (
            <div role="dialog" aria-label={confirming === 'accept' ? 'Accept and confirm the delivery date' : 'Change the delivery date'} className="flex flex-col gap-3">
              <div>
                <p className="text-[15px] font-semibold">
                  {confirming === 'accept' ? `When will you deliver ${order.orderNumber}?` : 'New delivery date'}
                </p>
                <p className="mt-0.5 text-[14px] text-stone">
                  {order.expectedDelivery
                    ? `Your listing says ${deliveryTimePhrase(order.expectedDelivery.minDays, order.expectedDelivery.maxDays)}. `
                    : ''}
                  The buyer sees this date{confirming === 'date' ? ' and is told it changed' : ''}.
                </p>
              </div>
              <DeliveryDatePicker value={date} onChange={setDate} expected={order.expectedDelivery} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !date}
                  onClick={() => run(() => (confirming === 'accept' ? acceptSupplierOrder(client, order._id, date) : setSupplierDeliveryDate(client, order._id, date)))}
                  className="btn-lime"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">event_available</span>
                  {confirming === 'accept' ? `Accept, deliver ${formatDeliveryDate(date)}` : `Save ${formatDeliveryDate(date)}`}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="btn-ghost">Back</button>
              </div>
            </div>
          )}

          {confirming === null && dated && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand-2 px-4 py-3">
              <p className="flex items-center gap-2 text-[15px]">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{order.deliveryDate ? 'event_available' : 'event'}</span>
                {order.deliveryDate
                  ? <>Delivery on <span className="font-semibold">{formatDeliveryDate(order.deliveryDate)}</span></>
                  : <span className="text-stone">No delivery date confirmed yet</span>}
              </p>
              <button type="button" disabled={busy} onClick={() => setConfirming('date')} className="btn-ghost h-10 px-3 text-[14px]">
                {order.deliveryDate ? 'Change date' : 'Set date'}
              </button>
            </div>
          )}

          {confirming === 'reject' && (
            <div role="alertdialog" aria-label="Reject this order?" className="flex flex-col gap-3">
              <p className="text-[15px]"><span className="font-semibold">Reject {order.orderNumber}?</span> Sthiva offers it to another supplier. The buyer isn&apos;t told your reason.</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
                {REJECT_REASONS.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={`min-h-[40px] rounded-full border px-3.5 text-[14px] font-medium ${reason === r ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy || !reason} onClick={() => run(() => rejectSupplierOrder(client, order._id, reason))} className="btn bg-error text-white hover:bg-[#A51F24] disabled:opacity-50">Yes, reject</button>
                <button type="button" disabled={busy} onClick={() => { setConfirming(null); setReason(''); }} className="btn-ghost">Back</button>
              </div>
            </div>
          )}

          {confirming === null && !isOffer && (
            <div className="flex flex-wrap gap-2">
              {canDispatch && (
                <>
                  <button type="button" disabled={busy} onClick={() => move('READY_FOR_PICKUP')} className="btn-ink">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">local_shipping</span>
                    Ready for Sthiva pickup
                  </button>
                  <button type="button" disabled={busy} onClick={() => move('IN_TRANSIT')} className="btn-ghost">I&apos;ll deliver it myself</button>
                </>
              )}
              {canTakeOver && (
                <button type="button" disabled={busy} onClick={() => move('IN_TRANSIT')} className="btn-ghost">No driver yet? Deliver it myself</button>
              )}
              {order.status === 'IN_TRANSIT' && own && (
                <>
                  <button type="button" disabled={busy} onClick={() => setConfirming('delivered')} className="btn-lime">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">task_alt</span>
                    Mark as delivered
                  </button>
                  {!order.deliveryIssue || order.deliveryIssue.resolvedAt ? (
                    <button type="button" disabled={busy} onClick={() => setConfirming('problem')} className="btn-ghost">Report a problem</button>
                  ) : (
                    <span className="self-center text-[14px] text-stone">Problem reported. Sthiva will call you.</span>
                  )}
                </>
              )}
              {cashDue && (
                <button type="button" disabled={busy} onClick={() => setConfirming('cash')} className="btn-lime">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">payments</span>
                  I received {rupees.format(order.total)} in cash
                </button>
              )}
              {canCancel && (
                <button type="button" disabled={busy} onClick={() => setConfirming('cancel')} className="btn-ghost text-error hover:bg-error-container sm:ml-auto">Cancel order</button>
              )}
            </div>
          )}

          {confirming === 'delivered' && (
            <div role="alertdialog" aria-label="Mark as delivered?" className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-[15px]"><span className="font-semibold">Everything handed over at the site?</span> Ask the buyer for their 4-digit delivery code (it is on their order page).</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                placeholder="Code"
                aria-label="Buyer's 4-digit delivery code"
                className="field w-28 text-center font-mono tracking-[0.3em]"
              />
              <div className="flex gap-2">
                <button type="button" disabled={busy || code.length !== 4} onClick={() => run(() => updateSupplierOrderStatus(client, order._id, 'DELIVERED', undefined, code))} className="btn-lime">{busy ? 'Saving' : 'Yes, delivered'}</button>
                <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="btn-ghost">Not yet</button>
              </div>
            </div>
          )}

          {confirming === 'problem' && (
            <div role="alertdialog" aria-label="Report a delivery problem" className="flex flex-col gap-3">
              <p className="text-[15px]"><span className="font-semibold">What went wrong?</span> Sthiva&apos;s team calls you and the buyer to sort it out.</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Problem">
                {['Buyer not at the site', 'Buyer not answering the phone', 'Site closed or no access', 'Buyer refused the goods'].map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={`min-h-[40px] rounded-full border px-3.5 text-[14px] font-medium ${reason === r ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy || !reason} onClick={() => run(() => reportDeliveryProblem(client, order._id, reason))} className="btn-ink">Report it</button>
                <button type="button" disabled={busy} onClick={() => { setConfirming(null); setReason(''); }} className="btn-ghost">Back</button>
              </div>
            </div>
          )}

          {confirming === 'cash' && (
            <div role="alertdialog" aria-label="Confirm cash received?" className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-[15px]">
                <span className="font-semibold">Received the full {rupees.format(order.total)}?</span> If the buyer paid less, don&apos;t confirm here: contact Sthiva support to record it.
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => run(() => confirmCashCollected(client, order._id, order.total))} className="btn-lime">{busy ? 'Saving' : 'Yes, full amount'}</button>
                <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="btn-ghost">Back</button>
              </div>
            </div>
          )}

          {confirming === 'cancel' && (
            <div role="alertdialog" aria-label="Cancel this order?" className="flex flex-col gap-3">
              <p className="text-[15px]"><span className="font-semibold">Cancel {order.orderNumber}?</span> The buyer is told why, and the stock goes back to your listing.</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
                {CANCEL_REASONS.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={`min-h-[40px] rounded-full border px-3.5 text-[14px] font-medium ${reason === r ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy || !reason} onClick={() => move('CANCELLED', reason)} className="btn bg-error text-white hover:bg-[#A51F24] disabled:opacity-50">Yes, cancel</button>
                <button type="button" disabled={busy} onClick={() => { setConfirming(null); setReason(''); }} className="btn-ghost">Keep it</button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const list = useSupplierOrders(page, tab.status, tab.cashPending);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Orders" title="Incoming orders">
        <p className="max-w-sm text-[15px] text-stone">Dispatch new orders quickly: buyers see every step. Hand it to a Sthiva driver or deliver it yourself.</p>
      </PageHead>

      <ChipRow label="Filter orders">
        {TABS.map((t) => (
          <Chip key={t.key} active={tab.key === t.key} onClick={() => { setTab(t); setPage(1); }}>{t.label}</Chip>
        ))}
      </ChipRow>

      {list.status === 'loading' && (
        <div className="flex flex-col gap-4" role="status" aria-label="Loading orders">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-48" />)}
        </div>
      )}
      {list.status === 'error' && <ErrorNote>Couldn&apos;t load your orders. Check your connection and try again.</ErrorNote>}

      {list.status === 'success' && (
        <>
          {list.orders.length === 0 ? (
            <EmptyState icon="receipt_long" title="Nothing here right now" body={tab.empty} />
          ) : (
            <div className="flex flex-col gap-4">
              {list.orders.map((o) => <OrderCard key={o._id} order={o} onDone={list.reload} />)}
            </div>
          )}
          <Pager page={list.meta.page} totalPages={list.meta.totalPages} hasPrev={list.meta.hasPrev} hasNext={list.meta.hasNext} onPage={setPage} />
        </>
      )}
    </div>
  );
}
