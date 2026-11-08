import Link from 'next/link';
import type { ReactNode } from 'react';

// Shared building blocks for the supplier portal, same Hi-Vis language as the storefront

export const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const UNIT: Record<string, string> = {
  KG: 'kg', TON: 'tonne', PIECE: 'piece', BAG: 'bag', BUNDLE: 'bundle', CUBIC_METER: 'm³', SQUARE_METER: 'm²', LITER: 'litre', METER: 'metre', BOX: 'box', SHEET: 'sheet',
};
// "500 bags", "1 bag", "12 m³": symbols and kg never take an s
export function unitLabel(unit: string, count: number): string {
  const u = UNIT[unit] ?? unit.toLowerCase();
  return count === 1 || /[³²]|^kg$/.test(u) ? u : `${u}s`;
}
export const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow text-stone">{eyebrow}</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[0.95] tracking-tightest">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-[14px] font-medium transition-colors ${
        active ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'
      }`}
    >
      {children}
    </button>
  );
}

export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-ink text-lime">
        <span className="material-symbols-outlined text-[26px]" aria-hidden="true">{icon}</span>
      </span>
      <p className="font-display text-xl font-semibold tracking-tight">{title}</p>
      <p className="max-w-sm text-[15px] text-stone">{body}</p>
      {cta && (
        <Link href={cta.href} className="btn-ink mt-2">
          {cta.label}
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="card flex items-center gap-2 px-5 py-4 text-[15px] text-error">
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
      {children}
    </p>
  );
}

export function Pager({ page, totalPages, hasPrev, hasNext, onPage }: { page: number; totalPages: number; hasPrev: boolean; hasNext: boolean; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Pages">
      <button type="button" disabled={!hasPrev} onClick={() => onPage(page - 1)} className="btn-ghost h-11 px-4">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
        Previous
      </button>
      <span className="font-mono text-[13px] text-stone">{page} / {totalPages}</span>
      <button type="button" disabled={!hasNext} onClick={() => onPage(page + 1)} className="btn-ghost h-11 px-4">
        Next
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
      </button>
    </nav>
  );
}

type Tone = 'live' | 'wait' | 'active' | 'done' | 'bad' | 'muted';
const TONE: Record<Tone, string> = {
  live: 'bg-lime text-ink',
  wait: 'bg-[#FFF4D6] text-[#5C4300]',
  active: 'bg-cobalt-soft text-[#0F2A8A]',
  done: 'bg-ink text-lime',
  bad: 'bg-error-container text-on-error-container',
  muted: 'bg-sand-3 text-stone',
};

export function Pill({ tone, children, pulse }: { tone: Tone; children: ReactNode; pulse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] ${TONE[tone]}`}>
      {pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export const PRODUCT_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Live', tone: 'live' },
  DRAFT: { label: 'Draft', tone: 'muted' },
  INACTIVE: { label: 'Paused', tone: 'muted' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'bad' },
  DISCONTINUED: { label: 'Discontinued', tone: 'muted' },
};

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Accept or reject', tone: 'wait' },
  CONFIRMED: { label: 'Confirmed', tone: 'active' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'active' },
  ASSIGNED: { label: 'Driver assigned', tone: 'active' },
  PICKED_UP: { label: 'Picked up', tone: 'active' },
  IN_TRANSIT: { label: 'Out for delivery', tone: 'active' },
  DELIVERED: { label: 'Delivered', tone: 'done' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
  DISPUTED: { label: 'Disputed', tone: 'bad' },
};
