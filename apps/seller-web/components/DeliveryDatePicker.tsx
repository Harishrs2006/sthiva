'use client';

import { formatDeliveryDate, istDate } from '@sthiva/web-core';

// The supplier commits to a delivery date: quick picks around their usual time, or any date in the
// next six months. Dates are calendar days in India (YYYY-MM-DD).
export function DeliveryDatePicker({
  value, onChange, expected,
}: { value: string; onChange: (date: string) => void; expected?: { minDays: number; maxDays: number } }) {
  const lo = expected?.minDays ?? 0;
  const hi = Math.max(lo, expected?.maxDays ?? lo);
  const span = hi - lo;
  // Up to five quick picks: today and tomorrow, then the usual window (spread out when it is weeks long)
  const offsets = new Set<number>([0, 1]);
  const step = span > 6 ? Math.ceil(span / 3) : 1;
  for (let d = lo; d <= hi && offsets.size < 5; d += step) offsets.add(d);
  offsets.add(hi);
  const picks = [...offsets].sort((x, y) => x - y).slice(0, 6).map((d) => ({ d, date: istDate(d) }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Delivery date">
        {picks.map(({ d, date }) => (
          <button
            key={date}
            type="button"
            role="radio"
            aria-checked={value === date}
            onClick={() => onChange(date)}
            className={`flex min-h-[44px] flex-col items-start justify-center rounded-xl border px-3.5 py-1.5 text-left transition-colors ${
              value === date ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'
            }`}
          >
            <span className="text-[14px] font-semibold">{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : formatDeliveryDate(date)}</span>
            {d > 1 && <span className={`text-[12px] ${value === date ? 'text-sand/70' : 'text-stone'}`}>in {d} days</span>}
          </button>
        ))}
      </div>
      <label className="flex flex-wrap items-center gap-3 text-[14px]">
        <span className="text-stone">Or pick a date</span>
        <input
          type="date"
          value={value}
          min={istDate(0)}
          max={istDate(180)}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="field h-11 w-auto font-mono"
        />
      </label>
    </div>
  );
}
