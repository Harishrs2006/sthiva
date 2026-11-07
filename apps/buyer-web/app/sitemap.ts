import type { MetadataRoute } from 'next';
import { CATALOG, CATALOG_CATEGORIES } from '@sthiva/web-core';
import { SITE } from '@/lib/site';
import { fetchProductIds } from '@/lib/server-api';

// Rebuilt every hour so new supplier listings reach search engines without a deploy
export const revalidate = 3600;

type Freq = 'daily' | 'weekly' | 'monthly';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const page = (path: string, changeFrequency: Freq, priority: number, lastModified = now) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  const products = await fetchProductIds();
  return [
    page('', 'daily', 1),
    ...CATALOG_CATEGORIES.map((c) => page(`/category/${c.slug}`, 'daily', 0.8)),
    ...CATALOG.map((i) => page(`/materials/${i.id}`, 'weekly', 0.6)),
    ...products.map((p) => page(`/product/${p._id}`, 'daily', 0.7, p.updatedAt ? new Date(p.updatedAt) : now)),
    ...['/terms', '/privacy', '/refunds', '/cookies', '/account-deletion'].map((path) => page(path, 'monthly', 0.3)),
  ];
}
