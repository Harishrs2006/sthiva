import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { Product, ON_ORDER_STOCK } from '../../infrastructure/database/models/Product.model';
import { Order } from '../../infrastructure/database/models/Order.model';
import { AppError } from '../../shared/errors/AppError';
import { Category } from '../../infrastructure/database/models/Category.model';
import { CatalogItem } from '../../infrastructure/database/models/CatalogItem.model';
import { createCatalogItem, findMatchingItem } from '../catalog/catalog.service';
import { bulkPricingProblem } from './product-rules';
import { ORDER_STATUSES } from '../ops/ops.schemas';
import { ok } from '@sthiva/shared';
import { notifyUser } from '../../shared/services/notification.service';
import { logger } from '../../shared/logger/logger';
import { cancelOrder, transitionOrder, recordCodCollected, checkDeliveryOtp, reportDeliveryProblem } from '../orders/order.service';
import { acceptOffer, rejectOffer, setDeliveryDate } from '../orders/allocation.service';
import { startDriverOffers } from '../delivery/driver-offers';
import { supplierEarnings } from '../orders/commission';
import { deliveryPoint, distanceKm } from '../delivery/delivery-pricing';

async function getSupplierProfile(userId: string) {
  const profile = await SupplierProfile.findOne({ userId }).lean();
  if (!profile) throw AppError.notFound('Supplier profile');
  return profile;
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    res.json(ok(profile));
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    // req.body was validated by updateProfileSchema (supplier.routes.ts): only known fields remain
    const update: Record<string, unknown> = { ...req.body };
    const unset: Record<string, ''> = {};
    if (update.gstin === '') {
      delete update.gstin;
      unset.gstin = '';
    }
    if (Array.isArray(update.brands)) update.brands = [...new Set(update.brands as string[])];
    if (Array.isArray(update.categories)) update.categories = [...new Set(update.categories as string[])];

    const profile = await SupplierProfile.findOneAndUpdate(
      { userId: req.auth!.userId },
      Object.keys(unset).length ? { $set: update, $unset: unset } : { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!profile) throw AppError.notFound('Supplier profile');
    res.json(ok(profile));
  } catch (err) { next(err); }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const supplierId = profile._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, pendingOrders, activeProducts, revenueResult] = await Promise.all([
      Order.countDocuments({ supplierId, createdAt: { $gte: today } }),
      Order.countDocuments({ supplierId, $or: [{ status: { $in: ['CONFIRMED', 'IN_TRANSIT'] } }, { status: 'PENDING', 'allocation.state': 'OFFERED' }] }),
      Product.countDocuments({ supplierId, status: 'ACTIVE' }),
      Order.aggregate([
        { $match: { supplierId, status: 'DELIVERED' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json(ok({
      todayOrders,
      pendingOrders,
      activeProducts,
      totalRevenue: revenueResult[0]?.total ?? 0,
    }));
  } catch (err) { next(err); }
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const supplierId = profile._id;

    // Revenue for last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const [revenueByDay, topProducts, orderStatusBreakdown] = await Promise.all([
      Promise.all(
        days.map(async (day) => {
          const next = new Date(day.getTime() + 86400000);
          const agg = await Order.aggregate([
            { $match: { supplierId, status: 'DELIVERED', createdAt: { $gte: day, $lt: next } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
          ]);
          return {
            date: day.toISOString().slice(0, 10),
            revenue: agg[0]?.revenue ?? 0,
            orders: agg[0]?.orders ?? 0,
          };
        })
      ),
      Product.find({ supplierId, status: 'ACTIVE' })
        .sort({ totalSold: -1 })
        .limit(5)
        .select('name totalSold basePrice unit')
        .lean(),
      Order.aggregate([
        { $match: { supplierId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json(ok({ revenueByDay, topProducts, orderStatusBreakdown }));
  } catch (err) { next(err); }
}

export async function listSupplierOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);
    // status may be a comma list (e.g. READY_FOR_PICKUP,ASSIGNED); cashPending=1 lists own-vehicle
    // deliveries whose cash the supplier still has to confirm
    const statuses = String(req.query.status ?? '').split(',').filter((s) => ORDER_STATUSES.includes(s as never));
    const cashPending = req.query.cashPending === '1';

    // An order nobody could take (waiting for Sthiva ops) is no longer this supplier's
    const filter: Record<string, unknown> = { supplierId: profile._id, $nor: [{ status: 'PENDING', 'allocation.state': 'NEEDS_OPS' }] };
    if (statuses.length) filter.status = { $in: statuses };
    if (cashPending) Object.assign(filter, { status: 'DELIVERED', deliveryMode: 'SUPPLIER', paymentMethod: 'COD', paymentStatus: 'PENDING' });

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('buyerId', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Each order with what the supplier earns on it (order value, Sthiva commission, payout), and how far
    // the site is in a straight line from the supplier's pickup point (null if either point is unknown).
    // A priced delivery already stored its distance; otherwise it is worked out from the address or PIN.
    const from = profile.location;
    const withEarnings = await Promise.all(orders.map(async (o) => {
      let km: number | null = o.delivery?.distanceKm ?? null;
      if (km === null && from) {
        const to = await deliveryPoint(o.deliveryAddress);
        km = to ? distanceKm(from, to) : null;
      }
      return { ...o, earnings: supplierEarnings(o), distanceKm: km };
    }));
    res.json(ok(withEarnings, { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }));
  } catch (err) { next(err); }
}

// PATCH /suppliers/me/orders/:id/status
//   READY_FOR_PICKUP — dispatch via a Sthiva delivery partner (PLATFORM mode)
//   IN_TRANSIT       — dispatch with the supplier's own vehicle (SUPPLIER mode); also takes over
//                      a READY_FOR_PICKUP order no driver has accepted yet
//   DELIVERED        — only for orders the supplier is delivering themselves
//   CANCELLED        — reject before dispatch; restores stock
// Delivery progress on PLATFORM orders belongs to the assigned driver.
export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');

    const profile = await getSupplierProfile(req.auth!.userId);
    const { status, reason, otp } = req.body as {
      status: 'READY_FOR_PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
      reason?: string;
      otp?: string;
    };
    const filter = { _id: req.params.id, supplierId: profile._id };
    if (status === 'DELIVERED') await checkDeliveryOtp(filter, otp);
    const userId = req.auth!.userId;
    const now = new Date();

    const { order, changed } =
      status === 'CANCELLED'
        ? await cancelOrder({ filter, actor: 'SUPPLIER', userId, reason })
        : status === 'READY_FOR_PICKUP'
          ? await transitionOrder({ filter, to: status, actor: 'SUPPLIER', mode: 'PLATFORM', userId, set: { deliveryMode: 'PLATFORM' } })
          : status === 'IN_TRANSIT'
            ? await transitionOrder({ filter, to: status, actor: 'SUPPLIER', mode: 'SUPPLIER', userId, set: { deliveryMode: 'SUPPLIER', dispatchedAt: now } })
            : await transitionOrder({ filter, to: status, actor: 'SUPPLIER', mode: 'SUPPLIER', userId, set: { deliveredAt: now } });

    // Fire-and-forget notifications, only when this request actually changed the order
    if (!changed) {
      // no-op
    } else if (status === 'READY_FOR_PICKUP') {
      // Offered to one suitable driver at a time (driver-offers.ts)
      startDriverOffers(order._id.toString());
    } else if (status === 'IN_TRANSIT') {
      notifyUser(order.buyerId.toString(), {
        title: 'On the way',
        body: `${profile.businessName} is delivering your order ${order.orderNumber}.`,
        data: { screen: 'buyer_orders', orderId: order._id.toString() },
      });
    } else if (status === 'DELIVERED') {
      notifyUser(order.buyerId.toString(), {
        title: 'Order delivered',
        body: `Order ${order.orderNumber} delivered. Please pay ₹${order.total.toLocaleString('en-IN')} cash to ${profile.businessName}.`,
        data: { screen: 'buyer_orders', orderId: order._id.toString() },
      });
    } else if (status === 'CANCELLED') {
      notifyUser(order.buyerId.toString(), {
        title: 'Order cancelled',
        body: `Your order ${order.orderNumber} has been cancelled by the supplier.`,
        data: { screen: 'buyer_orders', orderId: order._id.toString() },
      });
    }

    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /suppliers/me/orders/:id/cod — supplier confirms exact COD amount on an order they delivered
export async function confirmCodCollected(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');
    const profile = await getSupplierProfile(req.auth!.userId);
    const { order } = await recordCodCollected({
      filter: { _id: req.params.id, supplierId: profile._id, deliveryMode: 'SUPPLIER' },
      collectorUserId: req.auth!.userId,
      collectorRole: 'SUPPLIER',
      amount: req.body.amount,
    });
    res.json(ok(order));
  } catch (err) { next(err); }
}

export async function listSupplierProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);
    const status = req.query.status as string | undefined;
    // q: name search; lowStock=1: still in stock but at or below the supplier's own alert level
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
    const lowStock = req.query.lowStock === '1';

    const filter: Record<string, unknown> = { supplierId: profile._id };
    if (status && ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'].includes(status)) filter.status = status;
    if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (lowStock) {
      filter.status = { $in: ['ACTIVE', 'INACTIVE'] };
      filter.$expr = { $lte: ['$stockQuantity', '$lowStockAlert'] };
      filter.stockQuantity = { $gt: 0 };
      filter.supply = { $ne: 'ON_ORDER' };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json(ok(products, { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }));
  } catch (err) { next(err); }
}

export async function getSupplierProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid product ID');
    const profile = await getSupplierProfile(req.auth!.userId);

    const product = await Product.findOne({ _id: req.params.id, supplierId: profile._id })
      .populate('categoryId', 'name slug')
      .lean();
    if (!product) throw AppError.notFound('Product');
    res.json(ok(product));
  } catch (err) { next(err); }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);

    // Body is checked by createProductSchema (supplier.routes.ts)
    const { catalogItemId, brand, description, shortDescription, basePrice, gstRate, isGstInclusive,
      stockQuantity: givenStock, minOrderQuantity, deliveryDays, deliveryDaysMax, supply, lowStockAlert, tags, specifications, images, bulkPricing,
      status } = req.body;
    // An ON_ORDER listing never runs out (the supplier orders or makes it): stock is held at ON_ORDER_STOCK
    const stockQuantity = supply === 'ON_ORDER' ? ON_ORDER_STOCK : givenStock;
    let { name, categoryId, unit } = req.body;

    // Selling an item already in the Sthiva catalog: its name, category and unit win, so every
    // supplier's listing of it is comparable. Otherwise this listing starts a new catalog item.
    let itemId;
    if (catalogItemId) {
      const item = await CatalogItem.findOne({ _id: catalogItemId, status: 'ACTIVE' }).lean();
      if (!item) throw AppError.badRequest('That catalog item is not available. Search again or add it as new.');
      if (await Product.exists({ supplierId: profile._id, catalogItemId: item._id })) {
        throw AppError.conflict('You already list this item. Edit your existing listing instead.');
      }
      ({ name, unit } = item);
      categoryId = item.categoryId.toString();
      itemId = item._id;
    } else {
      if (!(await Category.exists({ _id: categoryId }))) throw AppError.badRequest('That category does not exist');
      // Same name, category and unit as an existing item: it is that item
      const same = await findMatchingItem(name, categoryId, unit);
      if (same) {
        if (await Product.exists({ supplierId: profile._id, catalogItemId: same._id })) {
          throw AppError.conflict('You already list this item. Edit your existing listing instead.');
        }
        itemId = same._id;
      }
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 0;
    while (await Product.exists({ slug })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    let newItemId;
    if (!itemId) {
      const item = await createCatalogItem(
        { name, categoryId, unit, brand: brand ?? specifications?.Brand, description, images, specifications, gstRate: gstRate ?? 18 },
        { role: 'SUPPLIER', userId: profile.userId }
      );
      itemId = newItemId = item._id;
    }

    let product;
    try {
      product = await Product.create({
        supplierId: profile._id,
        catalogItemId: itemId,
        categoryId,
        name,
        slug,
        description,
        shortDescription,
        unit,
        basePrice,
        gstRate: gstRate ?? 18,
        isGstInclusive: isGstInclusive ?? true,
        stockQuantity: stockQuantity ?? 0,
        minOrderQuantity: minOrderQuantity ?? 1,
        deliveryDays: deliveryDays ?? 2,
        supply: supply ?? 'IN_STOCK',
        ...(deliveryDaysMax !== undefined ? { deliveryDaysMax: Math.max(deliveryDaysMax, deliveryDays ?? 2) } : {}),
        tags: tags ?? [],
        specifications: specifications ?? {},
        images: images ?? [],
        bulkPricing: [...(bulkPricing ?? [])].sort((a: { minQty: number }, b: { minQty: number }) => a.minQty - b.minQty),
        ...(lowStockAlert !== undefined ? { lowStockAlert } : {}),
        // Drafts stay hidden; anything published with no stock shows as out of stock, not live
        status: status === 'DRAFT' ? 'DRAFT' : (stockQuantity ?? 0) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      });
    } catch (err) {
      // Don't leave behind a catalog item made only for this failed listing
      if (newItemId) await CatalogItem.deleteOne({ _id: newItemId });
      throw err;
    }

    // Same shape as the list and GET responses: the web portal validates it
    await product.populate('categoryId', 'name slug');
    res.status(201).json(ok(product));
  } catch (err) { next(err); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid product ID');

    const profile = await getSupplierProfile(req.auth!.userId);

    const editable = ['name', 'description', 'shortDescription', 'basePrice', 'gstRate', 'isGstInclusive',
      'stockQuantity', 'minOrderQuantity', 'deliveryDays', 'deliveryDaysMax', 'supply', 'tags', 'specifications', 'status', 'images',
      'lowStockAlert', 'bulkPricing'];
    const update: Record<string, unknown> = {};
    for (const key of editable) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const current = await Product.findOne({ _id: req.params.id, supplierId: profile._id })
      .select('status basePrice minOrderQuantity bulkPricing deliveryDays deliveryDaysMax supply').lean();
    if (!current) throw AppError.notFound('Product');

    // Delivery time stays a valid range when only one end changes: a longer shortest time stretches the longest
    if (update.deliveryDays !== undefined || update.deliveryDaysMax !== undefined) {
      const lo = (update.deliveryDays ?? current.deliveryDays ?? 2) as number;
      const hi = update.deliveryDaysMax as number | undefined;
      if (hi !== undefined && hi < lo) {
        throw AppError.badRequest('Validation failed', [{ field: 'deliveryDaysMax', message: 'The longest delivery time cannot be shorter than the shortest' }]);
      }
      if (hi === undefined && current.deliveryDaysMax !== undefined && current.deliveryDaysMax < lo) update.deliveryDaysMax = lo;
    }

    // Bulk prices are checked against the price and minimum order they will sit next to
    if (update.bulkPricing !== undefined || update.basePrice !== undefined || update.minOrderQuantity !== undefined) {
      const tiers = (update.bulkPricing ?? current.bulkPricing) as { minQty: number; price: number }[];
      const problem = bulkPricingProblem(tiers, (update.basePrice ?? current.basePrice) as number, (update.minOrderQuantity ?? current.minOrderQuantity) as number);
      if (problem) throw AppError.badRequest('Validation failed', [{ field: 'bulkPricing', message: problem }]);
      if (update.bulkPricing !== undefined) update.bulkPricing = [...tiers].sort((a, b) => a.minQty - b.minQty);
    }

    // ON_ORDER never runs out; switching back to IN_STOCK needs a real stock figure (0 if none given)
    const supplyAfter = (update.supply ?? current.supply ?? 'IN_STOCK') as 'IN_STOCK' | 'ON_ORDER';
    if (supplyAfter === 'ON_ORDER') {
      update.stockQuantity = ON_ORDER_STOCK;
    } else if (current.supply === 'ON_ORDER' && update.stockQuantity === undefined) {
      update.stockQuantity = 0;
    }

    // Stock drives availability: 0 hides the listing as out of stock, restocking brings it back.
    // An explicit status in the same request (e.g. DRAFT or DISCONTINUED) always wins.
    if (typeof update.stockQuantity === 'number' && update.status === undefined) {
      if (update.stockQuantity <= 0 && current.status === 'ACTIVE') update.status = 'OUT_OF_STOCK';
      if (update.stockQuantity > 0 && current.status === 'OUT_OF_STOCK') update.status = 'ACTIVE';
    }

    // runValidators: stock/price/GST bounds in the schema apply to edits too
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: profile._id },
      update,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name slug').lean();
    if (!product) throw AppError.notFound('Product');
    res.json(ok(product));
  } catch (err) { next(err); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid product ID');
    const profile = await getSupplierProfile(req.auth!.userId);

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: profile._id },
      { status: 'DISCONTINUED' },
      { new: true }
    ).lean();
    if (!product) throw AppError.notFound('Product');
    res.json(ok({ message: 'Product discontinued' }));
  } catch (err) { next(err); }
}

// POST /suppliers/me/orders/:id/accept — take an order offered to you
export async function acceptOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');
    const profile = await getSupplierProfile(req.auth!.userId);
    const { order } = await acceptOffer({
      orderId: String(req.params.id), supplierProfileId: profile._id.toString(), userId: req.auth!.userId,
      deliveryDate: req.body?.deliveryDate,
    });
    res.json(ok(order));
  } catch (err) { next(err); }
}

// PATCH /suppliers/me/orders/:id/delivery-date { deliveryDate } — set or change the confirmed date; buyer is told
export async function changeDeliveryDate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');
    const profile = await getSupplierProfile(req.auth!.userId);
    const order = await setDeliveryDate({ orderId: String(req.params.id), supplierProfileId: profile._id.toString(), deliveryDate: req.body.deliveryDate });
    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /suppliers/me/orders/:id/reject { reason } — Sthiva offers it to the next supplier
export async function rejectOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');
    const profile = await getSupplierProfile(req.auth!.userId);
    await rejectOffer({ orderId: String(req.params.id), supplierProfileId: profile._id.toString(), userId: req.auth!.userId, reason: req.body.reason });
    res.json(ok({ rejected: true }));
  } catch (err) { next(err); }
}

// POST /suppliers/me/orders/:id/problem { reason } — own-vehicle delivery went wrong; Sthiva follows up
export async function reportProblem(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');
    const profile = await getSupplierProfile(req.auth!.userId);
    const order = await reportDeliveryProblem({
      filter: { _id: req.params.id, supplierId: profile._id, deliveryMode: 'SUPPLIER' },
      byRole: 'SUPPLIER', userId: req.auth!.userId, reason: req.body.reason,
    });
    res.json(ok(order));
  } catch (err) { next(err); }
}
