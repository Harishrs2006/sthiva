// Supplier allocation: a new order is offered to one supplier at a time.
//
//   PENDING/OFFERED ──supplier accepts──▶ CONFIRMED (allocation ACCEPTED)
//   PENDING/OFFERED ──reject / answer time runs out──▶ next suitable supplier (PENDING/OFFERED)
//                                                   └▶ none left: PENDING/NEEDS_OPS (no stock held)
//   PENDING (any) ──ops offers to a chosen supplier──▶ PENDING/OFFERED
//
// A suitable next supplier: verified and active, serves the delivery PIN, has an ACTIVE listing of
// every catalog item in the order with enough stock, was not offered this order before, and its price
// for each line is not above what the buyer is paying (so Sthiva's margin never shrinks). Cheapest first.
// Ops can offer to any supplier with stock, without the price rule.
//
// The buyer's prices never change when the order moves. Stock is held by whoever has the offer:
// returned to the old supplier's listings and taken from the new one's in the same transaction.

import mongoose, { ClientSession, Types } from 'mongoose';
import { Order, IOrder } from '../../infrastructure/database/models/Order.model';
import { Product } from '../../infrastructure/database/models/Product.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { getPlatformSettings } from '../../infrastructure/database/models/PlatformSettings.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { notifyUser } from '../../shared/services/notification.service';
import { checkSupplier } from '../serviceability/serviceability.service';
import { priceLine, toPaise, PricingError } from './pricing';
import { expireDriverOffers } from '../delivery/driver-offers';
import { sendWeeklyReminders } from '../suppliers/weekly';
import { checkDeliveryDate, deliveryWindow } from './delivery-window';
import { deliveryPoint, distanceKm } from '../delivery/delivery-pricing';

type LeanOrder = IOrder & { _id: Types.ObjectId };
type Outcome = 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';

/** When an offer made now runs out, from the admin setting; undefined = no time limit. */
export async function offerExpiry(from: Date): Promise<Date | undefined> {
  const settings = await getPlatformSettings();
  const minutes = settings?.offerTimeoutMinutes;
  return minutes ? new Date(from.getTime() + minutes * 60_000) : undefined;
}

async function inTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => { result = await fn(session); });
    return result;
  } finally {
    await session.endSession();
  }
}

type Listing = {
  _id: Types.ObjectId; supplierId: Types.ObjectId; catalogItemId?: Types.ObjectId; name: string; unit: string;
  basePrice: number; bulkPricing?: { minQty: number; price: number }[]; gstRate: number; isGstInclusive: boolean;
  minOrderQuantity?: number; stockQuantity: number;
};

/** For one supplier: their listing for each order line, or null if they can't supply all of it. */
function matchLines(order: LeanOrder, listings: Listing[], enforcePrice: boolean): { productIds: Types.ObjectId[]; totalPaise: number; linePaise: number[]; unitPaise: number[] } | null {
  const productIds: Types.ObjectId[] = [];
  const linePaise: number[] = [];
  const unitPaise: number[] = [];
  let totalPaise = 0;
  for (const item of order.items) {
    const l = listings.find((x) => item.catalogItemId && x.catalogItemId?.equals(item.catalogItemId));
    if (!l || l.stockQuantity < item.quantity) return null;
    try {
      const priced = priceLine(l, item.quantity);
      // Compare with what the supplier side of this line was (older orders: the buyer's line)
      if (enforcePrice && priced.totalPaise > toPaise(item.supplierLineTotal ?? item.lineTotal)) return null;
      totalPaise += priced.totalPaise;
      linePaise.push(priced.totalPaise);
      unitPaise.push(priced.unitPricePaise);
    } catch (err) {
      if (err instanceof PricingError) return null; // their listing can't sell this quantity
      throw err;
    }
    productIds.push(l._id);
  }
  return { productIds, totalPaise, linePaise, unitPaise };
}

async function listingsFor(order: LeanOrder, supplierIds: Types.ObjectId[] | null, session: ClientSession) {
  const itemIds = order.items.map((i) => i.catalogItemId).filter(Boolean);
  if (itemIds.length !== order.items.length) return []; // older orders without catalog links can't move
  return Product.find({
    catalogItemId: { $in: itemIds },
    status: 'ACTIVE',
    ...(supplierIds ? { supplierId: { $in: supplierIds } } : {}),
  })
    .select('supplierId catalogItemId name unit basePrice bulkPricing gstRate isGstInclusive minOrderQuantity stockQuantity')
    .session(session)
    .lean<Listing[]>();
}

async function canServe(supplierId: Types.ObjectId, order: LeanOrder, session: ClientSession) {
  const r = await checkSupplier({ supplierProfileId: supplierId, pincode: order.deliveryAddress?.pincode, session });
  return r.serviceable;
}

/** Straight-line km from each supplier's pickup point to the site (Infinity when either is unknown). */
export async function supplierDistances(ids: Types.ObjectId[], to: { lat: number; lng: number } | null, session?: ClientSession) {
  const profiles = to && ids.length
    ? await SupplierProfile.find({ _id: { $in: ids } }).select('location').session(session ?? null).lean()
    : [];
  const at = new Map(profiles.map((p) => [p._id.toString(), p.location]));
  return (id: Types.ObjectId | string) => {
    const from = at.get(id.toString());
    return to && from && typeof from.lat === 'number' && typeof from.lng === 'number' ? distanceKm({ lat: from.lat, lng: from.lng }, to) : Infinity;
  };
}

/** Best next supplier for the order, or null. */
async function findNextSupplier(order: LeanOrder, session: ClientSession) {
  const tried = (order.allocation?.attempts ?? []).map((a) => a.supplierId.toString());
  const listings = (await listingsFor(order, null, session)).filter((l) => !tried.includes(l.supplierId.toString()));
  const bySupplier = new Map<string, Listing[]>();
  for (const l of listings) bySupplier.set(l.supplierId.toString(), [...(bySupplier.get(l.supplierId.toString()) ?? []), l]);

  const options: { supplierId: Types.ObjectId; productIds: Types.ObjectId[]; totalPaise: number; linePaise: number[]; unitPaise: number[] }[] = [];
  for (const [sid, own] of bySupplier) {
    const m = matchLines(order, own, true);
    if (m) options.push({ supplierId: new Types.ObjectId(sid), ...m });
  }
  // Cheapest first; at the same price, the supplier nearest the site
  const drop = await deliveryPoint(order.deliveryAddress);
  const km = await supplierDistances(options.map((o) => o.supplierId), drop, session);
  options.sort((a, b) => a.totalPaise - b.totalPaise || km(a.supplierId) - km(b.supplierId));
  for (const o of options) {
    if (await canServe(o.supplierId, order, session)) return o;
  }
  return null;
}

async function moveStock(order: LeanOrder, toProductIds: Types.ObjectId[] | null, session: ClientSession) {
  // Give back what the current holder reserved
  if (order.inventoryState !== 'NONE') {
    await Product.bulkWrite(
      order.items.map((i) => ({ updateOne: { filter: { _id: i.productId }, update: { $inc: { stockQuantity: i.quantity, totalSold: -i.quantity } } } })),
      { session }
    );
  }
  if (!toProductIds) return;
  for (const [idx, pid] of toProductIds.entries()) {
    const qty = order.items[idx].quantity;
    const res = await Product.updateOne(
      { _id: pid, status: 'ACTIVE', stockQuantity: { $gte: qty } },
      { $inc: { stockQuantity: -qty, totalSold: qty } },
      { session }
    );
    if (res.modifiedCount !== 1) throw AppError.conflict('That supplier no longer has enough stock');
  }
}

type Moved = { order: LeanOrder; offeredTo: Types.ObjectId | null };

/**
 * Closes the current offer with `outcome` and offers the order to `target` (ops) or the best
 * next supplier. `expect` guards against races: the order must still be in that offer state.
 */
async function moveOn(params: {
  orderId: string;
  outcome: Outcome;
  reason?: string;
  expect: Record<string, unknown>;
  target?: { supplierId: Types.ObjectId; byOps: true };
  actor: { role: 'SUPPLIER' | 'OPERATOR' | 'ADMIN' | 'SYSTEM'; userId?: string };
}): Promise<Moved | null> {
  const { orderId, outcome, reason, expect, target, actor } = params;
  return inTransaction(async (session) => {
    const order = await Order.findOne({ _id: orderId, status: 'PENDING', ...expect }).session(session).lean<LeanOrder>();
    if (!order) return null;
    const now = new Date();

    let next: { supplierId: Types.ObjectId; productIds: Types.ObjectId[]; linePaise: number[]; unitPaise: number[]; totalPaise: number } | null = null;
    if (target) {
      const profile = await SupplierProfile.findById(target.supplierId).select('verificationStatus isActive').session(session).lean();
      if (!profile || profile.verificationStatus !== 'VERIFIED' || profile.isActive === false) {
        throw AppError.conflict('That supplier is not verified or not active');
      }
      const m = matchLines(order, await listingsFor(order, [target.supplierId], session), false);
      if (!m) throw AppError.conflict('That supplier does not list every item in this order with enough stock');
      next = { supplierId: target.supplierId, ...m };
    } else {
      next = await findNextSupplier(order, session);
    }

    await moveStock(order, next?.productIds ?? null, session);

    const attempts = (order.allocation?.attempts ?? []).map((a, i, all) =>
      i === all.length - 1 && !a.outcome && order.allocation?.state === 'OFFERED' ? { ...a, outcome, at: now, reason } : a
    );
    const set: Record<string, unknown> = {};
    if (next) {
      const expiresAt = await offerExpiry(now);
      attempts.push({ supplierId: next.supplierId, offeredAt: now, ...(target ? { byOps: true } : {}) });
      set.supplierId = next.supplierId;
      // Buyer prices stay; the supplier side follows the new supplier's own prices
      set.items = order.items.map((it, i) => ({
        ...it,
        productId: next!.productIds[i],
        supplierUnitPrice: next!.unitPaise[i] / 100,
        supplierLineTotal: next!.linePaise[i] / 100,
      }));
      set.supplierTotal = next.totalPaise / 100;
      // The new supplier's usual delivery time
      const lead = await Product.find({ _id: { $in: next.productIds } }).select('deliveryDays deliveryDaysMax').session(session).lean();
      set.expectedDelivery = deliveryWindow(lead);
      set.commissionTotal = (toPaise(order.total) - next.totalPaise) / 100;
      set.allocation = { state: 'OFFERED', ...(expiresAt ? { expiresAt } : {}), attempts };
      set.inventoryState = 'DEDUCTED';
    } else {
      set.allocation = { state: 'NEEDS_OPS', attempts };
      set.inventoryState = 'NONE';
    }
    const note = next
      ? `Offered to another supplier${target ? ' by Sthiva' : ''} (${outcome.toLowerCase()}${reason ? `: ${reason}` : ''})`
      : `No suitable supplier left (${outcome.toLowerCase()}${reason ? `: ${reason}` : ''}); Sthiva team will arrange it`;
    const historyRole = actor.role === 'OPERATOR' || actor.role === 'ADMIN' ? actor.role : actor.role === 'SUPPLIER' ? 'SUPPLIER' : 'SYSTEM';
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: 'PENDING', updatedAt: order.updatedAt },
      {
        $set: set,
        $push: { statusHistory: { status: 'PENDING', at: now, byRole: historyRole, ...(actor.userId ? { byUserId: new Types.ObjectId(actor.userId) } : {}), note } },
      },
      { new: true, session }
    ).lean<LeanOrder>();
    if (!updated) throw AppError.conflict('Order changed at the same time. Please refresh.');
    return { order: updated, offeredTo: next?.supplierId ?? null };
  });
}

function notifyOffer(order: LeanOrder, supplierId: Types.ObjectId) {
  SupplierProfile.findById(supplierId).select('userId').lean().then((sp) => {
    if (!sp?.userId) return;
    const minutes = order.allocation?.expiresAt ? Math.round((order.allocation.expiresAt.getTime() - Date.now()) / 60000) : null;
    return notifyUser(sp.userId.toString(), {
      title: 'New order: accept or reject',
      body: `Order ${order.orderNumber}: ₹${order.total.toLocaleString('en-IN')}${minutes ? `. Answer within ${minutes} min.` : ''}`,
      data: { screen: 'supplier_orders', orderId: order._id.toString() },
    });
  }).catch((err) => logger.error('Offer notification failed', { orderId: order._id.toString(), error: err?.message }));
}

function afterMove(moved: Moved | null) {
  if (!moved) return;
  if (moved.offeredTo) notifyOffer(moved.order, moved.offeredTo);
  else logger.warn('[allocation] order needs ops', { orderId: moved.order._id.toString(), orderNumber: moved.order.orderNumber });
}

/** The first offer, right after the order is created. */
export function announceNewOrder(order: LeanOrder) {
  // Out of area: nobody is offered it yet; Sthiva's team finds a supplier from the ops queue
  if (order.allocation?.state !== 'OFFERED') return;
  notifyOffer(order, order.supplierId);
}

const offeredTo = (supplierProfileId: string) => ({ supplierId: supplierProfileId, 'allocation.state': 'OFFERED' });

// ─── Supplier answers ───────────────────────────────────────────────────────

/**
 * The supplier accepts the offer. deliveryDate (YYYY-MM-DD, India) is the date they commit to; the
 * seller website always sends it, older app versions may not (the buyer then sees the expected range).
 */
export async function acceptOffer(params: { orderId: string; supplierProfileId: string; userId: string; deliveryDate?: string }) {
  const { orderId, supplierProfileId, userId, deliveryDate } = params;
  const now = new Date();
  if (deliveryDate !== undefined) {
    const problem = checkDeliveryDate(deliveryDate, now);
    if (problem) throw AppError.badRequest(problem);
  }
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'PENDING', ...offeredTo(supplierProfileId) },
    {
      $set: {
        status: 'CONFIRMED', confirmedAt: now, 'allocation.state': 'ACCEPTED', 'allocation.attempts.$[open].outcome': 'ACCEPTED', 'allocation.attempts.$[open].at': now,
        ...(deliveryDate ? { deliveryDate, deliveryDateSetAt: now } : {}),
      },
      $unset: { 'allocation.expiresAt': '' },
      $push: { statusHistory: { status: 'CONFIRMED', at: now, byRole: 'SUPPLIER', byUserId: new Types.ObjectId(userId) } },
    },
    { new: true, arrayFilters: [{ 'open.supplierId': new Types.ObjectId(supplierProfileId), 'open.outcome': { $exists: false } }] }
  ).lean<LeanOrder>();
  if (order) {
    notifyUser(order.buyerId.toString(), {
      title: 'Order confirmed',
      body: order.deliveryDate
        ? `Your order ${order.orderNumber} is confirmed. Delivery on ${formatDay(order.deliveryDate)}.`
        : `Your order ${order.orderNumber} is confirmed by the supplier.`,
      data: { screen: 'buyer_orders', orderId: order._id.toString() },
    });
    return { order, changed: true };
  }
  const current = await Order.findOne({ _id: orderId, 'allocation.attempts.supplierId': new Types.ObjectId(supplierProfileId) }).lean<LeanOrder>();
  if (!current) throw AppError.notFound('Order');
  if (current.status === 'CONFIRMED' && current.supplierId.toString() === supplierProfileId) return { order: current, changed: false };
  throw AppError.conflict('This order is no longer waiting for you');
}

/** "Tue, 12 Nov" for a YYYY-MM-DD date. */
export function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * The supplier sets or changes the confirmed delivery date after accepting (until delivery). The buyer
 * is told every time it changes.
 */
export async function setDeliveryDate(params: { orderId: string; supplierProfileId: string; deliveryDate: string }) {
  const { orderId, supplierProfileId, deliveryDate } = params;
  const problem = checkDeliveryDate(deliveryDate);
  if (problem) throw AppError.badRequest(problem);
  const before = await Order.findOne({ _id: orderId, supplierId: new Types.ObjectId(supplierProfileId) }).select('status deliveryDate').lean<LeanOrder>();
  if (!before) throw AppError.notFound('Order');
  if (!['CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(before.status)) {
    throw AppError.conflict(before.status === 'PENDING' ? 'Accept the order first' : 'This order can no longer be changed');
  }
  if (before.deliveryDate === deliveryDate) return Order.findById(orderId).lean<LeanOrder>();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, supplierId: new Types.ObjectId(supplierProfileId), status: before.status },
    { $set: { deliveryDate, deliveryDateSetAt: new Date() } },
    { new: true }
  ).lean<LeanOrder>();
  if (!order) throw AppError.conflict('Order changed at the same time. Please refresh.');
  notifyUser(order.buyerId.toString(), {
    title: before.deliveryDate ? 'Delivery date changed' : 'Delivery date confirmed',
    body: `Order ${order.orderNumber}: delivery on ${formatDay(deliveryDate)}.`,
    data: { screen: 'buyer_orders', orderId: order._id.toString() },
  });
  return order;
}

export async function rejectOffer(params: { orderId: string; supplierProfileId: string; userId: string; reason: string }) {
  const { orderId, supplierProfileId, userId, reason } = params;
  const moved = await moveOn({
    orderId, outcome: 'REJECTED', reason, expect: offeredTo(supplierProfileId), actor: { role: 'SUPPLIER', userId },
  });
  if (!moved) {
    const exists = await Order.exists({ _id: orderId, 'allocation.attempts.supplierId': new Types.ObjectId(supplierProfileId) });
    if (!exists) throw AppError.notFound('Order');
    throw AppError.conflict('This order is no longer waiting for you');
  }
  afterMove(moved);
  return moved.order;
}

// ─── Answer time ────────────────────────────────────────────────────────────

/** Moves every offer whose answer time has passed. Returns how many moved. */
export async function expireOverdueOffers(now = new Date()): Promise<number> {
  const due = await Order.find({ status: 'PENDING', 'allocation.state': 'OFFERED', 'allocation.expiresAt': { $lte: now } })
    .select('_id supplierId allocation.expiresAt').limit(100).lean();
  let moved = 0;
  for (const o of due) {
    try {
      const r = await moveOn({
        orderId: o._id.toString(),
        outcome: 'EXPIRED',
        reason: 'No answer in time',
        expect: { supplierId: o.supplierId, 'allocation.state': 'OFFERED', 'allocation.expiresAt': { $lte: now } },
        actor: { role: 'SYSTEM' },
      });
      if (r) { moved++; afterMove(r); }
    } catch (err: any) {
      logger.error('[allocation] expiry failed', { orderId: o._id.toString(), error: err?.message });
    }
  }
  return moved;
}

/** Runs the expiry sweep every minute (started by server.ts). */
export function startOfferSweeper(intervalMs = 60_000): NodeJS.Timeout {
  return setInterval(() => {
    expireOverdueOffers().catch((err) => logger.error('[allocation] sweep failed', { error: err?.message }));
    expireDriverOffers().catch((err) => logger.error('[driver-offers] sweep failed', { error: err?.message }));
    sendWeeklyReminders().catch((err) => logger.error('[weekly] reminders failed', { error: err?.message }));
  }, intervalMs);
}

// ─── Ops ────────────────────────────────────────────────────────────────────

/** Ops offers a waiting order to a supplier of their choice (any PENDING order). */
export async function opsOfferTo(params: { orderId: string; supplierProfileId: string; opsUserId: string; role: 'OPERATOR' | 'ADMIN'; reason: string }) {
  const { orderId, supplierProfileId, opsUserId, role, reason } = params;
  const supplierId = new Types.ObjectId(supplierProfileId);
  const moved = await moveOn({
    orderId, outcome: 'WITHDRAWN', reason, expect: {},
    target: { supplierId, byOps: true }, actor: { role, userId: opsUserId },
  });
  if (!moved) {
    if (!(await Order.exists({ _id: orderId }))) throw AppError.notFound('Order');
    throw AppError.conflict('Only orders still waiting for a supplier can be offered');
  }
  afterMove(moved);
  return moved.order;
}

/** Ops asks the system to find the next supplier now (e.g. supplier said no on the phone). */
export async function opsFindNext(params: { orderId: string; opsUserId: string; role: 'OPERATOR' | 'ADMIN'; reason: string }) {
  const { orderId, opsUserId, role, reason } = params;
  const moved = await moveOn({ orderId, outcome: 'WITHDRAWN', reason, expect: {}, actor: { role, userId: opsUserId } });
  if (!moved) {
    if (!(await Order.exists({ _id: orderId }))) throw AppError.notFound('Order');
    throw AppError.conflict('Only orders still waiting for a supplier can be moved');
  }
  afterMove(moved);
  return moved.order;
}
