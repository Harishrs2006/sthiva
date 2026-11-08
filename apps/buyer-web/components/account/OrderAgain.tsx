'use client';

import { useRouter } from 'next/navigation';
import { addToCart } from '@/lib/cart';
import type { BuyerOrder } from '@/lib/orders';

type Line = { productId?: string; name: string; unit: string; quantity: number; imageUrl?: string; pricePerUnit?: number };

// Puts the same items and quantities back in the cart. Checkout re-prices everything from the live
// listings, so a changed price or a sold-out item is caught there, never silently.
export function OrderAgain({ order }: { order: BuyerOrder }) {
  const router = useRouter();
  const lines = (order.items as Line[]).filter((i) => i.productId);
  if (lines.length === 0 || !['DELIVERED', 'CANCELLED'].includes(order.status)) return null;

  function again() {
    for (const i of lines) {
      addToCart('unknown', 'Supplier', {
        productId: i.productId!,
        name: i.name,
        imageUrl: i.imageUrl || undefined,
        unit: i.unit,
        basePrice: i.pricePerUnit ?? 0,
        quantity: i.quantity,
        minOrderQuantity: 1,
      });
    }
    router.push('/cart');
  }

  return (
    <button type="button" onClick={again} className="btn-ink w-full sm:w-auto">
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">replay</span>
      Order these again
    </button>
  );
}
