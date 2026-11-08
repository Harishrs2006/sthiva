import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  // The shared catalog item this listing sells (buyers see the item once, across suppliers)
  catalogItemId?: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  images: { url: string; publicId: string; altText?: string; isPrimary: boolean; sortOrder: number }[];
  unit: 'KG' | 'TON' | 'PIECE' | 'BAG' | 'BUNDLE' | 'CUBIC_METER' | 'SQUARE_METER' | 'LITER' | 'METER' | 'BOX' | 'SHEET';
  basePrice: number;
  bulkPricing: { minQty: number; price: number }[];
  minOrderQuantity: number;
  stockQuantity: number;
  lowStockAlert: number;
  availabilityConfirmedAt?: Date; // last weekly check that confirmed this listing's quantity and price
  weight?: number;
  specifications: Record<string, string>;
  tags: string[];
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  isFeatured: boolean;
  avgRating: number;
  totalReviews: number;
  totalSold: number;
  isGstInclusive: boolean;
  gstRate: number;
  deliveryDays: number;     // usual delivery time after the order is accepted: shortest, in days
  deliveryDaysMax?: number; // ...and longest (absent = same as deliveryDays)
  // IN_STOCK: the supplier has it. ON_ORDER: they get it from the company or make it (brand catalogue
  // tiles, custom woodwork); never runs out (stock held at ON_ORDER_STOCK), date confirmed after ordering.
  supply: 'IN_STOCK' | 'ON_ORDER';
  location: { lat: number; lng: number; address: string };
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', required: true, index: true },
    catalogItemId: { type: Schema.Types.ObjectId, ref: 'CatalogItem', index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true },
    shortDescription: String,
    images: [
      {
        url: String,
        publicId: String,
        altText: String,
        isPrimary: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    unit: {
      type: String,
      enum: ['KG', 'TON', 'PIECE', 'BAG', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER', 'BOX', 'SHEET'],
      default: 'PIECE',
    },
    basePrice: { type: Number, required: true, min: 0 },
    bulkPricing: [
      {
        _id: false,
        minQty: { type: Number, required: true, min: [0.001, 'Bulk tier quantity must be positive'] },
        price: { type: Number, required: true, min: [0.01, 'Bulk tier price must be positive'] },
      },
    ],
    minOrderQuantity: { type: Number, default: 1, min: 1 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockAlert: { type: Number, default: 10 },
    availabilityConfirmedAt: Date,
    weight: Number,
    specifications: { type: Map, of: String, default: {} },
    tags: [String],
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'],
      default: 'DRAFT',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    isGstInclusive: { type: Boolean, default: true },
    gstRate: { type: Number, default: 18, min: 0, max: 40 },
    deliveryDays: { type: Number, default: 2, min: 0, max: 90 },
    deliveryDaysMax: { type: Number, min: 0, max: 90 },
    supply: { type: String, enum: ['IN_STOCK', 'ON_ORDER'], default: 'IN_STOCK', index: true },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
  },
  { timestamps: true }
);

productSchema.index({ status: 1, isFeatured: -1, totalSold: -1 });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ supplierId: 1, status: 1 });
// A supplier lists each catalog item once
productSchema.index(
  { supplierId: 1, catalogItemId: 1 },
  { unique: true, name: 'one_listing_per_item', partialFilterExpression: { catalogItemId: { $type: 'objectId' } } }
);
productSchema.index({ name: 'text', shortDescription: 'text', tags: 'text' });

export const Product = model<IProduct>('Product', productSchema);

/** Stock an ON_ORDER listing always shows: it never runs out, so the usual stock checks just pass. */
export const ON_ORDER_STOCK = 1_000_000;
