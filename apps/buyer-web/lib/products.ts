'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useApiClient, type ApiClient } from '@sthiva/web-core';

// GET /products/:id — bare JSON (no envelope), like GET /products.
const imageSchema = z.object({ url: z.string(), isPrimary: z.boolean().optional() }).passthrough();
const supplierSchema = z
  .object({
    _id: z.string(),
    businessName: z.string(),
    avgRating: z.number().optional(),
    verificationStatus: z.string().optional(),
  })
  .passthrough();
const categoryRefSchema = z.object({ _id: z.string(), name: z.string(), slug: z.string() }).passthrough();

export const productDetailSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    unit: z.string(),
    basePrice: z.number(),
    bulkPricing: z.array(z.object({ minQty: z.number(), price: z.number() })).optional(),
    minOrderQuantity: z.number().optional(),
    stockQuantity: z.number().optional(),
    deliveryDays: z.number().optional(),
    deliveryDaysMax: z.number().optional(),
    // IN_STOCK, or ON_ORDER (company order or made for you: in process until the supplier confirms)
    supply: z.enum(['IN_STOCK', 'ON_ORDER']).optional(),
    // Straight-line km from the buyer's PIN to this supplier (lists with a PIN only)
    distanceKm: z.number().nullable().optional(),
    specifications: z.record(z.string(), z.string()).optional(),
    images: z.array(imageSchema).optional(),
    supplierId: supplierSchema.nullable().optional(),
    categoryId: categoryRefSchema.nullable().optional(),
    avgRating: z.number().optional(),
    totalReviews: z.number().optional(),
    // Present only when a PIN was given to the API
    availability: z.object({ deliverable: z.boolean(), reason: z.string().optional() }).optional(),
  })
  .passthrough();
export type ProductDetail = z.infer<typeof productDetailSchema>;

export async function fetchProduct(
  client: ApiClient,
  id: string,
  pincode?: string | null,
  signal?: AbortSignal
): Promise<ProductDetail> {
  return client.request(`/products/${id}`, {
    query: { pincode: pincode ?? undefined },
    schema: productDetailSchema,
    envelope: false,
    signal,
  });
}

export type ProductDetailState =
  | { status: 'loading' }
  | { status: 'success'; data: ProductDetail }
  | { status: 'error'; error: unknown };

export function useProduct(id: string, pincode?: string | null): ProductDetailState {
  const client = useApiClient();
  const [state, setState] = useState<ProductDetailState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchProduct(client, id, pincode, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [client, id, pincode]);

  return state;
}
