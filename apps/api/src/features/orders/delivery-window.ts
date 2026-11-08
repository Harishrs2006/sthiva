// Delivery time, the honest way: each listing says how long that supplier usually takes (a range of
// days); an order shows that range until the supplier accepts and confirms a calendar date.

export type DeliveryWindow = { minDays: number; maxDays: number };

/** The order's expected range: the slowest line decides both ends. */
export function deliveryWindow(listings: { deliveryDays?: number | null; deliveryDaysMax?: number | null }[]): DeliveryWindow {
  let minDays = 0;
  let maxDays = 0;
  for (const l of listings) {
    const lo = l.deliveryDays ?? 2;
    const hi = Math.max(lo, l.deliveryDaysMax ?? lo);
    minDays = Math.max(minDays, lo);
    maxDays = Math.max(maxDays, hi);
  }
  return { minDays, maxDays };
}

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Today's date in India as YYYY-MM-DD. */
export function istToday(now = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Days from today (IST) to a YYYY-MM-DD date; negative for the past. */
export function daysFromToday(date: string, now = new Date()): number {
  const a = Date.parse(`${istToday(now)}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export const MAX_DELIVERY_DAYS = 90; // a listing's usual time, up to about three months (woodwork)
export const MAX_DATE_AHEAD_DAYS = 180; // a confirmed date can be at most six months out

/** A valid confirmed delivery date: a real calendar date, today or later, within six months. */
export function checkDeliveryDate(date: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return 'Choose a valid date';
  if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return 'Choose a valid date';
  const ahead = daysFromToday(date, now);
  if (ahead < 0) return 'The delivery date cannot be in the past';
  if (ahead > MAX_DATE_AHEAD_DAYS) return 'Choose a date within the next six months';
  return null;
}
