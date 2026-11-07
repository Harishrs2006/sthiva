import { z } from 'zod';
import type { ApiClient, PaginationMeta } from '@sthiva/web-core';

const quoteLineSchema = z.object({
  productId: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  unit: z.string(),
  quantity: z.number(),
  pricePerUnit: z.number(),
  listPrice: z.number(),
  tierMinQty: z.number().optional(),
  lineTotal: z.number(),
  inStock: z.boolean(),
  stockQuantity: z.number(),
});

export const quoteSchema = z.object({
  supplierId: z.string(),
  delivery: z.object({ pincode: z.string(), district: z.string(), state: z.string(), serviceable: z.boolean() }).nullable(),
  items: z.array(quoteLineSchema),
  subtotal: z.number(),
  gstAmount: z.number(),
  deliveryCharge: z.number(),
  // OFF: no delivery charges yet. PRICED: vehicle, weight, distance. UNPRICED: can't order yet, message says why.
  deliveryPricing: z.object({
    status: z.enum(['OFF', 'PRICED', 'UNPRICED']),
    vehicle: z.string().optional(), weightKg: z.number().optional(), distanceKm: z.number().optional(), message: z.string().optional(),
  }).passthrough().optional(),
  total: z.number(),
  // Usual delivery time of the listings (days after the supplier accepts)
  expectedDelivery: z.object({ minDays: z.number(), maxDays: z.number() }).optional(),
  // In process until confirmed: something is ordered from the company / made, or no supplier serves the PIN yet
  onOrder: z.boolean().optional(),
  outOfArea: z.boolean().optional(),
});
export type Quote = z.infer<typeof quoteSchema>;

export async function quoteCart(
  client: ApiClient,
  items: { productId: string; quantity: number }[],
  deliveryPincode?: string
): Promise<Quote> {
  return client.request('/orders/quote', {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: quoteSchema,
    body: { items, deliveryPincode },
  });
}

export type DeliveryAddressInput = {
  label: string;
  fullAddress: string;
  pincode?: string;
  contactPhone: string;
};

const placeOrderResultSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  subtotal: z.number(),
  gstAmount: z.number(),
  total: z.number(),
  status: z.string(),
  replayed: z.boolean(),
});
export type PlaceOrderResult = z.infer<typeof placeOrderResultSchema>;

export async function placeOrder(
  client: ApiClient,
  input: {
    items: { productId: string; quantity: number }[];
    deliveryAddress: DeliveryAddressInput;
    expectedTotal?: number;
    notes?: string;
  },
  idempotencyKey: string
): Promise<PlaceOrderResult> {
  return client.request('/orders', {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: placeOrderResultSchema,
    headers: { 'Idempotency-Key': idempotencyKey },
    body: input,
  });
}

const orderItemSchema = z.object({ name: z.string(), unit: z.string(), quantity: z.number(), lineTotal: z.number() }).passthrough();

export const orderStatusSchema = z.enum([
  'PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED',
]);

const statusEventSchema = z.object({
  status: orderStatusSchema,
  at: z.string(),
  byRole: z.enum(['BUYER', 'SUPPLIER', 'DELIVERY_PARTNER', 'OPERATOR', 'ADMIN', 'SYSTEM']),
  note: z.string().optional(),
});

export const orderSchema = z
  .object({
    _id: z.string(),
    orderNumber: z.string(),
    items: z.array(orderItemSchema),
    deliveryAddress: z.object({ label: z.string(), fullAddress: z.string(), contactPhone: z.string() }).passthrough(),
    subtotal: z.number(),
    gstAmount: z.number(),
    total: z.number(),
    status: orderStatusSchema,
    deliveryMode: z.enum(['PLATFORM', 'SUPPLIER']).optional(),
    statusHistory: z.array(statusEventSchema).optional(),
    // Given to whoever delivers; the API sends it only until the order is delivered or cancelled
    deliveryOtp: z.string().optional(),
    // Usual delivery time, then the date the supplier confirmed (YYYY-MM-DD) once they accept
    expectedDelivery: z.object({ minDays: z.number(), maxDays: z.number() }).optional(),
    deliveryDate: z.string().optional(),
    onOrder: z.boolean().optional(),
    outOfArea: z.boolean().optional(),
    createdAt: z.string(),
  })
  .passthrough();
export type BuyerOrder = z.infer<typeof orderSchema>;

export async function fetchOrders(client: ApiClient, page = 1): Promise<{ data: BuyerOrder[]; meta: PaginationMeta }> {
  return client.requestPage('/orders', { auth: true, envelope: true, schema: z.array(orderSchema), query: { page } });
}

export async function fetchOrder(client: ApiClient, id: string): Promise<BuyerOrder> {
  return client.request(`/orders/${id}`, { auth: true, envelope: true, schema: orderSchema });
}

export async function cancelBuyerOrder(client: ApiClient, id: string, reason?: string): Promise<BuyerOrder> {
  return client.request(`/orders/${id}/cancel`, { method: 'POST', auth: true, envelope: true, schema: orderSchema, body: { reason } });
}
