'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient, type PaginationMeta } from '@sthiva/web-core';

// Client for apps/api's /ops routes (OPERATOR and ADMIN only). Shapes mirror ops.controller.ts.

const person = z.object({ _id: z.string(), name: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), isActive: z.boolean().optional() }).passthrough();
const ref = <T extends z.ZodTypeAny>(s: T) => z.union([s, z.string()]).nullable().optional();

export const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderSummarySchema = z
  .object({
    _id: z.string(),
    orderNumber: z.string(),
    status: z.enum(ORDER_STATUSES),
    total: z.number(),
    deliveryMode: z.enum(['PLATFORM', 'SUPPLIER']).optional(),
    allocation: z.object({ state: z.enum(['OFFERED', 'ACCEPTED', 'NEEDS_OPS']), expiresAt: z.string().optional() }).passthrough().optional(),
    driverOffer: z.object({ state: z.enum(['OFFERED', 'ASSIGNED', 'NEEDS_OPS']).optional(), expiresAt: z.string().optional() }).passthrough().optional(),
    deliveryIssue: z.object({ reason: z.string(), at: z.string(), byRole: z.string(), resolvedAt: z.string().optional(), resolution: z.string().optional() }).passthrough().optional(),
    paymentStatus: z.string(),
    paymentMethod: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    supplierId: ref(z.object({ _id: z.string(), businessName: z.string(), whatsappNumber: z.string().optional() }).passthrough()),
    buyerId: ref(person),
    driverId: ref(person),
  })
  .passthrough();
export type OrderSummary = z.infer<typeof orderSummarySchema>;

const itemSchema = z.object({ name: z.string(), unit: z.string(), quantity: z.number(), pricePerUnit: z.number(), lineTotal: z.number() }).passthrough();
const eventSchema = z.object({ status: z.string(), at: z.string(), byRole: z.string(), note: z.string().optional() }).passthrough();
const noteSchema = z.object({ at: z.string(), byRole: z.string(), note: z.string() }).passthrough();

export const orderDetailSchema = orderSummarySchema.extend({
  items: z.array(itemSchema),
  deliveryAddress: z
    .object({ label: z.string().optional(), fullAddress: z.string(), contactPhone: z.string(), pincode: z.string().optional(), district: z.string().optional(), state: z.string().optional() })
    .passthrough(),
  subtotal: z.number(),
  gstAmount: z.number(),
  deliveryCharge: z.number(),
  supplierTotal: z.number().optional(),
  commissionTotal: z.number().optional(),
  delivery: z.object({ vehicleName: z.string(), weightKg: z.number(), distanceKm: z.number(), driverSharePercent: z.number().optional() }).passthrough().optional(),
  earnings: z.object({
    deliveryCharge: z.number().optional(), driverPayout: z.number().nullable().optional(), sthivaDeliveryShare: z.number().nullable().optional(),
    orderValue: z.number(), payoutIfSthivaDelivers: z.number(), commissionIfSthivaDelivers: z.number(),
    payoutIfYouDeliver: z.number(), commissionIfYouDeliver: z.number(), expectedPayout: z.number().nullable(),
  }).optional(),
  serviceabilityCheck: z.string().optional(),
  cancellationReason: z.string().optional(),
  cancelledBy: z.string().optional(),
  codAmountCollected: z.number().optional(),
  statusHistory: z.array(eventSchema).optional(),
  opsNotes: z.array(noteSchema).optional(),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

const queue = z.array(orderSummarySchema);
export const summarySchema = z.object({
  counts: z.record(z.string(), z.number()),
  todayOrders: z.number(),
  thresholds: z.object({ CONFIRMED_MINUTES: z.number(), READY_UNASSIGNED_MINUTES: z.number(), ASSIGNED_MINUTES: z.number(), IN_DELIVERY_MINUTES: z.number() }),
  attention: z.object({ needsSupplier: queue, noDriver: queue, deliveryProblems: queue, notDispatched: queue, unassigned: queue, notPickedUp: queue, longInDelivery: queue, codPending: queue, uncheckedDestination: queue }),
});
export type OpsSummary = z.infer<typeof summarySchema>;

export const VERIFICATION = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type Verification = (typeof VERIFICATION)[number];

export const supplierSchema = z
  .object({
    _id: z.string(),
    businessName: z.string(),
    whatsappNumber: z.string().optional(),
    verificationStatus: z.enum(VERIFICATION),
    businessType: z.string().optional(),
    gstin: z.string().optional(),
    address: z.string().optional(),
    servicePincodes: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    brands: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    userId: ref(person),
  })
  .passthrough();
export type OpsSupplier = z.infer<typeof supplierSchema>;

export const driverSchema = z
  .object({
    _id: z.string(),
    vehicleType: z.string(),
    vehicleNumber: z.string(),
    serviceAreas: z.array(z.string()).optional(),
    isAvailable: z.boolean(),
    totalDeliveries: z.number().optional(),
    activeOrders: z.number(),
    verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
    licenseNumber: z.string().optional(),
    userId: ref(person),
  })
  .passthrough();
export type OpsDriver = z.infer<typeof driverSchema>;

// Suppliers who list items of an order (GET /ops/orders/:id/supplier-options)
export const supplierOptionSchema = z
  .object({
    supplier: z.object({ _id: z.string(), businessName: z.string(), whatsappNumber: z.string().optional(), verificationStatus: z.string().optional() }).passthrough(),
    lines: z.array(z.object({ basePrice: z.number(), stockQuantity: z.number(), unit: z.string() }).passthrough()),
    allItems: z.boolean(),
    enoughStock: z.boolean(),
    servesPincode: z.boolean().nullable(),
    current: z.boolean(),
    tried: z.array(z.string()),
  })
  .passthrough();
export type SupplierOption = z.infer<typeof supplierOptionSchema>;

// Populated refs come back as objects; anything else is an unpopulated id
export function populated<T extends object>(v: T | string | null | undefined): T | null {
  return v && typeof v === 'object' ? v : null;
}

type Query = Record<string, string | number | undefined>;
const get = <T>(client: ApiClient, path: string, schema: z.ZodType<T>, query?: Query) =>
  client.request(path, { auth: true, envelope: true, schema, query });
const send = <T>(client: ApiClient, method: 'POST' | 'PATCH', path: string, body: unknown, schema: z.ZodType<T>) =>
  client.request(path, { method, auth: true, envelope: true, schema, body });

export const opsApi = {
  summary: (c: ApiClient) => get(c, '/ops/summary', summarySchema),
  orders: (c: ApiClient, q: Query): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> =>
    c.requestPage('/ops/orders', { auth: true, envelope: true, schema: z.array(orderSummarySchema), query: q }),
  order: (c: ApiClient, id: string) => get(c, `/ops/orders/${id}`, orderDetailSchema),
  cancel: (c: ApiClient, id: string, body: { reason: string; restock?: boolean }) => send(c, 'POST', `/ops/orders/${id}/cancel`, body, z.unknown()),
  unassign: (c: ApiClient, id: string, reason: string) => send(c, 'POST', `/ops/orders/${id}/unassign`, { reason }, z.unknown()),
  assign: (c: ApiClient, id: string, driverUserId: string, note?: string) =>
    send(c, 'POST', `/ops/orders/${id}/assign`, { driverUserId, ...(note ? { note } : {}) }, z.unknown()),
  recordCod: (c: ApiClient, id: string, amount: number, note: string) => send(c, 'POST', `/ops/orders/${id}/cod`, { amount, note }, z.unknown()),
  addNote: (c: ApiClient, id: string, note: string) => send(c, 'POST', `/ops/orders/${id}/notes`, { note }, z.unknown()),
  supplierOptions: (c: ApiClient, id: string) => get(c, `/ops/orders/${id}/supplier-options`, z.array(supplierOptionSchema)),
  offer: (c: ApiClient, id: string, supplierId: string, reason: string) => send(c, 'POST', `/ops/orders/${id}/offer`, { supplierId, reason }, z.unknown()),
  markDelivered: (c: ApiClient, id: string, reason: string) => send(c, 'POST', `/ops/orders/${id}/deliver`, { reason }, z.unknown()),
  resolveProblem: (c: ApiClient, id: string, reason: string) => send(c, 'POST', `/ops/orders/${id}/resolve-problem`, { reason }, z.unknown()),
  nextSupplier: (c: ApiClient, id: string, reason: string) => send(c, 'POST', `/ops/orders/${id}/next-supplier`, { reason }, z.unknown()),
  verifyDriver: (c: ApiClient, id: string, status: 'VERIFIED' | 'REJECTED', note?: string) =>
    send(c, 'PATCH', `/ops/drivers/${id}/verification`, { status, ...(note ? { note } : {}) }, z.unknown()),
  drivers: (c: ApiClient) => get(c, '/ops/drivers', z.array(driverSchema)),
  suppliers: (c: ApiClient, verification?: Verification) => get(c, '/ops/suppliers', z.array(supplierSchema), { verification }),
  // Verification papers: view links expire after 10 minutes, so they are fetched only when opened
  documents: (c: ApiClient, id: string) => get(c, `/ops/suppliers/${id}/documents`, z.object({
    gstin: z.string().nullable(),
    documents: z.array(z.object({
      type: z.string(), label: z.string(), status: z.enum(['SUBMITTED', 'ACCEPTED', 'REJECTED']),
      note: z.string().optional(), uploadedAt: z.string().optional(), format: z.string().optional(), viewUrl: z.string(),
    })),
  })),
  reviewDocument: (c: ApiClient, id: string, type: string, status: 'ACCEPTED' | 'REJECTED', note?: string) =>
    send(c, 'PATCH', `/ops/suppliers/${id}/documents/${type}`, { status, ...(note ? { note } : {}) }, z.unknown()),
  verify: (c: ApiClient, id: string, status: 'VERIFIED' | 'REJECTED', note?: string) =>
    send(c, 'PATCH', `/ops/suppliers/${id}/verification`, { status, ...(note ? { note } : {}) }, supplierSchema),
};

// Platform settings (GET for ops, changes ADMIN only). Shapes mirror settings.controller.ts.
export const vehicleSchema = z
  .object({ _id: z.string(), code: z.string(), name: z.string(), maxLoadKg: z.number(), baseFare: z.number(), perKmRate: z.number(), isActive: z.boolean() })
  .passthrough();
export type Vehicle = z.infer<typeof vehicleSchema>;
export const commissionRowSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
  platformDeliveryPercent: z.number().nullable(),
  supplierDeliveryPercent: z.number().nullable(),
}).passthrough();
export type CommissionRow = z.infer<typeof commissionRowSchema>;
export const settingsSchema = z.object({
  categories: z.array(commissionRowSchema),
  vehicles: z.array(vehicleSchema),
  offerTimeoutMinutes: z.number().nullable(),
  driverSharePercent: z.number().nullable().optional(),
  driverOfferTimeoutMinutes: z.number().nullable().optional(),
});
export type PlatformSettings = z.infer<typeof settingsSchema>;
export type VehicleInput = Omit<Vehicle, '_id'>;

export const settingsApi = {
  get: (c: ApiClient) => get(c, '/ops/settings', settingsSchema),
  setCommission: (c: ApiClient, categoryId: string, body: { platformDeliveryPercent: number | null; supplierDeliveryPercent: number | null }) =>
    send(c, 'PATCH', `/ops/settings/commission/${categoryId}`, body, commissionRowSchema),
  addCategory: (c: ApiClient, body: { name: string; description?: string; sortOrder?: number }) =>
    send(c, 'POST', '/ops/settings/categories', body, z.unknown()),
  updateCategory: (c: ApiClient, id: string, body: Partial<{ name: string; description: string; sortOrder: number; isActive: boolean }>) =>
    send(c, 'PATCH', `/ops/settings/categories/${id}`, body, z.unknown()),
  addVehicle: (c: ApiClient, body: VehicleInput) => send(c, 'POST', '/ops/settings/vehicles', body, vehicleSchema),
  updateVehicle: (c: ApiClient, id: string, body: Partial<Omit<VehicleInput, 'code'>>) => send(c, 'PATCH', `/ops/settings/vehicles/${id}`, body, vehicleSchema),
  setGeneral: (c: ApiClient, body: { offerTimeoutMinutes?: number | null; driverSharePercent?: number | null; driverOfferTimeoutMinutes?: number | null }) =>
    send(c, 'PATCH', '/ops/settings/general', body, z.unknown()),
};

// Sthiva catalog (ops). Shapes mirror catalog.controller.ts.
export const UNITS = ['BAG', 'TON', 'KG', 'PIECE', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER'] as const;
export const catalogItemSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    brand: z.string().optional(),
    unit: z.string(),
    weightKgPerUnit: z.number().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    needsReview: z.boolean(),
    categoryId: ref(z.object({ _id: z.string(), name: z.string() }).passthrough()),
    createdBy: z.object({ role: z.string() }).passthrough().optional(),
    listings: z.number().optional(),
    liveListings: z.number().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();
export type OpsCatalogItem = z.infer<typeof catalogItemSchema>;
export type CatalogEdit = Partial<{ name: string; brand: string | null; weightKgPerUnit: number | null; status: 'ACTIVE' | 'INACTIVE'; needsReview: boolean }>;

export const catalogApi = {
  list: (c: ApiClient, q: Query): Promise<{ data: OpsCatalogItem[]; meta: PaginationMeta }> =>
    c.requestPage('/ops/catalog', { auth: true, envelope: true, schema: z.array(catalogItemSchema), query: q }),
  update: (c: ApiClient, id: string, body: CatalogEdit) => send(c, 'PATCH', `/ops/catalog/${id}`, body, catalogItemSchema),
  create: (c: ApiClient, body: { name: string; categoryId: string; unit: string; brand?: string; weightKgPerUnit?: number }) =>
    send(c, 'POST', '/ops/catalog', body, catalogItemSchema),
  merge: (c: ApiClient, id: string, intoId: string) => send(c, 'POST', `/ops/catalog/${id}/merge`, { intoId }, z.object({ moved: z.number() }).passthrough()),
};

// Settlements with suppliers and drivers. Shapes mirror settlement.service.ts.
export type Party = 'SUPPLIER' | 'DRIVER';
export const balanceSchema = z.object({
  party: z.enum(['SUPPLIER', 'DRIVER']), partyId: z.string(), partyName: z.string(),
  orders: z.number(), earned: z.number(), cashHeld: z.number(), net: z.number(), waitingForCash: z.number(),
});
export type Balance = z.infer<typeof balanceSchema>;
export const settlementSchema = z
  .object({
    _id: z.string(), number: z.string(), party: z.enum(['SUPPLIER', 'DRIVER']), partyName: z.string(),
    orders: z.array(z.object({ orderId: z.string(), orderNumber: z.string(), deliveredAt: z.string().optional(), earned: z.number(), cashHeld: z.number() })),
    earned: z.number(), cashHeld: z.number(), net: z.number(),
    status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
    reference: z.string().optional(), note: z.string().optional(), cancelReason: z.string().optional(),
    paidAt: z.string().optional(), createdAt: z.string(),
  })
  .passthrough();
export type Settlement = z.infer<typeof settlementSchema>;

export const settlementApi = {
  balances: (c: ApiClient, party: Party) => get(c, '/ops/settlements/balances', z.array(balanceSchema), { party }),
  list: (c: ApiClient, q: Query) => get(c, '/ops/settlements', z.array(settlementSchema), q),
  create: (c: ApiClient, party: Party, partyId: string) => send(c, 'POST', '/ops/settlements', { party, partyId }, settlementSchema),
  markPaid: (c: ApiClient, id: string, reference: string, note?: string) =>
    send(c, 'POST', `/ops/settlements/${id}/paid`, { reference, ...(note ? { note } : {}) }, settlementSchema),
  cancel: (c: ApiClient, id: string, reason: string) => send(c, 'POST', `/ops/settlements/${id}/cancel`, { reason }, settlementSchema),
};

// People and analytics (ops). Shapes mirror ops.controller.ts listUsers and analytics.service.ts.
export const ROLES = ['BUYER', 'SUPPLIER', 'DELIVERY_PARTNER', 'OPERATOR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];
export const personSchema = z
  .object({
    _id: z.string(), name: z.string(), phone: z.string().optional(), email: z.string().optional(),
    role: z.enum(ROLES), isActive: z.boolean(), createdAt: z.string(),
    orders: z.number().optional(), delivered: z.number().optional(),
  })
  .passthrough();
export type Person = z.infer<typeof personSchema>;
const rateRow = { id: z.string(), name: z.string(), offers: z.number(), accepted: z.number(), rejected: z.number(), expired: z.number(), delivered: z.number(), acceptRate: z.number().nullable() };
export const analyticsSchema = z.object({
  days: z.number(),
  totals: z.object({
    placed: z.number(), cancelled: z.number(), delivered: z.number(), sales: z.number(),
    supplierEarnings: z.number(), driverEarnings: z.number(), sthivaShare: z.number(), averageOrder: z.number().nullable(),
  }),
  cancelledBy: z.record(z.number()),
  series: z.array(z.object({ date: z.string(), placed: z.number(), delivered: z.number(), sales: z.number() })),
  topItems: z.array(z.object({ name: z.string(), unit: z.string(), quantity: z.number(), sales: z.number() })),
  suppliers: z.array(z.object({ ...rateRow, sales: z.number() })),
  drivers: z.array(z.object(rateRow)),
});
export type Analytics = z.infer<typeof analyticsSchema>;

export const peopleApi = {
  list: (c: ApiClient, q: Query): Promise<{ data: Person[]; meta: PaginationMeta }> =>
    c.requestPage('/ops/users', { auth: true, envelope: true, schema: z.array(personSchema), query: q }),
  setActive: (c: ApiClient, id: string, isActive: boolean, reason: string) =>
    send(c, 'PATCH', `/ops/users/${id}/active`, { isActive, reason }, z.unknown()),
  analytics: (c: ApiClient, days: number) => get(c, '/ops/analytics', analyticsSchema, { days }),
};

export type Load<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown };

// Fetches on mount and whenever `deps` change. `reload` refetches without flashing a skeleton.
export function useLoad<T>(fetcher: (c: ApiClient) => Promise<T>, deps: unknown[]) {
  const client = useApiClient();
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [key, setKey] = useState(0);
  const depKey = JSON.stringify(deps);
  useEffect(() => {
    let live = true;
    fetcher(client)
      .then((data) => live && setState({ status: 'success', data }))
      .catch((error) => live && setState({ status: 'error', error }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, depKey]);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  return { state, reload };
}

export function errorText(err: unknown, fallback = 'Something went wrong. Try again.') {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} days ago`;
}
