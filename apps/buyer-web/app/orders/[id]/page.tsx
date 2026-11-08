'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ErrorNote, StatusPill, SummaryRow } from '@/components/account/AccountUI';
import { fetchOrder, cancelBuyerOrder, type BuyerOrder } from '@/lib/orders';
import { OrderTimeline } from '@/components/OrderTimeline';
import { DeliveryDateCard } from '@/components/account/DeliveryDateCard';
import { rupees, shortDate } from '@/lib/format';

function OrderDetail({ id }: { id: string }) {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'success'; order: BuyerOrder } | { status: 'error' }>({ status: 'loading' });
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function load() {
    fetchOrder(client, id)
      .then((order) => setState({ status: 'success', order }))
      .catch(() => setState({ status: 'error' }));
  }

  useEffect(load, [client, id]);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBuyerOrder(client, id);
      setConfirmingCancel(false);
      load();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel this order. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading order">
        <div className="skeleton h-40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }
  if (state.status === 'error') return <ErrorNote>Could not load this order. Check your connection and try again.</ErrorNote>;

  const { order } = state;
  const cancellable = order.status === 'PENDING' || order.status === 'CONFIRMED';

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-sand sm:p-8">
        <div className="blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-stone-light">Order · {shortDate.format(new Date(order.createdAt))}</p>
            <h1 className="mt-3 font-mono text-[clamp(1.5rem,4vw,2.25rem)] font-medium tracking-tight">{order.orderNumber}</h1>
            <div className="mt-4">
              <StatusPill status={order.status} />
            </div>
          </div>
          <div className="sm:text-right">
            <p className="eyebrow text-stone-light">Total</p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">{rupees.format(order.total)}</p>
            <p className="mt-1 text-[13px] text-stone-light">Cash on delivery</p>
          </div>
        </div>
      </section>

      <DeliveryDateCard order={order} />

      {order.deliveryOtp && (
        <section className="card flex flex-col gap-2 border-2 border-ink p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="eyebrow text-stone">Delivery code</p>
            <p className="mt-1 text-[15px] text-stone">Give this code to the driver only after you have checked the material.</p>
          </div>
          <p className="font-mono text-4xl font-bold tracking-[0.3em]" aria-label={`Delivery code ${order.deliveryOtp.split('').join(' ')}`}>{order.deliveryOtp}</p>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <OrderTimeline order={order} />
        </section>

        <div className="flex flex-col gap-4">
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">Items</h2>
            <ul className="mt-4 flex flex-col gap-3 border-b border-sand-4 pb-4">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-4 text-[15px]">
                  <span>
                    <span className="font-mono">{item.quantity}</span> <span className="text-stone">{item.unit.toLowerCase()} ×</span> {item.name}
                  </span>
                  <span className="flex-shrink-0 font-medium tabular-nums">{rupees.format(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <SummaryRow label="Subtotal" value={rupees.format(order.subtotal)} />
              <SummaryRow label="GST" value={rupees.format(order.gstAmount)} />
              <SummaryRow strong label="Total" value={rupees.format(order.total)} />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">Delivery</h2>
            <div className="mt-4 flex gap-3 text-[15px]">
              <span className="material-symbols-outlined text-stone" aria-hidden="true">location_on</span>
              <div>
                <p className="font-semibold">{order.deliveryAddress.label}</p>
                <p className="mt-0.5 text-stone">{order.deliveryAddress.fullAddress}</p>
                <p className="mt-2 font-mono text-[14px]">{order.deliveryAddress.contactPhone}</p>
              </div>
            </div>
          </section>

          {cancellable && (
            <section className="card p-5 sm:p-6">
              {!confirmingCancel ? (
                <button onClick={() => setConfirmingCancel(true)} className="btn-ghost w-full text-error hover:bg-error-container">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">cancel</span>
                  Cancel order
                </button>
              ) : (
                <div role="alertdialog" aria-labelledby="cancel-title" className="flex flex-col gap-3">
                  <p id="cancel-title" className="font-semibold">Cancel this order?</p>
                  <p className="text-[14px] text-stone">This cannot be undone. You can place a new order any time.</p>
                  {cancelError && <p role="alert" className="text-[14px] text-error">{cancelError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleCancel} disabled={cancelling} className="btn flex-1 bg-error text-white hover:bg-[#A51F24]">
                      {cancelling ? 'Cancelling' : 'Yes, cancel'}
                    </button>
                    <button onClick={() => setConfirmingCancel(false)} disabled={cancelling} className="btn-ghost flex-1">
                      Keep order
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <Link href="/orders" className="mt-2 inline-flex items-center gap-1 self-start text-[15px] font-medium text-stone hover:text-ink">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
        All orders
      </Link>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Header />
      <main id="main" className="container-x min-h-[70vh] max-w-5xl pb-32 pt-[calc(var(--header-h)+32px)]">
        <RequireAuth>
          <OrderDetail id={id} />
        </RequireAuth>
      </main>
      <BottomNav />
    </>
  );
}
