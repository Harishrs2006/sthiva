import Link from 'next/link';
import { StatusPill } from './AccountUI';
import type { BuyerOrder } from '@/lib/orders';
import { rupees, shortDate } from '@/lib/format';
import { formatDeliveryDate } from '@sthiva/web-core';

export function OrderRow({ order }: { order: BuyerOrder }) {
  const count = order.items.length;
  return (
    <Link
      href={`/orders/${order._id}`}
      className="card group flex items-center gap-4 p-4 transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-[0_24px_60px_-28px_rgba(11,12,10,.45)] sm:p-5"
    >
      <span className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sand-3 sm:flex">
        <span className="material-symbols-outlined text-stone" aria-hidden="true">package_2</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="font-mono text-[14px] font-medium">{order.orderNumber}</p>
          <StatusPill status={order.status} />
          {order.deliveryDate && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">event_available</span>
              {formatDeliveryDate(order.deliveryDate)}
            </span>
          )}
        </div>
        <p className="mt-1.5 truncate text-[14px] text-stone">
          {shortDate.format(new Date(order.createdAt))} · {count} item{count > 1 ? 's' : ''}: {order.items.map((i) => i.name).join(', ')}
        </p>
      </div>
      <span className="font-display text-lg font-bold tabular-nums">{rupees.format(order.total)}</span>
      <span className="material-symbols-outlined text-stone transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
        chevron_right
      </span>
    </Link>
  );
}
