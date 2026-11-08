'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApiClient } from '@sthiva/web-core';
import { ErrorNote, ORDER_STATUS, Pill, UNIT, rupees, shortDate } from '../../../../components/ui';
import { errorText, opsApi, populated, useLoad, type OrderDetail, type SupplierOption } from '../../../../lib/ops';

const PAYMENT: Record<string, string> = {
  PENDING: 'Not paid yet', PARTIAL: 'Part paid', CAPTURED: 'Paid', RELEASED: 'Released', REFUNDED: 'Refunded',
};
const ROLE: Record<string, string> = {
  BUYER: 'Buyer', SUPPLIER: 'Supplier', DELIVERY_PARTNER: 'Driver', OPERATOR: 'Ops', ADMIN: 'Admin', SYSTEM: 'System',
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// One ops action: a reason box and a button, with its own busy and error state
function Action({ label, hint, placeholder, danger, minLength = 3, extra, onRun }: {
  label: string;
  hint: string;
  placeholder: string;
  danger?: boolean;
  minLength?: number;
  extra?: React.ReactNode;
  onRun: (text: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={danger ? 'btn bg-error-container text-on-error-container hover:bg-error hover:text-white' : 'btn-ghost'}>
        {label}
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-sand-4 bg-sand p-4">
      <p className="text-[15px] font-semibold">{label}</p>
      <p className="-mt-2 text-[14px] text-stone">{hint}</p>
      {extra}
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder={placeholder} className="field resize-none" aria-label={label} />
      {error && <p className="text-[14px] text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || text.trim().length < minLength}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onRun(text.trim());
              setOpen(false);
              setText('');
            } catch (err) {
              setError(errorText(err));
            } finally {
              setBusy(false);
            }
          }}
          className={danger ? 'btn bg-error text-white hover:bg-[#A51F24]' : 'btn-ink'}
        >
          {busy ? 'Saving' : label}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className="btn-ghost">Back</button>
      </div>
    </div>
  );
}

function Actions({ order, reload }: { order: OrderDetail; reload: () => void }) {
  const client = useApiClient();
  const drivers = useLoad(opsApi.drivers, []);
  const [driver, setDriver] = useState('');
  const [restock, setRestock] = useState<'yes' | 'no' | ''>('');
  const [amount, setAmount] = useState(String(order.total));
  const goodsOut = order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT';
  const open = order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
  const canAssign = order.status === 'READY_FOR_PICKUP' && !populated(order.driverId) && order.deliveryMode !== 'SUPPLIER';
  const codOpen = order.paymentMethod === 'COD' && order.status === 'DELIVERED' && (order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL');
  const run = (fn: () => Promise<unknown>) => async () => { await fn(); reload(); };

  const activeDrivers = drivers.state.status === 'success'
    ? drivers.state.data.filter((d) => populated(d.userId)?.isActive !== false)
    : [];

  return (
    <Panel title="Fix this order">
      <div className="flex flex-wrap gap-3">
        {canAssign && (
          <Action
            label="Assign a driver"
            hint="The driver gets a notification and the buyer is told a driver is on the way."
            placeholder="Note (optional), e.g. called Ravi, he is 10 min away"
            minLength={0}
            extra={
              <select value={driver} onChange={(e) => setDriver(e.target.value)} className="field" aria-label="Driver">
                <option value="">Choose a driver</option>
                {activeDrivers.map((d) => {
                  const u = populated(d.userId);
                  return u ? (
                    <option key={d._id} value={u._id}>
                      {u.name ?? 'Driver'} · {d.vehicleType.replace('_', ' ').toLowerCase()} {d.vehicleNumber} · {d.isAvailable ? 'available' : 'off duty'} · {d.activeOrders} on hand
                    </option>
                  ) : null;
                })}
              </select>
            }
            onRun={async (note) => {
              if (!driver) throw new Error('Choose a driver first.');
              await run(() => opsApi.assign(client, order._id, driver, note || undefined))();
            }}
          />
        )}
        {order.status === 'ASSIGNED' && (
          <Action
            label="Remove the driver"
            hint="For a no-show. The order goes back to Ready for pickup so another driver can take it."
            placeholder="Reason, e.g. driver not reachable for 45 min"
            onRun={(reason) => run(() => opsApi.unassign(client, order._id, reason))()}
          />
        )}
        {(order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT') && (
          <Action
            label="Mark delivered without the code"
            hint="Only after confirming with the buyer that everything arrived (for example their phone is off or the code is lost)."
            placeholder="How you confirmed, e.g. buyer confirmed on a call at 4:10 pm"
            onRun={(reason) => run(() => opsApi.markDelivered(client, order._id, reason))()}
          />
        )}
        {order.deliveryIssue && !order.deliveryIssue.resolvedAt && (
          <Action
            label="Problem resolved"
            hint="Record what was agreed. To give up on the order, cancel it instead."
            placeholder="What was agreed, e.g. buyer back on site, driver returns at 5 pm"
            onRun={(reason) => run(() => opsApi.resolveProblem(client, order._id, reason))()}
          />
        )}
        {codOpen && (
          <Action
            label="Record cash received"
            hint={`Enter what was actually handed over. The order total is ${rupees.format(order.total)}; less than that marks it part paid.`}
            placeholder="Who collected it and how, e.g. driver deposited at office"
            extra={
              <label className="flex items-center gap-3">
                <span className="text-[14px] font-semibold">Amount ₹</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="field w-40 font-mono" aria-label="Amount received" />
              </label>
            }
            onRun={async (note) => {
              const n = Number(amount);
              if (!(n > 0)) throw new Error('Enter the amount received.');
              await run(() => opsApi.recordCod(client, order._id, n, note))();
            }}
          />
        )}
        {open && (
          <Action
            label="Cancel order"
            danger
            hint="The buyer is told Sthiva support cancelled it. This cannot be undone."
            placeholder="Reason, kept on the order"
            extra={goodsOut && (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-[14px] font-semibold">The goods have left the supplier. Did they come back?</legend>
                <label className="flex items-center gap-2 text-[15px]"><input type="radio" name="restock" checked={restock === 'yes'} onChange={() => setRestock('yes')} /> Yes, put the stock back</label>
                <label className="flex items-center gap-2 text-[15px]"><input type="radio" name="restock" checked={restock === 'no'} onChange={() => setRestock('no')} /> No, the goods are gone</label>
              </fieldset>
            )}
            onRun={async (reason) => {
              if (goodsOut && !restock) throw new Error('Say whether the goods came back.');
              await run(() => opsApi.cancel(client, order._id, { reason, ...(goodsOut ? { restock: restock === 'yes' } : {}) }))();
            }}
          />
        )}
        <Action
          label="Add a note"
          hint="Only the ops team sees notes."
          placeholder="What happened, who you spoke to"
          minLength={1}
          onRun={(note) => run(() => opsApi.addNote(client, order._id, note))()}
        />
      </div>
    </Panel>
  );
}

const TRIED: Record<string, string> = { REJECTED: 'said no', EXPIRED: 'did not answer', WITHDRAWN: 'moved by Sthiva', ACCEPTED: 'accepted', OFFERED: 'has the offer' };

// While an order waits for a supplier: who has it, and who else could take it
function SupplierChoice({ order, reload }: { order: OrderDetail; reload: () => void }) {
  const client = useApiClient();
  const options = useLoad((c) => opsApi.supplierOptions(c, order._id), [order._id, order.updatedAt]);
  const [picked, setPicked] = useState<SupplierOption | null>(null);
  const waiting = order.allocation?.state === 'NEEDS_OPS';
  const expires = order.allocation?.expiresAt;

  return (
    <Panel title={waiting ? 'Needs a supplier' : 'Waiting for the supplier to accept'}>
      <p className="text-[15px] text-stone">
        {waiting && order.outOfArea
          ? `Out of area: no supplier delivers to PIN ${order.deliveryAddress?.pincode ?? ''} yet. The buyer was told they would hear within 24 hours. Call a supplier below who can deliver there, offer it to them, or cancel the order with a reason.`
          : waiting
          ? 'No supplier left who stocks everything at or below the buyer’s price. Call one below, then offer it to them, or cancel the order.'
          : `Offered to ${populated(order.supplierId)?.businessName ?? 'the supplier'}${expires ? `, answer by ${shortDate.format(new Date(expires))}` : ''}.`}
      </p>
      {options.state.status === 'loading' && <div className="skeleton mt-3 h-20" />}
      {options.state.status === 'error' && <p className="mt-3 text-[14px] text-error">{errorText(options.state.error, 'Couldn’t load suppliers.')}</p>}
      {options.state.status === 'success' && (
        options.state.data.length === 0 ? (
          <p className="mt-3 text-[14px] text-stone">No supplier lists these items yet (or the order predates the Sthiva catalog).</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {options.state.data.map((s) => {
              // Out of area: nobody was offered it yet, so the buyer's chosen supplier can be offered too
              const usable = s.allItems && s.enoughStock && (!s.current || !!(waiting && order.outOfArea));
              return (
                <li key={s.supplier._id} className="flex flex-wrap items-center gap-2 rounded-xl border border-sand-4 px-3 py-2 text-[14px]">
                  <span className="min-w-[10rem] flex-1">
                    <span className="font-semibold">{s.supplier.businessName}</span>
                    {s.supplier.whatsappNumber && <> · <a className="font-mono text-cobalt hover:underline" href={`tel:${s.supplier.whatsappNumber}`}>{s.supplier.whatsappNumber}</a></>}
                    <span className="block text-stone">
                      {s.lines.map((l) => `${rupees.format(l.basePrice)} / ${UNIT[l.unit] ?? l.unit}, ${l.stockQuantity} in stock`).join('; ')}
                      {!s.allItems && ' · does not list every item'}
                      {s.allItems && !s.enoughStock && ' · not enough stock'}
                      {s.servesPincode === false && ' · PIN not in their delivery area'}
                      {s.tried.length > 0 && ` · ${s.tried.map((t) => TRIED[t] ?? t).join(', ')}`}
                    </span>
                  </span>
                  {s.current ? <Pill tone="active">Has the offer</Pill> : usable && (
                    <button type="button" onClick={() => setPicked(s)} className="btn-ghost">Offer to them</button>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {picked && (
          <Action
            label={`Offer to ${picked.supplier.businessName}`}
            hint="They get a notification to accept or reject. The buyer’s price does not change."
            placeholder="Reason, e.g. called them, they have stock today"
            onRun={async (reason) => { await opsApi.offer(client, order._id, picked.supplier._id, reason); setPicked(null); reload(); }}
          />
        )}
        {!waiting && (
          <Action
            label="Move to the next supplier now"
            hint="Sthiva picks the next suitable supplier, as if this one said no."
            placeholder="Reason, e.g. supplier said on the phone they can't"
            onRun={async (reason) => { await opsApi.nextSupplier(client, order._id, reason); reload(); }}
          />
        )}
      </div>
    </Panel>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { state, reload } = useLoad((c) => opsApi.order(c, id), [id]);

  if (state.status === 'loading') return <div className="skeleton h-96" role="status" aria-label="Loading order" />;
  if (state.status === 'error') return <ErrorNote>{errorText(state.error, 'Couldn’t load this order.')}</ErrorNote>;

  const o = state.data;
  const supplier = populated(o.supplierId);
  const buyer = populated(o.buyerId);
  const driver = populated(o.driverId);
  const status = ORDER_STATUS[o.status];
  const a = o.deliveryAddress;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/orders" className="inline-flex items-center gap-1 self-start text-[14px] font-medium text-stone hover:text-ink">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        All orders
      </Link>

      <header className="on-ink rounded-3xl bg-ink p-6 text-sand sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={status.tone}>{status.label}</Pill>
          <span className="text-[14px] text-sand/70">{o.paymentMethod ?? 'Payment'} · {PAYMENT[o.paymentStatus] ?? o.paymentStatus}</span>
          {o.deliveryMode && <span className="text-[14px] text-sand/70">· {o.deliveryMode === 'SUPPLIER' ? 'Supplier vehicle' : 'Sthiva driver'}</span>}
        </div>
        <h1 className="mt-3 font-mono text-[clamp(1.75rem,5vw,2.75rem)] font-medium tracking-tight">{o.orderNumber}</h1>
        <p className="mt-2 font-display text-2xl font-bold tabular-nums text-lime">{rupees.format(o.total)}</p>
        <p className="mt-1 text-[14px] text-sand/60">Placed {shortDate.format(new Date(o.createdAt))}</p>
      </header>

      {o.serviceabilityCheck === 'SKIPPED_NO_PINCODE' && (
        <p className="rounded-xl bg-[#FFF4D6] px-4 py-3 text-[15px] text-[#5C4300]">This order came without a delivery PIN, so supplier coverage was never checked. Confirm with the supplier.</p>
      )}
      {o.deliveryIssue && !o.deliveryIssue.resolvedAt && (
        <p className="rounded-xl bg-error-container px-4 py-3 text-[15px] text-on-error-container">
          Delivery problem reported by the {o.deliveryIssue.byRole === 'SUPPLIER' ? 'supplier' : 'driver'} {shortDate.format(new Date(o.deliveryIssue.at))}: {o.deliveryIssue.reason}
        </p>
      )}
      {o.status === 'READY_FOR_PICKUP' && o.driverOffer?.state === 'NEEDS_OPS' && (
        <p className="rounded-xl bg-[#FFF4D6] px-4 py-3 text-[15px] text-[#5C4300]">No suitable driver accepted this job. Assign a driver below.</p>
      )}
      {o.status === 'READY_FOR_PICKUP' && o.driverOffer?.state === 'OFFERED' && (
        <p className="rounded-xl bg-sand-3 px-4 py-3 text-[15px]">Offered to a driver{o.driverOffer.expiresAt ? `, answer by ${shortDate.format(new Date(o.driverOffer.expiresAt))}` : ''}. You can still assign someone yourself.</p>
      )}
      {o.status === 'CANCELLED' && (
        <p className="rounded-xl bg-error-container px-4 py-3 text-[15px] text-on-error-container">
          Cancelled{o.cancelledBy ? ` by ${o.cancelledBy.toLowerCase()}` : ''}{o.cancellationReason ? `: ${o.cancellationReason}` : '.'}
        </p>
      )}

      {o.status === 'PENDING' && o.allocation && <SupplierChoice order={o} reload={reload} />}
      <Actions order={o} reload={reload} />

      {o.earnings && (
        <Panel title="Money">
          <dl className="grid gap-3 text-[15px] sm:grid-cols-3">
            <div><dt className="eyebrow text-stone">Buyer pays</dt><dd className="mt-1 font-semibold tabular-nums">{rupees.format(o.earnings.orderValue)}</dd></div>
            <div>
              <dt className="eyebrow text-stone">Sthiva commission</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {rupees.format(o.deliveryMode === 'SUPPLIER' ? o.earnings.commissionIfYouDeliver : o.earnings.commissionIfSthivaDelivers)}
                {!o.deliveryMode && o.earnings.commissionIfYouDeliver !== o.earnings.commissionIfSthivaDelivers && (
                  <span className="block text-[13px] font-normal text-stone">{rupees.format(o.earnings.commissionIfYouDeliver)} if the supplier delivers</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-stone">Supplier payout</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {rupees.format(o.deliveryMode === 'SUPPLIER' ? o.earnings.payoutIfYouDeliver : o.earnings.payoutIfSthivaDelivers)}
                {!o.deliveryMode && o.earnings.payoutIfYouDeliver !== o.earnings.payoutIfSthivaDelivers && (
                  <span className="block text-[13px] font-normal text-stone">{rupees.format(o.earnings.payoutIfYouDeliver)} if they deliver</span>
                )}
              </dd>
            </div>
          </dl>
          {(o.earnings.deliveryCharge ?? 0) > 0 && (
            <p className="mt-3 text-[14px] text-stone">
              Delivery {rupees.format(o.earnings.deliveryCharge!)}
              {o.delivery && <> ({o.delivery.vehicleName}, {o.delivery.weightKg} kg, {o.delivery.distanceKm} km)</>}
              {o.deliveryMode === 'SUPPLIER'
                ? ': all of it goes to the supplier, who delivered.'
                : o.earnings.driverPayout !== null && o.earnings.driverPayout !== undefined
                  ? `: driver ${rupees.format(o.earnings.driverPayout)}, Sthiva ${rupees.format(o.earnings.sthivaDeliveryShare ?? 0)}.`
                  : ': driver share not set in Settings.'}
            </p>
          )}
          {o.supplierTotal === undefined && <p className="mt-3 text-[13px] text-stone">Placed before commission existed: the supplier gets the full amount.</p>}
          {o.earnings.commissionIfSthivaDelivers < 0 && <p className="mt-3 text-[13px] text-error">This supplier charges more than the buyer pays: Sthiva loses on this order.</p>}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="People">
          <dl className="flex flex-col gap-3 text-[15px]">
            <div><dt className="eyebrow text-stone">Buyer</dt><dd className="mt-1">{buyer?.name ?? 'Unknown'} · <a className="font-mono text-cobalt hover:underline" href={`tel:${buyer?.phone ?? a.contactPhone}`}>{buyer?.phone ?? a.contactPhone}</a></dd></div>
            <div><dt className="eyebrow text-stone">Supplier</dt><dd className="mt-1">{supplier?.businessName ?? 'Unknown'}{supplier?.whatsappNumber && <> · <a className="font-mono text-cobalt hover:underline" href={`tel:${supplier.whatsappNumber}`}>{supplier.whatsappNumber}</a></>}</dd></div>
            <div><dt className="eyebrow text-stone">Driver</dt><dd className="mt-1">{driver ? <>{driver.name ?? 'Driver'} · <a className="font-mono text-cobalt hover:underline" href={`tel:${driver.phone}`}>{driver.phone}</a></> : <span className="text-stone">None</span>}</dd></div>
          </dl>
        </Panel>
        <Panel title="Deliver to">
          <p className="text-[15px]">{a.label && <span className="font-semibold">{a.label}: </span>}{a.fullAddress}</p>
          <p className="mt-1 text-[14px] text-stone">
            {[a.district, a.state].filter(Boolean).join(', ')}{a.pincode && <> · PIN <span className="font-mono">{a.pincode}</span></>}
          </p>
          <p className="mt-1 text-[14px] text-stone">Site contact <a className="font-mono text-cobalt hover:underline" href={`tel:${a.contactPhone}`}>{a.contactPhone}</a></p>
        </Panel>
      </div>

      <Panel title="Items">
        <ul className="divide-y divide-sand-4">
          {o.items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
              <span className="min-w-0">{it.quantity} {UNIT[it.unit] ?? it.unit.toLowerCase()} · {it.name}</span>
              <span className="font-mono tabular-nums">{rupees.format(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 flex flex-col gap-1 border-t border-sand-4 pt-3 text-[14px] text-stone">
          <div className="flex justify-between"><dt>Taxable value</dt><dd className="font-mono">{rupees.format(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>GST</dt><dd className="font-mono">{rupees.format(o.gstAmount)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd className="font-mono">{rupees.format(o.deliveryCharge)}</dd></div>
          <div className="flex justify-between text-[15px] font-semibold text-ink"><dt>Total</dt><dd className="font-mono">{rupees.format(o.total)}</dd></div>
          {o.codAmountCollected !== undefined && <div className="flex justify-between"><dt>Cash recorded</dt><dd className="font-mono">{rupees.format(o.codAmountCollected)}</dd></div>}
        </dl>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="History">
          <ol className="flex flex-col gap-3">
            {[...(o.statusHistory ?? [])].reverse().map((e, i) => (
              <li key={i} className="flex gap-3 text-[14px]">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
                <div>
                  <p><span className="font-semibold">{ORDER_STATUS[e.status]?.label ?? e.status}</span> <span className="text-stone">by {ROLE[e.byRole] ?? e.byRole}</span></p>
                  <p className="text-stone">{shortDate.format(new Date(e.at))}{e.note ? ` · ${e.note}` : ''}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Ops notes">
          {(o.opsNotes ?? []).length === 0 ? (
            <p className="text-[14px] text-stone">No notes yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {[...(o.opsNotes ?? [])].reverse().map((n, i) => (
                <li key={i} className="rounded-xl bg-sand-3 px-4 py-3 text-[14px]">
                  <p>{n.note}</p>
                  <p className="mt-1 text-stone">{ROLE[n.byRole] ?? n.byRole} · {shortDate.format(new Date(n.at))}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
