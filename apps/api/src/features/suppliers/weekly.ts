// Weekly availability. Owner decisions: 2026-11-05 a weekly check; 2026-11-06 "whenever they need they can
// update, but every Monday it is compulsory". Suppliers edit stock and prices any time; once a week they
// also go through everything they list and confirm it, by the end of Monday. A supplier who has not
// confirmed by then is hidden from buyers (not listed, not offered orders) until they confirm.
// Reminders: Monday 09:00, and once more after the deadline if they are hidden.
//
// Weeks start Monday 00:00 India time (IST, UTC+5:30). Enforcement starts with the week of 9 Nov 2026
// (deadline: end of Monday 9 Nov), so nobody is hidden for a week before the rule existed.

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ok } from '@sthiva/shared';
import { Product, ON_ORDER_STOCK } from '../../infrastructure/database/models/Product.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { notifyUser } from '../../shared/services/notification.service';
import { bulkPricingProblem } from './product-rules';

const IST_MS = (5 * 60 + 30) * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_HOUR_IST = 9;

/** Monday 00:00 IST of the week `now` falls in, as a UTC instant. */
export function weekStart(now = new Date()): Date {
  const ist = new Date(now.getTime() + IST_MS);
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
  const mondayIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - daysSinceMonday * DAY;
  return new Date(mondayIst - IST_MS);
}

const LISTED = ['ACTIVE', 'OUT_OF_STOCK'];

/** End of Monday 9 Nov 2026 IST: the first deadline that hides anyone (WEEKLY_ENFORCED_FROM overrides, for tests). */
export const ENFORCED_FROM = new Date(process.env.WEEKLY_ENFORCED_FROM || '2026-11-09T18:30:00.000Z');

/** End of Monday (IST) of the week `now` falls in. */
export const weekDeadline = (now = new Date()) => new Date(weekStart(now).getTime() + DAY);

/**
 * Oldest weekly confirmation that still keeps a supplier visible, or null while the rule is not
 * enforced yet. On Monday last week's check still counts; from Tuesday it must be this week's.
 */
export function confirmedSinceRequired(now = new Date()): Date | null {
  if (now < ENFORCED_FROM) return null;
  const start = weekStart(now);
  return now >= weekDeadline(now) ? start : new Date(start.getTime() - 7 * DAY);
}

/** Mongo filter: suppliers who are up to date with the weekly check (empty while not enforced). */
export function weeklyCheckFilter(now = new Date()): Record<string, unknown> {
  const since = confirmedSinceRequired(now);
  return since ? { weeklyConfirmedAt: { $gte: since } } : {};
}

export const weeklyConfirmSchema = z.object({
  items: z.array(z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product ID'),
    stockQuantity: z.number().int().min(0).max(10_000_000),
    basePrice: z.number().positive().max(10_000_000).multipleOf(0.01, 'Use at most 2 decimals'),
  })).min(1).max(500),
});

async function profileFor(userId: string) {
  const profile = await SupplierProfile.findOne({ userId }).select('_id weeklyConfirmedAt canDeliver').lean();
  if (!profile) throw AppError.notFound('Supplier profile');
  return profile;
}

// GET /suppliers/me/weekly — this week's check: every listed item with its quantity and price
export async function getWeekly(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await profileFor(req.auth!.userId);
    const items = await Product.find({ supplierId: profile._id, status: { $in: LISTED } })
      .select('name unit stockQuantity basePrice status minOrderQuantity supply')
      .sort({ name: 1 }).lean();
    const now = new Date();
    const start = weekStart(now);
    const since = confirmedSinceRequired(now);
    res.json(ok({
      weekStart: start,
      deadline: weekDeadline(now),
      confirmedAt: profile.weeklyConfirmedAt ?? null,
      confirmedThisWeek: !!profile.weeklyConfirmedAt && profile.weeklyConfirmedAt >= start,
      // Buyers can't see this supplier until they confirm
      hidden: !!since && !(profile.weeklyConfirmedAt && profile.weeklyConfirmedAt >= since),
      canDeliver: profile.canDeliver ?? false,
      items,
    }));
  } catch (err) { next(err); }
}

// POST /suppliers/me/weekly { items: [{ productId, stockQuantity, basePrice }] } — confirms the whole list
export async function confirmWeekly(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await profileFor(req.auth!.userId);
    const { items } = req.body as z.infer<typeof weeklyConfirmSchema>;
    const listed = await Product.find({ supplierId: profile._id, status: { $in: LISTED } })
      .select('status basePrice minOrderQuantity bulkPricing name supply').lean();
    const byId = new Map(listed.map((p) => [String(p._id), p]));

    // Every listed item must be in the confirmation, and nothing else
    const sent = new Set(items.map((i) => i.productId));
    if (sent.size !== items.length) throw AppError.badRequest('Each item can appear only once');
    const unknown = items.filter((i) => !byId.has(i.productId));
    if (unknown.length) throw AppError.badRequest('Some items are not in your list any more. Refresh and try again.');
    const missing = listed.filter((p) => !sent.has(String(p._id)));
    if (missing.length) throw AppError.badRequest(`Confirm every item. Missing: ${missing.map((p) => p.name).slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);

    // Check every price against its bulk tiers before changing anything
    const problems = items.flatMap((i) => {
      const p = byId.get(i.productId)!;
      const problem = bulkPricingProblem(p.bulkPricing ?? [], i.basePrice, p.minOrderQuantity ?? 1);
      return problem ? [{ field: i.productId, message: `${p.name}: ${problem}` }] : [];
    });
    if (problems.length) throw AppError.badRequest('Validation failed', problems);

    const now = new Date();
    await Product.bulkWrite(items.map((i) => {
      const p = byId.get(i.productId)!;
      // ON_ORDER listings never run out: the weekly check confirms their price only
      const stock = p.supply === 'ON_ORDER' ? ON_ORDER_STOCK : i.stockQuantity;
      // Stock drives availability, as on the product page: 0 is out of stock, restocking brings it back
      const status = stock <= 0 && p.status === 'ACTIVE' ? 'OUT_OF_STOCK'
        : stock > 0 && p.status === 'OUT_OF_STOCK' ? 'ACTIVE' : p.status;
      return {
        updateOne: {
          filter: { _id: p._id, supplierId: profile._id, status: { $in: LISTED } },
          update: { $set: { stockQuantity: stock, basePrice: i.basePrice, status, availabilityConfirmedAt: now } },
        },
      };
    }));
    await SupplierProfile.updateOne({ _id: profile._id }, { $set: { weeklyConfirmedAt: now } });
    logger.info('[weekly] confirmed', { supplierId: String(profile._id), items: items.length });
    res.json(ok({ confirmedAt: now, items: items.length }));
  } catch (err) { next(err); }
}

/**
 * Reminders, one of each per week, to verified active suppliers with listings who have not confirmed:
 *  - Monday from 09:00 IST: confirm by midnight
 *  - after the Monday deadline (when enforced): your items are hidden until you confirm
 * Safe to call often (runs in the one-minute sweeper); each send is claimed atomically.
 */
export async function sendWeeklyReminders(now = new Date()) {
  const start = weekStart(now);
  const deadline = weekDeadline(now);
  let kind: 'MONDAY' | 'HIDDEN' | null = null;
  if (now < deadline) {
    if (now.getTime() >= start.getTime() + REMINDER_HOUR_IST * 60 * 60 * 1000) kind = 'MONDAY';
  } else if (confirmedSinceRequired(now)) {
    kind = 'HIDDEN';
  }
  if (!kind) return 0;
  const field = kind === 'MONDAY' ? 'weeklyReminderFor' : 'weeklyHiddenNoticeFor';
  const notSent = { $or: [{ [field]: { $exists: false } }, { [field]: { $lt: start } }] };
  const due = await SupplierProfile.find({
    verificationStatus: 'VERIFIED',
    isActive: { $ne: false },
    $and: [{ $or: [{ weeklyConfirmedAt: { $exists: false } }, { weeklyConfirmedAt: { $lt: start } }] }, notSent],
  }).select('_id userId').limit(500).lean();
  const enforced = !!confirmedSinceRequired(new Date(deadline.getTime()));
  let sent = 0;
  for (const s of due) {
    // Claim first so two servers never send the same reminder twice
    const claimed = await SupplierProfile.updateOne({ _id: s._id, ...notSent }, { $set: { [field]: start } });
    if (!claimed.modifiedCount) continue;
    if (!(await Product.exists({ supplierId: s._id, status: { $in: LISTED } }))) continue;
    notifyUser(String(s.userId), kind === 'MONDAY'
      ? {
          title: 'Weekly check: confirm your stock and prices today',
          body: enforced
            ? 'Confirm what you can supply this week by midnight tonight, or buyers will not see your items until you do.'
            : 'Tell Sthiva what you can supply this week. It takes a minute on the Weekly check page.',
          data: { screen: 'supplier_weekly' },
        }
      : {
          title: 'Your items are hidden from buyers',
          body: 'You missed this week\'s Monday check. Confirm your stock and prices and your items come back right away.',
          data: { screen: 'supplier_weekly' },
        });
    sent++;
  }
  if (sent) logger.info('[weekly] reminders sent', { kind, sent });
  return sent;
}
