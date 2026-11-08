import { createHash, randomBytes, randomInt } from 'crypto';
import { deliveryWindow } from './delivery-window';
import mongoose, { ClientSession, Types } from 'mongoose';
import { Product, IProduct } from '../../infrastructure/database/models/Product.model';
import { Order, IOrder, OrderStatusEvent } from '../../infrastructure/database/models/Order.model';
import { AppError } from '../../shared/errors/AppError';
import { PricingError, priceOrder, paiseToRupees, toPaise, PricedOrder } from './pricing';
import {
  allowedSources, cancelSources, sourceFilter, PRE_DISPATCH,
  type OrderStatus, type DeliveryMode, type Actor,
} from './order-state';
import type { CartItemsInput, CreateOrderInput } from './order.schemas';
import { env } from '../../config/env';
import { offerExpiry, supplierDistances } from './allocation.service';
import { ratesFor, buyerProduct, type Rates } from './commission';
import { activeVehicles, deliveryPoint, quoteDelivery, type DeliveryQuote, type LatLng } from '../delivery/delivery-pricing';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { getPlatformSettings } from '../../infrastructure/database/models/PlatformSettings.model';
import { checkSupplier, eligibleSupplierIds, notServiceable, resolveDestination, type Destination } from '../serviceability/serviceability.service';

/**
 * Destination step shared by quote and order: with a PIN, validate it and check the supplier
 * serves it; without one (older mobile clients), only check the supplier may take orders at
 * all. Never treats a missing PIN or missing supplier coverage as "serves everywhere".
 */
/**
 * Can the order's supplier deliver here? If nobody serves this PIN yet the order is still taken, as
 * out of area: Sthiva's team finds a supplier (allocation NEEDS_OPS) and the buyer hears within 24 hours.
 * Any other reason (supplier unavailable) still refuses.
 */
async function coverage(supplierId: Types.ObjectId, destination: Destination | null, session?: ClientSession): Promise<{ outOfArea: boolean }> {
  const result = await checkSupplier({ supplierProfileId: supplierId, pincode: destination?.pincode, session });
  if (result.serviceable) return { outOfArea: false };
  if (result.reason === 'PINCODE_NOT_SERVED') return { outOfArea: true };
  throw notServiceable(result.reason, destination?.pincode);
}

type LeanOrder = IOrder & { _id: Types.ObjectId };

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `BX-${ts}-${rand}`;
}

function pricingToAppError(err: unknown): unknown {
  if (!(err instanceof PricingError)) return err;
  if (err.kind === 'MISCONFIGURED') {
    return AppError.conflict(`${err.message}. This item can't be ordered right now.`);
  }
  return AppError.badRequest(err.message);
}

// Runs fn in a MongoDB transaction; the driver retries it on transient write conflicts.
async function inTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

// ─── Pricing a cart from trusted product data ───────────────────────────────

type LeanProduct = Pick<
  IProduct,
  'supplierId' | 'name' | 'unit' | 'basePrice' | 'bulkPricing' | 'gstRate' | 'isGstInclusive'
  | 'minOrderQuantity' | 'stockQuantity' | 'status' | 'images' | 'catalogItemId' | 'categoryId' | 'deliveryDays' | 'deliveryDaysMax' | 'supply'
> & { _id: Types.ObjectId };

type PricedCart = {
  supplierId: Types.ObjectId;
  products: LeanProduct[];   // the chosen supplier's listing for each cart line
  priced: PricedOrder;       // what the buyer pays (supplier price + commission)
  supplierPriced: PricedOrder; // what the supplier's own prices come to
  rates: Rates[];
  delivery: DeliveryQuote;
};

type Plan = { listings: LeanProduct[]; rates: Rates[]; priced: PricedOrder; supplierPriced: PricedOrder; delivery: DeliveryQuote };

const deliveryPaise = (d: DeliveryQuote) => (d.status === 'PRICED' ? d.chargePaise : 0);
/** Ranking: deliverable plans first, then cheapest goods + delivery. */
function better(a: Plan, b: Plan) {
  const ua = a.delivery.status === 'UNPRICED' ? 1 : 0;
  const ub = b.delivery.status === 'UNPRICED' ? 1 : 0;
  if (ua !== ub) return ua < ub;
  return a.priced.totalPaise + deliveryPaise(a.delivery) < b.priced.totalPaise + deliveryPaise(b.delivery);
}

async function withDelivery(
  plan: Omit<Plan, 'delivery'>, items: CartItemsInput, destination: LatLng | null, vehicles: Awaited<ReturnType<typeof activeVehicles>>
): Promise<Plan> {
  if (vehicles.length === 0) return { ...plan, delivery: { status: 'OFF' } }; // delivery pricing not set up
  const supplier = await SupplierProfile.findById(plan.listings[0].supplierId).select('location').lean();
  const delivery = await quoteDelivery({
    lines: plan.listings.map((l, i) => ({ catalogItemId: l.catalogItemId, quantity: items[i].quantity })),
    supplierLocation: supplier?.location,
    destination,
    vehicles,
  });
  return { ...plan, delivery };
}

function planFor(items: CartItemsInput, listings: LeanProduct[], rateMap: Map<string, Rates>): Omit<Plan, 'delivery'> {
  const rates = listings.map((l) => {
    const r = rateMap.get(l.categoryId.toString());
    if (!r) throw AppError.conflict(`${l.name} isn't on sale yet. Please check back soon.`);
    return r;
  });
  const priced = priceOrder(items.map((i, idx) => ({ product: buyerProduct(listings[idx], rates[idx].platform), quantity: i.quantity })));
  const supplierPriced = priceOrder(items.map((i, idx) => ({ product: listings[idx], quantity: i.quantity })));
  return { listings, rates, priced, supplierPriced };
}

/**
 * Sthiva picks the supplier: among verified suppliers who serve the PIN and list every cart item
 * (same catalog items) with enough stock, the cheapest for the buyer. The listings the buyer added
 * are just a way to name the items. Carts with items outside the catalog keep their own supplier.
 */
async function chooseListings(items: CartItemsInput, asAdded: LeanProduct[], pincode: string | undefined, destination: LatLng | null, session?: ClientSession) {
  const itemIds = asAdded.map((p) => p.catalogItemId);
  if (itemIds.some((id) => !id)) return null;
  const eligible = await eligibleSupplierIds(pincode);
  const listings = await Product.find({
    catalogItemId: { $in: itemIds },
    status: 'ACTIVE',
    supplierId: { $in: eligible },
  }).session(session ?? null).lean<LeanProduct[]>();

  const bySupplier = new Map<string, LeanProduct[]>();
  for (const l of listings) bySupplier.set(l.supplierId.toString(), [...(bySupplier.get(l.supplierId.toString()) ?? []), l]);
  const rateMap = await ratesFor(listings.map((l) => l.categoryId));
  const vehicles = await activeVehicles();

  // Cheapest wins; at the same price, the supplier nearest the site
  const km = await supplierDistances([...bySupplier.keys()].map((id) => new Types.ObjectId(id)), destination, session);
  let best: Plan | null = null;
  let bestKm = Infinity;
  for (const [sid, own] of bySupplier) {
    const lines = items.map((it, idx) => own.find((l) => l.catalogItemId!.equals(itemIds[idx]!) && l.stockQuantity >= it.quantity));
    if (lines.some((l) => !l)) continue;
    try {
      const plan = await withDelivery(planFor(items, lines as LeanProduct[], rateMap), items, destination, vehicles);
      const tie = best !== null && !better(plan, best) && !better(best, plan);
      if (!best || better(plan, best) || (tie && km(sid) < bestKm)) { best = plan; bestKm = km(sid); }
    } catch (err) {
      if (err instanceof PricingError || err instanceof AppError) continue; // this supplier can't sell this cart
      throw err;
    }
  }
  return best;
}

async function priceCart(items: CartItemsInput, session?: ClientSession, pincode?: string, destination: LatLng | null = null): Promise<PricedCart> {
  const ids = items.map((i) => i.productId);
  const found = await Product.find({ _id: { $in: ids } }).session(session ?? null).lean<LeanProduct[]>();
  const byId = new Map(found.map((p) => [p._id.toString(), p]));

  const products = items.map((i) => {
    const p = byId.get(i.productId);
    if (!p || p.status !== 'ACTIVE') throw AppError.conflict(`${p?.name ?? 'A product'} is no longer available`);
    return p;
  });

  const chosen = await chooseListings(items, products, pincode, destination, session);
  if (chosen) return { supplierId: chosen.listings[0].supplierId, products: chosen.listings, ...chosen };

  // Nobody can supply the whole cart: with one supplier's items, let the usual checks explain why
  const supplierIds = new Set(products.map((p) => p.supplierId.toString()));
  if (supplierIds.size > 1) {
    throw AppError.conflict('No single supplier can deliver all these items here. Please order them separately.');
  }
  try {
    const base = planFor(items, products, await ratesFor(products.map((p) => p.categoryId)));
    const plan = await withDelivery(base, items, destination, await activeVehicles());
    return { supplierId: products[0].supplierId, products, ...plan };
  } catch (err) {
    throw pricingToAppError(err);
  }
}

function lineView(p: PricedCart['products'][number], line: PricedOrder['lines'][number]) {
  return {
    productId: p._id,
    catalogItemId: p.catalogItemId,
    name: p.name,
    imageUrl: p.images?.find((img) => img.isPrimary)?.url ?? p.images?.[0]?.url ?? '',
    unit: p.unit,
    quantity: line.quantity,
    pricePerUnit: paiseToRupees(line.unitPricePaise),
    listPrice: paiseToRupees(line.listPricePaise),
    tierMinQty: line.tierMinQty ?? undefined,
    gstRate: p.gstRate,
    isGstInclusive: p.isGstInclusive,
    subtotal: paiseToRupees(line.grossPaise),
    taxableValue: paiseToRupees(line.taxablePaise),
    gstAmount: paiseToRupees(line.gstPaise),
    lineTotal: paiseToRupees(line.totalPaise),
  };
}

// POST /orders/quote — same pricing as order creation, no writes
export async function quoteOrder(items: CartItemsInput, deliveryPincode?: string, point?: { lat?: number; lng?: number }) {
  const destination = deliveryPincode !== undefined ? await resolveDestination(deliveryPincode) : null;
  const dropPoint = await deliveryPoint({ ...point, pincode: destination?.pincode });
  const { supplierId, products, priced, delivery: priced0 } = await priceCart(items, undefined, destination?.pincode, dropPoint);
  const { outOfArea } = await coverage(supplierId, destination);
  // Out of area: the delivery charge is confirmed with the supplier Sthiva finds
  const delivery = outOfArea && priced0.status === 'UNPRICED' ? { status: 'OFF' as const } : priced0;
  return {
    supplierId,
    // ON_ORDER items (company orders, custom work) and out-of-area orders are 'in process' until confirmed
    onOrder: products.some((p) => p.supply === 'ON_ORDER'),
    outOfArea,
    // Usual delivery time of the chosen listings; the supplier confirms the date after accepting
    expectedDelivery: deliveryWindow(products),
    // null for legacy quotes without a PIN; the order will re-check coverage anyway
    delivery: destination ? { ...destination, serviceable: !outOfArea } : null,
    items: products.map((p, i) => ({
      ...lineView(p, priced.lines[i]),
      inStock: p.stockQuantity >= priced.lines[i].quantity,
      stockQuantity: p.stockQuantity,
    })),
    subtotal: paiseToRupees(priced.subtotalPaise),
    gstAmount: paiseToRupees(priced.gstPaise),
    deliveryCharge: paiseToRupees(deliveryPaise(delivery)),
    // How delivery was priced: OFF (no vehicles set up), PRICED, or UNPRICED with a reason to show
    deliveryPricing: delivery.status === 'PRICED'
      ? { status: 'PRICED', vehicle: delivery.vehicleName, weightKg: delivery.weightKg, distanceKm: delivery.distanceKm }
      : delivery,
    total: paiseToRupees(priced.totalPaise + deliveryPaise(delivery)),
  };
}

// ─── Creating an order ──────────────────────────────────────────────────────

function hashRequest(input: CreateOrderInput): string {
  const { expectedTotal: _ignored, ...material } = input;
  return createHash('sha256').update(JSON.stringify(material)).digest('hex');
}

async function findReplay(buyerId: string, idempotencyKey: string, requestHash: string): Promise<LeanOrder | null> {
  const existing = await Order.findOne({ buyerId, idempotencyKey }).lean<LeanOrder>();
  if (existing && existing.requestHash !== requestHash) {
    throw AppError.conflict('This Idempotency-Key was already used for a different order');
  }
  return existing;
}

/**
 * Prices the cart from DB data, deducts stock and creates the order in ONE transaction:
 * either everything commits or nothing does. Stock is decremented with a conditional
 * update (stockQuantity ≥ qty), so two buyers racing for the last units can't both win —
 * the loser's transaction retries on the write conflict, then fails the stock condition.
 */
export async function createOrder(params: {
  buyerId: string;
  input: CreateOrderInput;
  idempotencyKey: string;
}): Promise<{ order: LeanOrder; replayed: boolean }> {
  const { buyerId, input, idempotencyKey } = params;
  const requestHash = hashRequest(input);

  const replay = await findReplay(buyerId, idempotencyKey, requestHash);
  if (replay) return { order: replay, replayed: true };

  const pincode = input.deliveryAddress.pincode;
  if (pincode === undefined && env.ORDERS_REQUIRE_DELIVERY_PINCODE) {
    throw new AppError('A confirmed delivery PIN code is required. Please update the app.', 'PINCODE_REQUIRED', 400);
  }
  // Postal validity is reference data — check it before opening the transaction
  const destination = pincode !== undefined ? await resolveDestination(pincode) : null;
  const dropPoint = await deliveryPoint({ lat: input.deliveryAddress.lat, lng: input.deliveryAddress.lng, pincode: destination?.pincode });
  const driverShare = (await getPlatformSettings())?.driverSharePercent ?? null;

  try {
    const order = await inTransaction(async (session) => {
      const { supplierId, products, priced, supplierPriced, rates, delivery: priced0 } = await priceCart(input.items, session, destination?.pincode, dropPoint);
      // Re-checked here, inside the transaction, regardless of any earlier quote
      const { outOfArea } = await coverage(supplierId, destination, session);
      const delivery = outOfArea && priced0.status === 'UNPRICED' ? { status: 'OFF' as const } : priced0;
      if (delivery.status === 'UNPRICED') throw new AppError(delivery.message, 'DELIVERY_NOT_PRICED', 409);
      const chargePaise = deliveryPaise(delivery);

      if (input.expectedTotal !== undefined && toPaise(input.expectedTotal) !== priced.totalPaise + chargePaise) {
        throw AppError.conflict('Prices changed since you reviewed your order. Please check the new total.');
      }

      // Out of area: no supplier holds stock yet; the one Sthiva finds takes it when offered
      for (const [i, p] of (outOfArea ? [] : products).entries()) {
        const qty = priced.lines[i].quantity;
        const res = await Product.updateOne(
          { _id: p._id, status: 'ACTIVE', stockQuantity: { $gte: qty } },
          { $inc: { stockQuantity: -qty, totalSold: qty } },
          { session }
        );
        if (res.modifiedCount !== 1) {
          throw AppError.conflict(`Only ${p.stockQuantity} ${p.unit} of ${p.name} left in stock`);
        }
      }

      const now = new Date();
      const expiresAt = await offerExpiry(now);
      const [created] = await Order.create(
        [
          {
            orderNumber: generateOrderNumber(),
            buyerId,
            supplierId,
            items: products.map((p, i) => ({
              ...lineView(p, priced.lines[i]),
              // The supplier's side of the line, and the commission rates in force when ordered
              supplierUnitPrice: paiseToRupees(supplierPriced.lines[i].unitPricePaise),
              supplierLineTotal: paiseToRupees(supplierPriced.lines[i].totalPaise),
              commissionPercent: rates[i].platform,
              ...(rates[i].supplier !== null ? { supplierDeliveryPercent: rates[i].supplier } : {}),
            })),
            supplierTotal: paiseToRupees(supplierPriced.totalPaise),
            commissionTotal: paiseToRupees(priced.totalPaise - supplierPriced.totalPaise),
            deliveryAddress: destination
              ? { ...input.deliveryAddress, district: destination.district, state: destination.state }
              : input.deliveryAddress,
            serviceabilityCheck: destination ? 'VERIFIED' : 'SKIPPED_NO_PINCODE',
            deliveryMethod: input.deliveryMethod,
            expectedDelivery: deliveryWindow(products),
            onOrder: products.some((p) => p.supply === 'ON_ORDER'),
            ...(outOfArea ? { outOfArea: true } : {}),
            deliveryCharge: paiseToRupees(chargePaise),
            ...(delivery.status === 'PRICED' ? {
              delivery: {
                vehicleCode: delivery.vehicleCode, vehicleName: delivery.vehicleName, weightKg: delivery.weightKg, distanceKm: delivery.distanceKm,
                ...(driverShare !== null ? { driverSharePercent: driverShare } : {}),
              },
            } : {}),
            subtotal: paiseToRupees(priced.subtotalPaise),
            gstAmount: paiseToRupees(priced.gstPaise),
            total: paiseToRupees(priced.totalPaise + chargePaise),
            notes: input.notes,
            paymentMethod: 'COD',
            paymentStatus: 'PENDING',
            // Waits for the supplier to accept (allocation.service.ts)
            status: 'PENDING',
            allocation: outOfArea
              ? { state: 'NEEDS_OPS', attempts: [] }
              : { state: 'OFFERED', ...(expiresAt ? { expiresAt } : {}), attempts: [{ supplierId, offeredAt: now }] },
            inventoryState: outOfArea ? 'NONE' : 'DEDUCTED',
            // The buyer tells this to whoever delivers; needed to mark the order delivered
            deliveryOtp: String(randomInt(1000, 10000)),
            idempotencyKey,
            requestHash,
            statusHistory: [{ status: 'PENDING', at: now, byRole: 'BUYER', byUserId: buyerId }],
          },
        ],
        { session }
      );
      return created.toObject() as LeanOrder;
    });
    return { order, replayed: false };
  } catch (err: any) {
    // A concurrent duplicate committed first: our transaction (and its stock changes) rolled back
    if (err?.code === 11000 && err?.keyPattern?.idempotencyKey) {
      const existing = await findReplay(buyerId, idempotencyKey, requestHash);
      if (existing) return { order: existing, replayed: true };
    }
    throw err;
  }
}

// ─── Status transitions ─────────────────────────────────────────────────────

type HistoryRole = OrderStatusEvent['byRole'];

function historyEntry(status: OrderStatus, byRole: HistoryRole, userId?: string, note?: string): OrderStatusEvent {
  return { status, at: new Date(), byRole, byUserId: userId ? new Types.ObjectId(userId) : undefined, note };
}

function modeOf(order: Pick<LeanOrder, 'deliveryMode'>): DeliveryMode {
  return order.deliveryMode === 'SUPPLIER' ? 'SUPPLIER' : 'PLATFORM';
}

async function resolveFailedTransition(
  filter: Record<string, unknown>,
  to: OrderStatus,
  mode?: DeliveryMode
): Promise<LeanOrder> {
  const current = await Order.findOne(filter).lean<LeanOrder>();
  if (!current) throw AppError.notFound('Order');
  // Repeated request: already done (in the same delivery mode), no side effects
  if (current.status === to && (!mode || PRE_DISPATCH.includes(to) || modeOf(current) === mode)) return current;
  throw AppError.conflict(`Order is ${current.status} and can't be moved to ${to}`);
}

/**
 * Compare-and-set transition. `filter` must scope the order to the caller (ownership);
 * allowed sources (and, after dispatch, the delivery mode) come from order-state.ts.
 * Returns changed=false when the order was already in the target status.
 */
export async function transitionOrder(params: {
  filter: Record<string, unknown>;
  to: Exclude<OrderStatus, 'CANCELLED'>;
  actor: Exclude<Actor, 'BUYER'>;
  mode: DeliveryMode;
  userId: string;
  historyRole?: HistoryRole;
  set?: Record<string, unknown>;
  unset?: string[];
  note?: string;
}): Promise<{ order: LeanOrder; changed: boolean }> {
  const { filter, to, actor, mode, userId, set = {}, unset = [], note } = params;
  const historyRole = params.historyRole ?? (actor as HistoryRole);
  const sources = allowedSources(to, actor, mode);
  if (sources.length === 0) throw AppError.forbidden(`${actor} can't set status ${to}`);

  const update: Record<string, unknown> = {
    $set: { status: to, ...set },
    $push: { statusHistory: historyEntry(to, historyRole, userId, note) },
  };
  if (unset.length) update.$unset = Object.fromEntries(unset.map((k) => [k, '']));

  const order = await Order.findOneAndUpdate(
    { $and: [filter, sourceFilter(sources, mode)] },
    update,
    { new: true }
  ).lean<LeanOrder>();
  if (order) return { order, changed: true };
  return { order: await resolveFailedTransition(filter, to, mode), changed: false };
}

/**
 * Cancels in one transaction. `inventoryState` changes in the same compare-and-set as the
 * status, so stock is given back exactly once even under retries or concurrent requests.
 * Only ops may cancel after dispatch, and must say whether the goods came back (restock).
 */
export async function cancelOrder(params: {
  filter: Record<string, unknown>;
  actor: 'BUYER' | 'SUPPLIER' | 'OPS';
  userId: string;
  historyRole?: HistoryRole;
  reason?: string;
  restock?: boolean;
  /** Extra condition applied only to the compare-and-set (e.g. "not yet picked up") */
  guard?: Record<string, unknown>;
}): Promise<{ order: LeanOrder; changed: boolean }> {
  const { filter, actor, userId, reason, restock = true, guard = {} } = params;
  const historyRole = params.historyRole ?? (actor as HistoryRole);
  const sources = cancelSources(actor);

  const cancelled = await inTransaction(async (session) => {
    const before = await Order.findOneAndUpdate(
      { $and: [filter, guard, { status: { $in: sources }, inventoryState: { $nin: ['RESTORED', 'NOT_RESTORED'] } }] },
      {
        $set: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: actor,
          cancellationReason: reason,
          inventoryState: restock ? 'RESTORED' : 'NOT_RESTORED',
        },
        $push: { statusHistory: historyEntry('CANCELLED', historyRole, userId, reason) },
      },
      { new: false, session }
    ).lean<LeanOrder>();
    if (!before) return null;
    const order = (await Order.findById(before._id).session(session).lean<LeanOrder>())!;

    // NONE: the order was waiting for a supplier, so nobody holds stock for it
    if (restock && before.inventoryState !== 'NONE' && order.items.length > 0) {
      await Product.bulkWrite(
        order.items.map((item) => ({
          updateOne: {
            filter: { _id: item.productId },
            update: { $inc: { stockQuantity: item.quantity, totalSold: -item.quantity } },
          },
        })),
        { session }
      );
    }
    return order;
  });

  if (cancelled) return { order: cancelled, changed: true };
  return { order: await resolveFailedTransition(filter, 'CANCELLED'), changed: false };
}

/**
 * COD is collected only when whoever delivered (assigned driver, or the supplier in SUPPLIER
 * mode) explicitly confirms the exact amount after delivery. Delivery alone never changes
 * paymentStatus. `filter` must scope the order to that collector.
 */
export async function recordCodCollected(params: {
  filter: Record<string, unknown>;
  collectorUserId: string;
  collectorRole: 'DELIVERY_PARTNER' | 'SUPPLIER';
  amount: number;
}) {
  const { filter, collectorUserId, collectorRole, amount } = params;

  const current = await Order.findOne(filter).lean<LeanOrder>();
  if (!current) throw AppError.notFound('Order');
  if (current.paymentMethod !== 'COD') throw AppError.conflict('This order is not cash on delivery');
  if (current.paymentStatus === 'CAPTURED') return { order: current, changed: false };
  if (current.status !== 'DELIVERED') throw AppError.conflict('Mark the order delivered before confirming cash');
  if (current.paymentStatus !== 'PENDING') throw AppError.conflict('Payment is being handled by Sthiva support');
  if (toPaise(amount) !== toPaise(current.total)) {
    throw AppError.badRequest(
      `Collected amount must equal the order total of ₹${current.total}. For a short payment, contact Sthiva support.`
    );
  }

  const order = await Order.findOneAndUpdate(
    { ...filter, status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'PENDING' },
    {
      $set: {
        paymentStatus: 'CAPTURED',
        codAmountCollected: current.total,
        codCollectedAt: new Date(),
        codCollectedBy: collectorUserId,
        codCollectedByRole: collectorRole,
      },
    },
    { new: true }
  ).lean<LeanOrder>();
  if (order) return { order, changed: true };

  const latest = await Order.findOne(filter).lean<LeanOrder>();
  if (latest?.paymentStatus === 'CAPTURED') return { order: latest, changed: false };
  throw AppError.conflict('Order changed while confirming payment. Please refresh.');
}

/**
 * Ops records the total cash actually received for a delivered COD order — used when the
 * collector forgot to confirm, or the buyer paid short (→ PARTIAL). A note is mandatory.
 */
export async function recordCodByOps(params: {
  orderId: string;
  amount: number;
  note: string;
  opsUserId: string;
  opsRole: 'OPERATOR' | 'ADMIN';
}) {
  const { orderId, amount, note, opsUserId, opsRole } = params;
  const current = await Order.findById(orderId).lean<LeanOrder>();
  if (!current) throw AppError.notFound('Order');
  if (current.paymentMethod !== 'COD') throw AppError.conflict('This order is not cash on delivery');
  if (current.status !== 'DELIVERED') throw AppError.conflict('Cash can only be recorded for delivered orders');
  const paid = toPaise(amount);
  const total = toPaise(current.total);
  if (paid <= 0 || paid > total) {
    throw AppError.badRequest(`Amount must be between ₹0.01 and the order total ₹${current.total}`);
  }
  if (current.paymentStatus === 'CAPTURED') {
    if (paid === total) return { order: current, changed: false };
    throw AppError.conflict('This order is already fully paid');
  }

  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: { $in: ['PENDING', 'PARTIAL'] } },
    {
      $set: {
        paymentStatus: paid === total ? 'CAPTURED' : 'PARTIAL',
        codAmountCollected: paiseToRupees(paid),
        codCollectedAt: new Date(),
        codCollectedBy: opsUserId,
        codCollectedByRole: opsRole,
      },
      $push: {
        opsNotes: { at: new Date(), byUserId: opsUserId, byRole: opsRole, note: `COD recorded ₹${paiseToRupees(paid)}: ${note}` },
      },
    },
    { new: true }
  ).lean<LeanOrder>();
  if (!order) throw AppError.conflict('Order changed while recording payment. Please refresh.');
  return { order, changed: true };
}

// ─── Handover code and delivery problems ────────────────────────────────────

export const MAX_OTP_FAILURES = 5;

/**
 * Checks the buyer's handover code before an order is marked delivered. Orders from before
 * codes existed have none and pass. After MAX_OTP_FAILURES wrong tries only Sthiva can confirm.
 */
export async function checkDeliveryOtp(filter: Record<string, unknown>, otp?: string) {
  const order = await Order.findOne(filter).select('+deliveryOtp otpFailures status').lean<LeanOrder>();
  if (!order) throw AppError.notFound('Order');
  if (!order.deliveryOtp || order.status === 'DELIVERED') return;
  if ((order.otpFailures ?? 0) >= MAX_OTP_FAILURES) {
    throw AppError.conflict('Too many wrong codes. Call Sthiva support to confirm this delivery.');
  }
  if (!otp) throw AppError.badRequest('Ask the buyer for the 4-digit delivery code and enter it.');
  if (otp !== order.deliveryOtp) {
    await Order.updateOne({ _id: order._id }, { $inc: { otpFailures: 1 } });
    const left = MAX_OTP_FAILURES - (order.otpFailures ?? 0) - 1;
    throw AppError.badRequest(left > 0 ? `That code is wrong. ${left} tries left.` : 'That code is wrong. Call Sthiva support to confirm this delivery.');
  }
}

/** Driver or supplier reports a delivery that went wrong; ops follow it up. */
export async function reportDeliveryProblem(params: { filter: Record<string, unknown>; byRole: 'DELIVERY_PARTNER' | 'SUPPLIER'; userId: string; reason: string }) {
  const { filter, byRole, userId, reason } = params;
  const order = await Order.findOneAndUpdate(
    { ...filter, status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
    { $set: { deliveryIssue: { reason, at: new Date(), byRole, byUserId: new Types.ObjectId(userId) } } },
    { new: true }
  ).lean<LeanOrder>();
  if (!order) {
    if (!(await Order.exists(filter))) throw AppError.notFound('Order');
    throw AppError.conflict('Problems can be reported only while the order is out for delivery');
  }
  return order;
}
