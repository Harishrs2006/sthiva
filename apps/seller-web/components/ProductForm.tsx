'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useApiClient, catalogItems, catalogItem, deliveryTimeLabel, DELIVERY_TIME_PRESETS, matchCatalogItem, suggestedListingName, suggestedListingUnit, type CatalogItem,
} from '@sthiva/web-core';
import { useCategories } from '../lib/categories';
import { createSupplierProduct, productErrorText, searchSthivaItems, updateSupplierProduct, type ProductInput, type SthivaItem, type SupplierProduct } from '../lib/products';
import { GST_RATES, bulkPricingProblem, gstBreakdown } from '../lib/pricing';
import { ImageUploader, type ProductImage } from './ImageUploader';
import { rupees } from './ui';

const UNITS: { value: string; label: string; short: string }[] = [
  { value: 'BAG', label: 'Bag', short: 'bag' },
  { value: 'TON', label: 'Tonne', short: 'tonne' },
  { value: 'KG', label: 'Kilogram', short: 'kg' },
  { value: 'PIECE', label: 'Piece', short: 'piece' },
  { value: 'BUNDLE', label: 'Bundle', short: 'bundle' },
  { value: 'CUBIC_METER', label: 'Cubic metre (m³)', short: 'm³' },
  { value: 'SQUARE_METER', label: 'Square metre (m²)', short: 'm²' },
  { value: 'LITER', label: 'Litre', short: 'litre' },
  { value: 'METER', label: 'Metre', short: 'metre' },
  { value: 'BOX', label: 'Box', short: 'box' },
  { value: 'SHEET', label: 'Sheet', short: 'sheet' },
];

// specifications keys written by this form (the storefront shows them as the spec table)
const MATERIAL_KEY = 'Material';
const BRAND_KEY = 'Brand';
const MAX_TIERS = 5;

function brandOptions(catalogue: string[], mine: string[]) {
  const dealt = catalogue.filter((b) => mine.includes(b));
  return dealt.length > 0 ? dealt : catalogue;
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-[13px] text-lime">{n}</span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-[14px] text-stone">{hint}</p>}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Choice({ label, options, value, onChange, allowOther }: { label: string; options: string[]; value: string; onChange: (v: string) => void; allowOther?: boolean }) {
  const other = value !== '' && !options.includes(value);
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(value === o ? '' : o)}
            className={`min-h-[40px] rounded-full border px-3.5 text-[14px] font-medium transition-colors ${value === o ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
          >
            {o}
          </button>
        ))}
        {allowOther && (
          <input
            value={other ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Other"
            aria-label={`Other ${label.toLowerCase()}`}
            className={`h-10 w-36 rounded-full border px-4 text-[14px] outline-none transition-colors focus:border-ink ${other ? 'border-ink bg-sand-2' : 'border-sand-4 bg-sand'}`}
          />
        )}
      </div>
    </fieldset>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[14px] font-semibold">{label}</span>
      {children}
      {error ? <span className="text-[13px] text-error">{error}</span> : hint && <span className="text-[13px] text-stone">{hint}</span>}
    </label>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full border border-sand-4 bg-sand p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium transition-colors ${value === o.value ? 'bg-ink text-sand' : 'text-stone hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function initialItem(product: SupplierProduct | undefined): CatalogItem | undefined {
  if (!product) return undefined;
  const slug = product.categoryId?.slug;
  const byMaterial = slug ? catalogItems(slug).find((i) => i.name === product.specifications?.[MATERIAL_KEY]) : undefined;
  return byMaterial ?? matchCatalogItem(product.name, slug);
}

const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
const isWhole = (v: string) => v.trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= 0;

// How the listing will look to a buyer, updated as the seller types
function BuyerPreview({ name, brand, unit, price, gstRate, inclusive, tiers, stock, minOrder, deliveryDays, deliveryDaysMax, image }: {
  name: string; brand?: string; unit: string; price: number; gstRate: number; inclusive: boolean;
  tiers: { minQty: number; price: number }[]; stock: number; minOrder: number; deliveryDays: number; deliveryDaysMax: number; image?: string;
}) {
  const breakdown = gstBreakdown(price, gstRate, inclusive);
  // Only a bulk price the server would accept is shown as a deal
  const best = [...tiers].filter((t) => t.minQty >= 2 && t.price > 0 && t.price < price).sort((a, b) => a.price - b.price)[0];
  return (
    <div className="overflow-hidden rounded-2xl border border-sand-4 bg-sand-2">
      <div className="grid aspect-[4/3] place-items-center bg-sand-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[13px] text-stone">
            <span className="material-symbols-outlined text-[32px]" aria-hidden="true">add_a_photo</span>
            Your photo shows here
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        {brand && <p className="eyebrow text-stone">{brand}</p>}
        <p className="text-[16px] font-semibold leading-snug">{name || <span className="text-stone">Product name</span>}</p>
        <p className="font-display text-2xl font-bold tabular-nums">
          {breakdown ? rupees.format(breakdown.total) : '₹ -'}
          <span className="ml-1 text-[14px] font-medium text-stone">/ {unit}</span>
        </p>
        <p className="-mt-1 text-[13px] text-stone">incl. {gstRate}% GST{breakdown && gstRate > 0 ? ` (${rupees.format(breakdown.gst)})` : ''}</p>
        {best && <p className="rounded-lg bg-lime/60 px-2.5 py-1.5 text-[13px] font-medium">From {rupees.format(gstBreakdown(best.price, gstRate, inclusive)?.total ?? 0)} / {unit} on {best.minQty}+</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-stone">
          <span className={stock > 0 ? 'text-tertiary' : 'text-error'}>{stock > 0 ? 'In stock' : 'Out of stock'}</span>
          {minOrder > 1 && <span>Min {minOrder} {unit}</span>}
          <span>Delivery: {deliveryTimeLabel(deliveryDays, deliveryDaysMax).toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}

// `brands` are the brands the supplier said they deal in (business setup). When some of them make
// this material, only those are offered, with Other for anything else.
// `template` pre-fills a new listing from an existing one ("list another size").
// `sells` are the category slugs from business setup: shown first, and picked for you if there is only one.
export function ProductForm({ product, template, brands = [], sells = [] }: { product?: SupplierProduct; template?: SupplierProduct; brands?: string[]; sells?: string[] }) {
  const client = useApiClient();
  const router = useRouter();
  const categories = useCategories();
  const isEdit = !!product;
  const start = product ?? template;

  const [categoryId, setCategoryId] = useState(start?.categoryId?._id ?? '');
  const [itemId, setItemId] = useState<string | null>(initialItem(start)?.id ?? null);
  const [specs, setSpecs] = useState<Record<string, string>>(start?.specifications ?? {});
  const [name, setName] = useState(product?.name ?? '');
  const [nameTouched, setNameTouched] = useState(isEdit);
  const [description, setDescription] = useState(start?.description ?? '');
  const [unit, setUnit] = useState(start?.unit ?? '');
  const [basePrice, setBasePrice] = useState(start ? String(start.basePrice) : '');
  const [gstRate, setGstRate] = useState<number>(start?.gstRate ?? 18);
  const [inclusive, setInclusive] = useState<boolean>(start?.isGstInclusive ?? false);
  const [tiers, setTiers] = useState<{ minQty: string; price: string }[]>(
    (start?.bulkPricing ?? []).map((t) => ({ minQty: String(t.minQty), price: String(t.price) }))
  );
  // IN_STOCK: you have it. ON_ORDER: you order it from the company or make it; buyers are told it is in
  // process and you confirm the date within 24 hours
  const [supply, setSupply] = useState<'IN_STOCK' | 'ON_ORDER'>(product?.supply === 'ON_ORDER' ? 'ON_ORDER' : 'IN_STOCK');
  const onOrder = supply === 'ON_ORDER';
  const [stockQuantity, setStockQuantity] = useState(product && product.supply !== 'ON_ORDER' ? String(product.stockQuantity) : '');
  const [lowStockAlert, setLowStockAlert] = useState(start?.lowStockAlert !== undefined ? String(start.lowStockAlert) : '10');
  const [minOrderQuantity, setMinOrderQuantity] = useState(start?.minOrderQuantity ? String(start.minOrderQuantity) : '1');
  const [deliveryDays, setDeliveryDays] = useState(start?.deliveryDays !== undefined ? String(start.deliveryDays) : '2');
  const [deliveryDaysMax, setDeliveryDaysMax] = useState(
    start?.deliveryDaysMax !== undefined ? String(start.deliveryDaysMax) : start?.deliveryDays !== undefined ? String(start.deliveryDays) : '3'
  );
  const [images, setImages] = useState<ProductImage[]>(start?.images ?? []);
  const [submitting, setSubmitting] = useState<null | 'publish' | 'draft'>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  // The Sthiva item this listing sells (new listings only). Buyers see one item across suppliers.
  const [linked, setLinked] = useState<SthivaItem | null>(null);
  const [suggestions, setSuggestions] = useState<SthivaItem[]>([]);

  const ordered = categories.status === 'success'
    ? [...categories.data].sort((a, b) => Number(sells.includes(b.slug)) - Number(sells.includes(a.slug)))
    : [];
  useEffect(() => {
    if (start || categoryId || sells.length !== 1 || categories.status !== 'success') return;
    const only = categories.data.find((c) => c.slug === sells[0]);
    if (only) setCategoryId(only._id);
  }, [categories, sells, start, categoryId]);
  const category = categories.status === 'success' ? categories.data.find((c) => c._id === categoryId) : undefined;
  const items = useMemo(() => (category ? catalogItems(category.slug) : []), [category]);
  const item = itemId ? catalogItem(itemId) : undefined;
  const match = item && name.trim() ? matchCatalogItem(name, item.categorySlug) : undefined;

  // A template's name describes the old size: rebuild it from the catalogue once on load
  useEffect(() => {
    if (template && !product && item) {
      const choices = Object.fromEntries(item.variants.map((v) => [v.label, specs[v.label] || null]));
      setName(suggestedListingName(item, specs[BRAND_KEY] || null, choices));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Items already on Sthiva that look like what is being typed
  useEffect(() => {
    if (isEdit || linked || name.trim().length < 3) { setSuggestions([]); return; }
    let live = true;
    const t = setTimeout(() => {
      searchSthivaItems(client, name.trim(), categoryId || undefined)
        .then((r) => live && setSuggestions(r.slice(0, 5)))
        .catch(() => live && setSuggestions([]));
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [client, isEdit, linked, name, categoryId]);

  function sellExisting(s: SthivaItem) {
    touch();
    setLinked(s);
    setName(s.name);
    setNameTouched(true);
    setUnit(s.unit);
    // The item's category wins (the server enforces it too)
    if (typeof s.categoryId === 'string' && s.categoryId !== categoryId) { setCategoryId(s.categoryId); setItemId(null); }
    setSuggestions([]);
  }

  // Leaving with unsaved changes asks first
  useEffect(() => {
    if (!dirty || submitting) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, submitting]);

  const touch = () => setDirty(true);

  function autoName(nextItem: CatalogItem | undefined, nextSpecs: Record<string, string>) {
    if (!nextItem || nameTouched) return;
    const choices = Object.fromEntries(nextItem.variants.map((v) => [v.label, nextSpecs[v.label] || null]));
    setName(suggestedListingName(nextItem, nextSpecs[BRAND_KEY] || null, choices));
  }

  function pickCategory(id: string) {
    if (id === categoryId) return;
    touch();
    setCategoryId(id);
    setItemId(null);
    if (!isEdit) {
      setSpecs({});
      if (!nameTouched) setName('');
    }
  }

  function pickItem(next: CatalogItem) {
    touch();
    setItemId(next.id);
    const nextSpecs = { [MATERIAL_KEY]: next.name };
    setSpecs(nextSpecs);
    if (!isEdit || !unit) setUnit(suggestedListingUnit(next));
    autoName(next, nextSpecs);
  }

  function setSpec(key: string, value: string) {
    touch();
    const next = { ...specs };
    if (value) next[key] = value;
    else delete next[key];
    setSpecs(next);
    autoName(item, next);
  }

  // ─── Validation, shown next to each field and summed up in the save bar ───
  const price = num(basePrice);
  const minOrder = isWhole(minOrderQuantity) && Number(minOrderQuantity) >= 1 ? Number(minOrderQuantity) : 1;
  const tierValues = tiers.map((t) => ({ minQty: num(t.minQty), price: num(t.price) }));
  const tierProblem = tiers.length ? bulkPricingProblem(tierValues, price, minOrder) : null;
  const fieldErrors = {
    category: !categoryId ? 'Choose a category' : null,
    name: name.trim().length < 3 ? 'Give the product a name' : null,
    description: description.trim().length < 10 ? 'Describe it in at least 10 characters' : null,
    unit: !unit ? 'Choose how it is sold' : null,
    price: !(price > 0) ? 'Enter the price' : null,
    stock: stockQuantity !== '' && !isWhole(stockQuantity) ? 'Whole number, 0 or more' : null,
    minOrder: !(isWhole(minOrderQuantity) && Number(minOrderQuantity) >= 1) ? 'Whole number, 1 or more' : null,
    delivery: !(isWhole(deliveryDays) && Number(deliveryDays) <= 90 && isWhole(deliveryDaysMax) && Number(deliveryDaysMax) <= 90)
      ? 'Between 0 and 90 days'
      : Number(deliveryDaysMax) < Number(deliveryDays) ? 'The longest time must be at least the shortest' : null,
    lowStock: lowStockAlert !== '' && !isWhole(lowStockAlert) ? 'Whole number, 0 or more' : null,
    tiers: tierProblem,
  };
  const problems = Object.values(fieldErrors).filter(Boolean) as string[];
  const show = (key: keyof typeof fieldErrors) => (showProblems ? fieldErrors[key] : null);

  const unitShort = UNITS.find((u) => u.value === unit)?.short ?? 'unit';
  const unitMany = /[³²]|^kg$/.test(unitShort) ? unitShort : `${unitShort}s`;
  const breakdown = gstBreakdown(price, gstRate, inclusive);

  async function save(mode: 'publish' | 'draft') {
    setShowProblems(true);
    if (problems.length) {
      setError(`Before saving: ${problems.join(', ').toLowerCase()}.`);
      return;
    }
    setError(null);
    setSubmitting(mode);
    const cleanedSpecs = Object.fromEntries(Object.entries(specs).filter(([, v]) => v.trim() !== ''));
    const input: ProductInput = {
      ...(linked && !isEdit ? { catalogItemId: linked._id } : {}),
      name: name.trim(),
      categoryId,
      description: description.trim(),
      unit,
      basePrice: price,
      gstRate,
      isGstInclusive: inclusive,
      bulkPricing: tierValues,
      supply,
      // On order never runs out (the server keeps it available); in stock needs a real figure
      ...(onOrder ? {} : { stockQuantity: stockQuantity === '' ? 0 : Number(stockQuantity) }),
      lowStockAlert: lowStockAlert === '' ? 0 : Number(lowStockAlert),
      minOrderQuantity: Number(minOrderQuantity),
      deliveryDays: Number(deliveryDays),
      deliveryDaysMax: Number(deliveryDaysMax),
      specifications: cleanedSpecs,
      images,
    };
    try {
      let saved: SupplierProduct;
      if (isEdit) {
        const { categoryId: _c, ...edits } = input;
        // Publishing a draft makes it live (or out of stock); other edits keep the current status
        const status = mode === 'draft' ? 'DRAFT'
          : product!.status === 'DRAFT' ? (onOrder || (input.stockQuantity ?? 0) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK')
          : undefined;
        saved = await updateSupplierProduct(client, product!._id, status ? { ...edits, status } : edits);
      } else {
        saved = await createSupplierProduct(client, { ...input, status: mode === 'draft' ? 'DRAFT' : 'ACTIVE' });
      }
      setDirty(false);
      router.push(`/products?saved=${saved._id}&mode=${isEdit ? 'edit' : mode}`);
    } catch (err) {
      setError(productErrorText(err));
      setSubmitting(null);
    }
  }

  const preview = (
    <BuyerPreview
      name={name}
      brand={specs[BRAND_KEY]}
      unit={unitShort}
      price={price}
      gstRate={gstRate}
      inclusive={inclusive}
      tiers={tierValues}
      stock={onOrder ? 1 : isWhole(stockQuantity) ? Number(stockQuantity) : 0}
      minOrder={minOrder}
      deliveryDays={isWhole(deliveryDays) ? Number(deliveryDays) : 0}
      deliveryDaysMax={isWhole(deliveryDaysMax) ? Number(deliveryDaysMax) : 0}
      image={images.find((i) => i.isPrimary)?.url ?? images[0]?.url}
    />
  );

  let n = 0;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save('publish'); }} onChange={touch} className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <Step n={++n} title="What are you selling?" hint="Choose the category, then the exact material.">
          {categories.status === 'loading' && <div className="skeleton h-24" />}
          {categories.status === 'error' && <p className="text-[15px] text-error">Couldn&apos;t load categories. Refresh the page.</p>}
          {categories.status === 'success' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Category">
              {ordered.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  role="radio"
                  aria-checked={categoryId === c._id}
                  disabled={isEdit && categoryId !== c._id}
                  onClick={() => pickCategory(c._id)}
                  className={`min-h-[56px] rounded-xl border px-3 py-2.5 text-left text-[14px] font-semibold leading-tight transition-colors disabled:opacity-40 ${
                    categoryId === c._id ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'
                  }`}
                >
                  {c.name}
                  {sells.includes(c.slug) && categoryId !== c._id && <span className="mt-0.5 block text-[12px] font-normal text-stone">You sell this</span>}
                </button>
              ))}
            </div>
          )}
          {isEdit && <p className="-mt-2 text-[13px] text-stone">The category of a listing can&apos;t change. List it again in the other category if needed.</p>}
          {show('category') && <p className="-mt-2 text-[13px] text-error">{show('category')}</p>}

          {items.length > 0 && (
            <div>
              <p className="text-[14px] font-semibold">Material</p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Material">
                {items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    role="radio"
                    aria-checked={itemId === i.id}
                    onClick={() => pickItem(i)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${itemId === i.id ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
                  >
                    <span className="block text-[15px] font-semibold">{i.name}</span>
                    <span className={`mt-0.5 block text-[13px] ${itemId === i.id ? 'text-sand/70' : 'text-stone'}`}>
                      {i.group}{i.standard ? ` · ${i.standard}` : ''}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[13px] text-stone">Not in the list? Skip this and describe the product below.</p>
            </div>
          )}
        </Step>

        {item && (item.variants.length > 0 || item.brands.length > 0) && (
          <Step n={++n} title="Specification" hint="The same options buyers filter by on Sthiva.">
            {item.variants.map((v) => (
              <Choice key={v.label} label={v.label} options={v.options} value={specs[v.label] ?? ''} onChange={(val) => setSpec(v.label, val)} allowOther />
            ))}
            {item.brands.length > 0 ? (
              <Choice label="Brand" options={brandOptions(item.brands, brands)} value={specs[BRAND_KEY] ?? ''} onChange={(val) => setSpec(BRAND_KEY, val)} allowOther />
            ) : (
              <Field label="Brand or make (optional)" hint="For local products, the manufacturer or kiln name.">
                <input value={specs[BRAND_KEY] ?? ''} onChange={(e) => setSpec(BRAND_KEY, e.target.value)} className="field" />
              </Field>
            )}
          </Step>
        )}

        <Step n={++n} title="Listing details">
          <Field label="Product name" error={show('name')}>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameTouched(true); setLinked(null); }}
              placeholder="e.g. TATA Tiscon TMT bars Fe 550D 12 mm"
              maxLength={150}
              className="field"
            />
          </Field>
          {linked && (
            <div className="-mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-lime/40 px-3 py-2 text-[14px]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">link</span>
              <span className="flex-1">You&apos;re selling the Sthiva item <strong>{linked.name}</strong>. Buyers see it once, and Sthiva sends orders to the best supplier.</span>
              <button type="button" onClick={() => setLinked(null)} className="text-[13px] font-semibold underline">Not this</button>
            </div>
          )}
          {!isEdit && !linked && suggestions.length > 0 && (
            <div className="-mt-2 rounded-xl border border-sand-4 p-3">
              <p className="text-[14px] font-semibold">Already on Sthiva</p>
              <p className="text-[13px] text-stone">If it&apos;s one of these, pick it so buyers find all offers in one place.</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <li key={s._id} className="flex flex-wrap items-center gap-2 text-[14px]">
                    <span className="flex-1">{s.name} <span className="text-stone">· per {UNITS.find((u) => u.value === s.unit)?.short ?? s.unit}</span></span>
                    {s.myListingId ? (
                      <Link href={`/products/${s.myListingId}/edit`} className="text-[13px] font-semibold text-cobalt underline">You sell this: edit it</Link>
                    ) : (
                      <button type="button" onClick={() => sellExisting(s)} className="rounded-full border border-ink px-3 py-1 text-[13px] font-semibold hover:bg-ink hover:text-sand">Sell this</button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[13px] text-stone">Not listed? Carry on: your product becomes a new Sthiva item, checked by our team.</p>
            </div>
          )}
          {item && name.trim() && (
            match?.id === item.id ? (
              <p className="-mt-2 flex items-center gap-1.5 text-[14px] text-tertiary">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                Buyers will find this on the {item.name} page.
              </p>
            ) : (
              <p className="-mt-2 flex items-start gap-1.5 text-[14px] text-[#5C4300]">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                Include &ldquo;{item.name.replace(/\s*\(.*\)\s*$/, '')}&rdquo; in the name so buyers find it on that material&apos;s page.
              </p>
            )
          )}
          <Field label="Description" hint="Grade, size, packing, quality certificates, what is included." error={show('description')}>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={item ? item.summary : 'Describe the product for buyers'}
              maxLength={3000}
              className="field resize-y"
            />
          </Field>
        </Step>

        <Step n={++n} title="Price and GST" hint="Use the GST rate on your tax invoice for this item.">
          {item && (
            <p className="flex flex-wrap items-center gap-2 text-[14px] text-stone">
              <span>Usually sold</span>
              {item.soldAs.map((s) => <span key={s.label} className="rounded-full bg-sand-3 px-2.5 py-1 text-[13px] text-ink">{s.label.replace(/^Per /, 'per ')}</span>)}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sold per" error={show('unit')}>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} disabled={isEdit || !!linked} className="field">
                <option value="" disabled>Choose a unit</option>
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Field>
            <Field label={`Your price per ${unitShort} (₹)`} error={show('price')}>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" className="field font-mono" />
            </Field>
          </div>

          <fieldset>
            <legend className="text-[14px] font-semibold">GST rate</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {GST_RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={gstRate === r}
                  onClick={() => { touch(); setGstRate(r); }}
                  className={`min-h-[40px] min-w-[56px] rounded-full border px-3.5 font-mono text-[14px] transition-colors ${gstRate === r ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold">The price you typed</span>
            <Segmented
              label="Is GST included in your price?"
              value={inclusive ? 'in' : 'out'}
              options={[{ value: 'out', label: 'GST added on top' }, { value: 'in', label: 'Already includes GST' }]}
              onChange={(v) => { touch(); setInclusive(v === 'in'); }}
            />
          </div>

          {breakdown && (
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-ink p-4 text-sand">
              <div>
                <p className="text-[12px] text-sand/60">Taxable value</p>
                <p className="mt-1 font-mono text-[15px]">{rupees.format(breakdown.taxable)}</p>
              </div>
              <div>
                <p className="text-[12px] text-sand/60">GST {gstRate}%</p>
                <p className="mt-1 font-mono text-[15px]">{rupees.format(breakdown.gst)}</p>
              </div>
              <div>
                <p className="text-[12px] text-lime">Buyer pays per {unitShort}</p>
                <p className="mt-1 font-mono text-[17px] font-semibold text-lime">{rupees.format(breakdown.total)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-sand-4 pt-5">
            <div>
              <p className="text-[14px] font-semibold">Bulk prices <span className="font-normal text-stone">(optional)</span></p>
              <p className="mt-0.5 text-[13px] text-stone">A lower price per {unitShort} for big orders, e.g. from 100 {unitMany}. Same GST setting as above.</p>
            </div>
            {tiers.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] text-stone">From</span>
                <input
                  value={t.minQty}
                  onChange={(e) => setTiers((x) => x.map((y, j) => (j === i ? { ...y, minQty: e.target.value.replace(/\D/g, '') } : y)))}
                  inputMode="numeric"
                  placeholder="100"
                  className="field h-11 w-24 font-mono"
                  aria-label={`Bulk price ${i + 1}: from quantity`}
                />
                <span className="text-[14px] text-stone">{unitMany}, ₹</span>
                <input
                  value={t.price}
                  onChange={(e) => setTiers((x) => x.map((y, j) => (j === i ? { ...y, price: e.target.value.replace(/[^\d.]/g, '') } : y)))}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="field h-11 w-28 font-mono"
                  aria-label={`Bulk price ${i + 1}: price per ${unitShort}`}
                />
                <span className="text-[14px] text-stone">per {unitShort}</span>
                <button type="button" onClick={() => { touch(); setTiers((x) => x.filter((_, j) => j !== i)); }} className="grid h-11 w-11 place-items-center rounded-full text-stone hover:bg-sand-3 hover:text-ink" aria-label={`Remove bulk price ${i + 1}`}>
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            ))}
            {tierProblem && tiers.some((t) => t.minQty && t.price) && <p className="text-[13px] text-error">{tierProblem}</p>}
            {tiers.length < MAX_TIERS && (
              <button type="button" onClick={() => { touch(); setTiers((x) => [...x, { minQty: '', price: '' }]); }} className="btn-ghost h-11 self-start px-4">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
                Add a bulk price
              </button>
            )}
          </div>
        </Step>

        <Step n={++n} title="Stock and delivery">
          <div className="mb-5 flex flex-col gap-2">
            <Segmented
              label="Do you have it?"
              value={supply}
              onChange={(v) => { touch(); setSupply(v); }}
              options={[{ value: 'IN_STOCK', label: 'In stock with me' }, { value: 'ON_ORDER', label: 'On order (from the company or made to order)' }]}
            />
            <p className="text-[13px] text-stone">
              {onOrder
                ? 'Buyers can order any quantity. Their order shows "in process" and you confirm the delivery date within 24 hours.'
                : 'Buyers see your stock and your usual delivery time.'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {!onOrder && (
              <>
                <Field label={`In stock now (${unitMany})`} hint="Buyers can't order more than this. 0 shows it as out of stock." error={show('stock')}>
                  <input type="number" inputMode="numeric" min="0" step="1" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="0" className="field font-mono" />
                </Field>
                <Field label={`Warn me below (${unitMany})`} hint="Your Stock page flags it when stock falls to this." error={show('lowStock')}>
                  <input type="number" inputMode="numeric" min="0" step="1" value={lowStockAlert} onChange={(e) => setLowStockAlert(e.target.value)} className="field font-mono" />
                </Field>
              </>
            )}
            <Field label={`Minimum order (${unitMany})`} error={show('minOrder')}>
              <input type="number" inputMode="numeric" min="1" step="1" value={minOrderQuantity} onChange={(e) => setMinOrderQuantity(e.target.value)} className="field font-mono" />
            </Field>
          </div>
          <div className="mt-5">
            <p className="text-[14px] font-semibold">Usual delivery time</p>
            <p className="mt-0.5 text-[13px] text-stone">
              Counted from when you accept an order. Buyers see it on the listing; you confirm the exact date when you accept.
              {item?.madeToOrder ? ' Made-to-order work usually takes weeks.' : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Usual delivery time">
              {DELIVERY_TIME_PRESETS.map((p) => {
                const active = String(p.min) === deliveryDays && String(p.max) === deliveryDaysMax;
                return (
                  <button
                    key={p.label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => { touch(); setDeliveryDays(String(p.min)); setDeliveryDaysMax(String(p.max)); }}
                    className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${active ? 'bg-ink text-sand' : 'border border-sand-4 bg-sand hover:border-ink'}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
              <Field label="From (days)" error={show('delivery')}>
                <input type="number" inputMode="numeric" min="0" max="90" step="1" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} className="field font-mono" />
              </Field>
              <Field label="To (days)">
                <input type="number" inputMode="numeric" min="0" max="90" step="1" value={deliveryDaysMax} onChange={(e) => setDeliveryDaysMax(e.target.value)} className="field font-mono" />
              </Field>
            </div>
          </div>
        </Step>

        <Step n={++n} title="Photos" hint="Real photos of your stock. The first one is shown in search.">
          <ImageUploader images={images} onChange={(next) => { touch(); setImages(next); }} />
        </Step>

        {/* phones have no side column: the preview folds in at the end of the form */}
        <details className="card p-5 lg:hidden">
          <summary className="cursor-pointer text-[15px] font-semibold">See what buyers see</summary>
          <div className="mt-4">{preview}</div>
        </details>

        {error && <p role="alert" className="card border-error/40 px-5 py-4 text-[15px] text-error">{error}</p>}
      </div>

      <aside className="hidden lg:block" aria-label="Preview">
        <div className="sticky top-24 flex flex-col gap-3">
          <p className="eyebrow text-stone">What buyers see</p>
          {preview}
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-4 bg-sand/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:px-6 max-sm:mb-[84px]">
          <p className="min-w-0 flex-1 text-[13px] text-stone">
            {problems.length === 0 ? (
              breakdown ? <>Buyers pay <span className="font-mono font-semibold text-ink">{rupees.format(breakdown.total)}</span> per {unitShort}</> : 'Ready to save'
            ) : (
              <span className={showProblems ? 'text-error' : ''}>{problems.length} thing{problems.length === 1 ? '' : 's'} left: {problems[0].toLowerCase()}</span>
            )}
          </p>
          <Link href="/products" className="btn-ghost max-sm:hidden">Cancel</Link>
          {(!isEdit || product?.status === 'DRAFT') && (
            <button type="button" onClick={() => save('draft')} disabled={!!submitting} className="btn-ghost">
              {submitting === 'draft' ? 'Saving' : 'Save draft'}
            </button>
          )}
          <button type="submit" disabled={!!submitting} className="btn-lime px-6">
            {submitting === 'publish' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]" aria-hidden="true">progress_activity</span>
                Saving
              </>
            ) : isEdit && product?.status !== 'DRAFT' ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </div>
    </form>
  );
}
