// For made-to-order materials (kitchens, wardrobes, windows, glass cut to size): the delivery date is not
// known when the buyer orders. The listing shows the supplier's usual time; the supplier confirms the
// actual date when they accept the order.
const STEPS = [
  { icon: 'shopping_bag', title: 'You place the order', body: 'Your order is in process. Nothing to pay now: cash on delivery.' },
  { icon: 'straighten', title: 'The supplier checks the details', body: 'They may call to confirm sizes and finish, or visit your site to measure.' },
  { icon: 'event_available', title: 'Date confirmed within 24 hours', body: 'The supplier confirms the delivery date and you are notified. Your order page shows it.' },
];

export function MadeToOrderSteps() {
  return (
    <section aria-labelledby="mto-title" className="overflow-hidden rounded-3xl bg-ink text-sand">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-ink">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">straighten</span>
        </span>
        <div>
          <h2 id="mto-title" className="font-display text-lg font-semibold tracking-tight">Made to order</h2>
          <p className="text-[13px] text-sand/60">Built to your measurements, so the date is confirmed by the supplier.</p>
        </div>
      </div>
      <ol className="grid gap-px bg-white/10 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 bg-ink px-5 py-5 sm:px-6">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-lime">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{s.icon}</span>
              Step {i + 1}
            </span>
            <p className="font-semibold">{s.title}</p>
            <p className="text-[14px] leading-relaxed text-sand/65">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
