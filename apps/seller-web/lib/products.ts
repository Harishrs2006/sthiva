'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { ApiClientError, useApiClient, type ApiClient, type PaginationMeta } from '@sthiva/web-core';

const imageSchema = z.object({ url: z.string(), publicId: z.string(), isPrimary: z.boolean().optional(), sortOrder: z.number().optional() });

export const supplierProductSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    shortDescription: z.string().optional(),
    unit: z.string(),
    basePrice: z.number(),
    stockQuantity: z.number(),
    minOrderQuantity: z.number().optional(),
    deliveryDays: z.number().optional(),
    deliveryDaysMax: z.number().optional(),
    supply: z.enum(['IN_STOCK', 'ON_ORDER']).optional(),
    gstRate: z.number().optional(),
    isGstInclusive: z.boolean().optional(),
    bulkPricing: z.array(z.object({ minQty: z.number(), price: z.number() })).optional(),
    lowStockAlert: z.number().optional(),
    specifications: z.record(z.string(), z.string()).optional(),
    images: z.array(imageSchema).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']),
    // Every supplier product response populates the category (list, get, create and edit)
    categoryId: z.object({ _id: z.string(), name: z.string(), slug: z.string() }).nullable().optional(),
  })
  .passthrough();
export type SupplierProduct = z.infer<typeof supplierProductSchema>;

export type ProductInput = {
  // An item already on Sthiva; without it the server matches by name or starts a new item
  catalogItemId?: string;
  name: string;
  categoryId: string;
  description: string;
  unit: string;
  basePrice: number;
  stockQuantity?: number;
  minOrderQuantity?: number;
  deliveryDays?: number;
  deliveryDaysMax?: number;
  supply?: 'IN_STOCK' | 'ON_ORDER';
  gstRate?: number;
  isGstInclusive?: boolean;
  bulkPricing?: { minQty: number; price: number }[];
  lowStockAlert?: number;
  specifications?: Record<string, string>;
  images?: { url: string; publicId: string; isPrimary?: boolean; sortOrder?: number }[];
};

export async function fetchSupplierProducts(
  client: ApiClient,
  opts: { page?: number; status?: string; q?: string; lowStock?: boolean } = {}
): Promise<{ data: SupplierProduct[]; meta: PaginationMeta }> {
  return client.requestPage('/suppliers/me/products', {
    auth: true,
    envelope: true,
    schema: z.array(supplierProductSchema),
    query: { page: opts.page, status: opts.status, q: opts.q || undefined, lowStock: opts.lowStock ? 1 : undefined },
  });
}

export async function fetchSupplierProduct(client: ApiClient, id: string): Promise<SupplierProduct> {
  return client.request(`/suppliers/me/products/${id}`, { auth: true, envelope: true, schema: supplierProductSchema });
}

// Items on Sthiva a supplier can sell (shared across suppliers); myListingId = they already list it
export const sthivaItemSchema = z
  .object({ _id: z.string(), name: z.string(), brand: z.string().optional(), unit: z.string(), myListingId: z.string().nullable() })
  .passthrough();
export type SthivaItem = z.infer<typeof sthivaItemSchema>;

export async function searchSthivaItems(client: ApiClient, q: string, categoryId?: string): Promise<SthivaItem[]> {
  return client.request('/suppliers/me/catalog', {
    auth: true, envelope: true, schema: z.array(sthivaItemSchema), query: { q, ...(categoryId ? { categoryId } : {}) },
  });
}

export async function createSupplierProduct(client: ApiClient, input: ProductInput & { status?: 'DRAFT' | 'ACTIVE' }): Promise<SupplierProduct> {
  return client.request('/suppliers/me/products', {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: supplierProductSchema,
    body: input,
  });
}

export async function updateSupplierProduct(
  client: ApiClient,
  id: string,
  input: Partial<ProductInput> & { status?: string }
): Promise<SupplierProduct> {
  return client.request(`/suppliers/me/products/${id}`, {
    method: 'PATCH',
    auth: true,
    envelope: true,
    schema: supplierProductSchema,
    body: input,
  });
}

export async function discontinueSupplierProduct(client: ApiClient, id: string): Promise<void> {
  await client.request(`/suppliers/me/products/${id}`, {
    method: 'DELETE',
    auth: true,
    envelope: true,
    schema: z.object({ message: z.string() }),
  });
}

export type ProductListState =
  | { status: 'loading' }
  | { status: 'success'; products: SupplierProduct[]; meta: PaginationMeta }
  | { status: 'error'; error: unknown };

// The API answers a bad form with { details: [{ field, message }] }: show the first reason, not "Validation failed"
export function productErrorText(err: unknown, fallback = 'Could not save. Check the fields and try again.'): string {
  if (err instanceof ApiClientError) {
    const first = Array.isArray(err.details) ? (err.details[0] as { message?: string } | undefined)?.message : undefined;
    return first ?? (err.message || fallback);
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

export function useSupplierProducts(page: number, statusFilter?: string, opts: { q?: string; lowStock?: boolean } = {}) {
  const client = useApiClient();
  const [state, setState] = useState<ProductListState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchSupplierProducts(client, { page, status: statusFilter, q: opts.q, lowStock: opts.lowStock })
      .then(({ data, meta }) => setState({ status: 'success', products: data, meta }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client, page, statusFilter, opts.q, opts.lowStock, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
