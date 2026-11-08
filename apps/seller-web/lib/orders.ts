'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient, type PaginationMeta } from '@sthiva/web-core';

const orderItemSchema = z.object({
  name: z.string(),
  unit: z.string(),
  quantity: z.number(),
  lineTotal: z.number(),
}).passthrough();

export const supplierOrderSchema = z
  .object({
    _id: z.string(),
    orderNumber: z.string(),
    // Lists populate the buyer; status changes answer with the bare id
    buyerId: z.union([z.object({ name: z.string().optional(), phone: z.string().optional() }).passthrough(), z.string()]).nullable().optional(),
    items: z.array(orderItemSchema),
    deliveryAddress: z.object({
      label: z.string(), fullAddress: z.string(), contactPhone: z.string(),
      pincode: z.string().optional(), district: z.string().optional(), state: z.string().optional(),
    }).passthrough(),
    paymentMethod: z.enum(['UPI', 'CARD', 'COD']).optional(),
    paymentStatus: z.enum(['PENDING', 'PARTIAL', 'CAPTURED', 'RELEASED', 'REFUNDED']).optional(),
    driverId: z.union([z.object({ name: z.string().optional(), phone: z.string().optional() }).passthrough(), z.string()]).nullable().optional(),
    total: z.number(),
    status: z.enum(['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED']),
    deliveryMode: z.enum(['PLATFORM', 'SUPPLIER']).optional(),
    // While PENDING: offered to this supplier, answer by expiresAt (if Sthiva set an answer time)
    allocation: z.object({ state: z.string(), expiresAt: z.string().optional() }).passthrough().optional(),
    deliveryIssue: z.object({ reason: z.string(), resolvedAt: z.string().optional() }).passthrough().optional(),
    // What you earn: Sthiva commission and your payout, both ways the order can be delivered
    earnings: z.object({
      orderValue: z.number(),
      payoutIfSthivaDelivers: z.number(),
      commissionIfSthivaDelivers: z.number(),
      payoutIfYouDeliver: z.number(),
      commissionIfYouDeliver: z.number(),
      expectedPayout: z.number().nullable(),
    }).optional(),
    // Straight-line km from the supplier's pickup point; null when either point is unknown
    distanceKm: z.number().nullable().optional(),
    // Your usual delivery time for these listings, and the date you confirmed (YYYY-MM-DD)
    expectedDelivery: z.object({ minDays: z.number(), maxDays: z.number() }).optional(),
    deliveryDate: z.string().optional(),
    onOrder: z.boolean().optional(),
    createdAt: z.string(),
  })
  .passthrough();
export type SupplierOrder = z.infer<typeof supplierOrderSchema>;

export type SupplierOrderAction = 'READY_FOR_PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export async function fetchSupplierOrders(
  client: ApiClient,
  opts: { page?: number; status?: string; cashPending?: boolean } = {}
): Promise<{ data: SupplierOrder[]; meta: PaginationMeta }> {
  return client.requestPage('/suppliers/me/orders', {
    auth: true,
    envelope: true,
    schema: z.array(supplierOrderSchema),
    query: { page: opts.page, status: opts.status, cashPending: opts.cashPending ? 1 : undefined },
  });
}

export async function updateSupplierOrderStatus(
  client: ApiClient,
  id: string,
  status: SupplierOrderAction,
  reason?: string,
  otp?: string
): Promise<SupplierOrder> {
  return client.request(`/suppliers/me/orders/${id}/status`, {
    method: 'PATCH',
    auth: true,
    envelope: true,
    schema: supplierOrderSchema,
    body: { status, reason, ...(otp ? { otp } : {}) },
  });
}

/** Own-vehicle delivery went wrong (buyer not there, site closed...): Sthiva follows up. */
export async function reportDeliveryProblem(client: ApiClient, id: string, reason: string): Promise<unknown> {
  return client.request(`/suppliers/me/orders/${id}/problem`, { method: 'POST', auth: true, envelope: true, schema: z.unknown(), body: { reason } });
}

// Own-vehicle COD: the supplier confirms the exact total once the cash is in hand
/** Take an order Sthiva offered you, committing to a delivery date (YYYY-MM-DD). */
export async function acceptSupplierOrder(client: ApiClient, id: string, deliveryDate: string): Promise<unknown> {
  return client.request(`/suppliers/me/orders/${id}/accept`, { method: 'POST', auth: true, envelope: true, schema: z.unknown(), body: { deliveryDate } });
}

/** Set or change the confirmed delivery date of an accepted order; the buyer is told. */
export async function setSupplierDeliveryDate(client: ApiClient, id: string, deliveryDate: string): Promise<unknown> {
  return client.request(`/suppliers/me/orders/${id}/delivery-date`, { method: 'PATCH', auth: true, envelope: true, schema: z.unknown(), body: { deliveryDate } });
}

/** Turn an offer down; Sthiva offers it to the next supplier. */
export async function rejectSupplierOrder(client: ApiClient, id: string, reason: string): Promise<unknown> {
  return client.request(`/suppliers/me/orders/${id}/reject`, { method: 'POST', auth: true, envelope: true, schema: z.unknown(), body: { reason } });
}

export async function confirmCashCollected(client: ApiClient, id: string, amount: number): Promise<SupplierOrder> {
  return client.request(`/suppliers/me/orders/${id}/cod`, {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: supplierOrderSchema,
    body: { amount },
  });
}

export function useSupplierOrders(page: number, statusFilter?: string, cashPending = false) {
  const client = useApiClient();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'success'; orders: SupplierOrder[]; meta: PaginationMeta }
    | { status: 'error'; error: unknown }
  >({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchSupplierOrders(client, { page, status: statusFilter, cashPending })
      .then(({ data, meta }) => setState({ status: 'success', orders: data, meta }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client, page, statusFilter, cashPending, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
