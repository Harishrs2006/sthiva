import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Catalogue: laminates, doors, tiles and fittings',
  description: 'Laminates, doors, tiles, sanitaryware and fittings with photos from verified sellers near your site.',
  alternates: { canonical: '/catalogue' },
};

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
