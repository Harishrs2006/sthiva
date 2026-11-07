// Sthiva material catalogue: what exists in the Indian market, how it is specified and how it is
// sold. It never carries prices or stock: those only ever come from supplier listings (the API).

// Units a supplier listing can use (apps/api Product.model.ts)
export type ListingUnit = 'KG' | 'TON' | 'PIECE' | 'BAG' | 'BUNDLE' | 'CUBIC_METER' | 'SQUARE_METER' | 'LITER' | 'METER' | 'BOX' | 'SHEET';

export type Spec = { label: string; value: string };
export type VariantGroup = { label: string; options: string[] };

// One way the trade buys this item, e.g. "Per tonne" or "Per brass (100 cft)"
export type SoldAs = { label: string; note?: string };

// Which quantity helper the material page shows
export type Calculator =
  | { kind: 'bulk'; densityTPerM3: number; material: string }
  | { kind: 'tmt' }
  | { kind: 'bags'; kgPerBag: number }
  | { kind: 'coil'; metresPerCoil: number }
  | { kind: 'count'; perLabel: string; per: number };

export type CatalogItem = {
  id: string; // url slug, unique across the catalogue
  name: string;
  categorySlug: string; // GET /categories slug
  group: string; // sub-group within the category, e.g. "Wires and cables"
  summary: string;
  uses: string[];
  standard?: string; // BIS standard the product is made to
  specs: Spec[];
  variants: VariantGroup[];
  soldAs: SoldAs[];
  brands: string[]; // well-known brands in the Indian market; availability depends on suppliers
  search: string; // text sent to GET /products?q= to find matching supplier listings
  aliases?: string[]; // other names the trade uses, matched against listing names
  image: string; // illustration in public/illustrations
  calculator?: Calculator;
  note?: string; // honest caveat shown on the page
  madeToOrder?: boolean; // measured and quoted by the supplier, who confirms the date after accepting
};

export type CatalogCategory = {
  slug: string;
  name: string; // fallback while GET /categories loads
  photo: string;
  tagline: string;
  groups: string[];
};
