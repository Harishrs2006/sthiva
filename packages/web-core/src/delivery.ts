// How delivery time reads on every screen. A listing's usual time is a range of days after the
// supplier accepts; an order shows that range until the supplier confirms a calendar date.

/** "Same day", "1 day", "2 to 3 days", "2 to 3 weeks". Whole weeks read as weeks from 14 days. */
export function deliveryTimeLabel(minDays: number | null | undefined, maxDays?: number | null): string {
  const lo = Math.max(0, minDays ?? 2);
  const hi = Math.max(lo, maxDays ?? lo);
  if (hi === 0) return 'Same day';
  if (lo >= 14 && lo % 7 === 0 && hi % 7 === 0) {
    const a = lo / 7;
    const b = hi / 7;
    return a === b ? `${a} weeks` : `${a} to ${b} weeks`;
  }
  if (lo === hi) return lo === 1 ? '1 day' : `${lo} days`;
  if (lo === 0) return `Same day to ${hi} ${hi === 1 ? 'day' : 'days'}`;
  return `${lo} to ${hi} days`;
}

/** For sentences: "the same day", "in 2 to 3 days", "in 2 to 3 weeks" ("Usually delivered ..."). */
export function deliveryTimePhrase(minDays: number | null | undefined, maxDays?: number | null): string {
  const label = deliveryTimeLabel(minDays, maxDays);
  if (label === 'Same day') return 'the same day';
  if (label.startsWith('Same day to ')) return `within ${label.slice('Same day to '.length)}`;
  return `in ${label}`;
}

/**
 * What a buyer is told for a seller's usual time: a single number becomes a range with one day of
 * slack ("2" reads "2 to 3 days"), so a normal delay is not a broken promise. Weeks stay as given.
 */
export function buyerDeliveryRange(minDays: number | null | undefined, maxDays?: number | null): { min: number; max: number } {
  const min = Math.max(0, minDays ?? 2);
  const max = Math.max(min, maxDays ?? min);
  return { min, max: max > min || min >= 14 ? max : min + 1 };
}

/** Buyer sentence: "in 2 to 3 days", "the same day or next day", "in 2 to 3 weeks". */
export function buyerDeliveryPhrase(minDays: number | null | undefined, maxDays?: number | null): string {
  const r = buyerDeliveryRange(minDays, maxDays);
  if (r.min === 0 && r.max === 1) return 'the same day or next day';
  return deliveryTimePhrase(r.min, r.max);
}

/** "Tue, 12 Nov" for a YYYY-MM-DD date (a calendar date in India, no time zone shift). */
export function formatDeliveryDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Today in India as YYYY-MM-DD, `plusDays` ahead. */
export function istDate(plusDays = 0, now = new Date()): string {
  const d = new Date(now.getTime() + 330 * 60_000);
  d.setUTCDate(d.getUTCDate() + plusDays);
  return d.toISOString().slice(0, 10);
}

/** Quick choices for a listing's usual delivery time, from same-day stock to made-to-order woodwork. */
export const DELIVERY_TIME_PRESETS: { label: string; min: number; max: number }[] = [
  { label: 'Same day', min: 0, max: 0 },
  { label: '1 to 2 days', min: 1, max: 2 },
  { label: '2 to 3 days', min: 2, max: 3 },
  { label: '3 to 5 days', min: 3, max: 5 },
  { label: '1 week', min: 7, max: 7 },
  { label: '2 to 3 weeks', min: 14, max: 21 },
  { label: '3 to 4 weeks', min: 21, max: 28 },
  { label: '4 to 6 weeks', min: 28, max: 42 },
];
