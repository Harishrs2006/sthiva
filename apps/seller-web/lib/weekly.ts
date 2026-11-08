import { z } from 'zod';
import type { ApiClient } from '@sthiva/web-core';

// Weekly availability check. Shapes mirror apps/api features/suppliers/weekly.ts.
export const weeklySchema = z.object({
  weekStart: z.string(),
  // End of Monday: confirm by then or buyers stop seeing your items until you do
  deadline: z.string(),
  hidden: z.boolean(),
  confirmedAt: z.string().nullable(),
  confirmedThisWeek: z.boolean(),
  canDeliver: z.boolean(),
  items: z.array(z.object({
    _id: z.string(), name: z.string(), unit: z.string(), stockQuantity: z.number(), basePrice: z.number(), supply: z.enum(['IN_STOCK', 'ON_ORDER']).optional(),
    status: z.string(), minOrderQuantity: z.number().optional(),
  }).passthrough()),
});
export type Weekly = z.infer<typeof weeklySchema>;

export function fetchWeekly(client: ApiClient): Promise<Weekly> {
  return client.request('/suppliers/me/weekly', { auth: true, envelope: true, schema: weeklySchema });
}

export function confirmWeekly(client: ApiClient, items: { productId: string; stockQuantity: number; basePrice: number }[]) {
  return client.request('/suppliers/me/weekly', {
    method: 'POST', auth: true, envelope: true, body: { items },
    schema: z.object({ confirmedAt: z.string(), items: z.number() }),
  });
}
