'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { CATALOG_CATEGORIES, useApiClient, type ApiClient } from '@sthiva/web-core';

// GET /categories returns bare JSON (no { success, data } envelope), top-level categories only.
export const categorySchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    icon: z.string().optional(),
  })
  .passthrough();
export type Category = z.infer<typeof categorySchema>;

export async function fetchCategories(client: ApiClient, signal?: AbortSignal, timeoutMs?: number): Promise<Category[]> {
  return client.request('/categories', { schema: z.array(categorySchema), envelope: false, signal, timeoutMs });
}

// The built-in list (same names, slugs and photos as the shop's catalogue). Shown at once, so the home
// page never waits on, or fails with, the API; the live list replaces it as soon as it arrives.
export const BUILT_IN_CATEGORIES: Category[] = CATALOG_CATEGORIES.map((c) => ({ _id: c.slug, name: c.name, slug: c.slug }));

export type CategoriesState =
  | { status: 'loading' }
  | { status: 'success'; data: Category[] }
  | { status: 'error'; error: unknown };

export function useCategories(): CategoriesState {
  const client = useApiClient();
  // Never 'loading' or 'error' for visitors: start from the built-in list, then use the live one
  const [state, setState] = useState<CategoriesState>({ status: 'success', data: BUILT_IN_CATEGORIES });

  useEffect(() => {
    const controller = new AbortController();
    // A sleeping API host can take up to a minute to wake: one quick try, then one patient retry
    fetchCategories(client, controller.signal)
      .catch((err) => {
        if (controller.signal.aborted) throw err;
        return fetchCategories(client, controller.signal, 60_000);
      })
      .then((data) => { if (data.length > 0) setState({ status: 'success', data }); })
      .catch(() => { /* keep the built-in list */ });
    return () => controller.abort();
  }, [client]);

  return state;
}

// The design system forbids generic icons ("thick-stroke, sharp-cornered" Material Symbols
// only); real category data today stores an emoji in `icon`, so categories are mapped to a
// Material Symbol here by name instead of trusting that field.
const ICONS_BY_NAME: Record<string, string> = {
  'cement & concrete': 'foundation',
  'bricks & blocks': 'apartment',
  'sand & aggregates': 'landscape',
  'steel & tmt bars': 'fence',
  plumbing: 'plumbing',
  electricals: 'electrical_services',
  'paints & chemicals': 'format_paint',
  'plywood & timber': 'carpenter',
  'machines & tools': 'construction',
  'tiles & flooring': 'grid_on',
};
const FALLBACK_ICON = 'inventory_2';

export function categoryIcon(name: string): string {
  return ICONS_BY_NAME[name.trim().toLowerCase()] ?? FALLBACK_ICON;
}
