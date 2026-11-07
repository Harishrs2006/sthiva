import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { Product } from '../../infrastructure/database/models/Product.model';
import { Category } from '../../infrastructure/database/models/Category.model';
import { checkSupplier, eligibleSupplierIds, resolveDestination, type Destination } from '../serviceability/serviceability.service';
import { deliveryPoint } from '../delivery/delivery-pricing';
import { supplierDistances } from '../orders/allocation.service';
import { buyerProduct, ratesFor } from '../orders/commission';

// Public catalogue. Every client (mobile included) only sees ACTIVE products from suppliers that
// are verified, active and not suspended. With ?pincode=, results are further limited to
// suppliers that deliver to that PIN; without it the response is unchanged for older clients.
//
// One entry per Sthiva catalog item: of all suppliers' listings of an item, buyers see the
// cheapest (Sthiva picks the supplier at order time). Prices include Sthiva's commission, and a
// category is only on sale once an admin has set its commission (Settings).

/** Categories an admin has set a commission for and not hidden, i.e. on sale. */
async function sellableCategoryIds() {
  const cats = await Category.find({ 'commission.platformDeliveryPercent': { $type: 'number' }, isActive: { $ne: false } }).select('_id').lean();
  return cats.map((c) => c._id);
}

/** Listing → what buyers see: prices with commission, internal fields dropped. */
async function forBuyers<T extends { categoryId: unknown; basePrice: number; bulkPricing?: { minQty: number; price: number }[] }>(rows: T[]) {
  const catId = (c: unknown) => String((c as { _id?: unknown })?._id ?? c);
  const rates = await ratesFor(rows.map((r) => catId(r.categoryId)));
  return rows.flatMap((r) => {
    const rate = rates.get(catId(r.categoryId));
    if (!rate) return [];
    const { _key, _gross, _km, ...rest } = r as T & { _key?: unknown; _gross?: unknown; _km?: unknown };
    return [buyerProduct(rest as unknown as T & { name: string; unit: string; gstRate: number; isGstInclusive: boolean }, rate.platform)];
  });
}

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, sort: sortParam, q, page = '1', limit = '20', pincode } = req.query as Record<string, string>;

    let destination: Destination | undefined;
    if (pincode !== undefined) destination = await resolveDestination(pincode);
    const supplierIds = await eligibleSupplierIds(destination?.pincode);

    const onSale = await sellableCategoryIds();
    const filter: Record<string, unknown> = { status: 'ACTIVE', supplierId: { $in: supplierIds }, categoryId: { $in: onSale } };

    if (typeof category === 'string' && category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) filter.categoryId = onSale.some((id) => id.equals(cat._id)) ? cat._id : { $in: [] };
    }

    if (q) {
      filter.$text = { $search: q };
    }

    // With a PIN, sellers nearest the site come first (then the most sold); without one, the most sold
    const drop = destination ? await deliveryPoint({ pincode: destination.pincode }) : null;
    const km = await supplierDistances(supplierIds, drop);
    const kmIds = supplierIds;
    const kmValues = supplierIds.map((id) => { const d = km(id); return Number.isFinite(d) ? Math.round(d * 10) / 10 : null; });
    const sort = sortParam ?? (drop ? 'nearby' : 'popular');
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      nearby:     { _km: 1, totalSold: -1, _id: 1 },
      popular:    { totalSold: -1, _id: 1 },
      price_asc:  { _gross: 1, _id: 1 },
      price_desc: { _gross: -1, _id: 1 },
      newest:     { createdAt: -1, _id: 1 },
    };

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Cheapest listing per catalog item (listings outside the catalog stand alone)
    const [result] = await Product.aggregate<{ rows: Record<string, unknown>[]; total: { n: number }[] }>([
      { $match: filter },
      {
        $addFields: {
          _key: { $ifNull: ['$catalogItemId', '$_id'] },
          _gross: { $cond: ['$isGstInclusive', '$basePrice', { $multiply: ['$basePrice', { $add: [1, { $divide: ['$gstRate', 100] }] }] }] },
          // Distance of this listing's supplier from the site (km), unknown sorts last
          distanceKm: { $arrayElemAt: [kmValues, { $indexOfArray: [kmIds, '$supplierId'] }] },
        },
      },
      { $addFields: { _km: { $ifNull: ['$distanceKm', 1e9] } } },
      // Cheapest offer per item; at the same price, the nearest supplier
      { $sort: { _gross: 1, _km: 1, _id: 1 } },
      { $group: { _id: '$_key', doc: { $first: '$$ROOT' }, sellerCount: { $sum: 1 }, soldAll: { $sum: '$totalSold' } } },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$doc', { sellerCount: '$sellerCount', totalSold: '$soldAll' }] } } },
      { $sort: sortMap[sort] ?? sortMap.popular },
      { $facet: { rows: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }], total: [{ $count: 'n' }] } },
    ]);
    const populated = await Product.populate(result.rows, [
      { path: 'supplierId', select: 'businessName avgRating' },
      { path: 'categoryId', select: 'name slug' },
    ]);
    const products = await forBuyers(populated as unknown as { categoryId: unknown; basePrice: number }[]);
    const total = result.total[0]?.n ?? 0;

    res.json({
      products,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      // Only present when a PIN was given (additive for older clients)
      ...(destination && {
        location: {
          ...destination,
          serviceable: supplierIds.length > 0,
          supplierCount: supplierIds.length,
          ...(supplierIds.length === 0 ? { reason: 'NO_SUPPLIERS' } : {}),
        },
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const { pincode } = req.query as Record<string, string>;
    const destination = pincode !== undefined ? await resolveDestination(pincode) : undefined;

    const product = await Product.findOne({ _id: req.params.id, status: 'ACTIVE' })
      .populate('supplierId', 'businessName avgRating totalDeliveries whatsappNumber verificationStatus')
      .populate('categoryId', 'name slug')
      .lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Hidden, unverified or suspended suppliers' listings are not public
    const supplier = product.supplierId as unknown as { _id: string } | null;
    const eligibility = supplier
      ? await checkSupplier({ supplierProfileId: supplier._id, pincode: destination?.pincode })
      : { serviceable: false as const, reason: 'SUPPLIER_NOT_AVAILABLE' as const };
    if (!eligibility.serviceable && eligibility.reason === 'SUPPLIER_NOT_AVAILABLE') {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Prices with commission; categories not on sale yet are not shown
    const [priced] = await forBuyers([product]);
    if (!priced) return res.status(404).json({ message: 'Product not found' });

    res.json({
      ...priced,
      // Only present when a PIN was given: can this product be delivered there?
      ...(destination && {
        availability: {
          ...destination,
          deliverable: eligibility.serviceable,
          ...(!eligibility.serviceable ? { reason: eligibility.reason } : {}),
        },
      }),
    });
  } catch (err) {
    next(err);
  }
}
