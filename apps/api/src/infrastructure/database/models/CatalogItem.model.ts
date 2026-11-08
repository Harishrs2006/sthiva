import { Schema, model, Document, Types } from 'mongoose';

// One thing a buyer can order, e.g. "UltraTech PPC Cement 50 kg". Every supplier who sells it has
// their own listing (Product) linked here with their own price and stock; buyers see the item once.
// Suppliers can add items; ops check new ones (needsReview), fix them or merge duplicates.
export interface ICatalogItem extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  categoryId: Types.ObjectId;
  brand?: string;
  unit: 'KG' | 'TON' | 'PIECE' | 'BAG' | 'BUNDLE' | 'CUBIC_METER' | 'SQUARE_METER' | 'LITER' | 'METER' | 'BOX' | 'SHEET';
  description?: string;
  images: { url: string; publicId: string; altText?: string }[];
  specifications: Record<string, string>;
  gstRate: number;
  weightKgPerUnit?: number; // for picking a delivery vehicle; unknown until someone enters it
  status: 'ACTIVE' | 'INACTIVE';
  needsReview: boolean;
  mergedInto?: Types.ObjectId;
  createdBy: { role: 'SUPPLIER' | 'OPERATOR' | 'ADMIN' | 'SYSTEM'; userId?: Types.ObjectId };
  createdAt: Date;
  updatedAt: Date;
}

const catalogItemSchema = new Schema<ICatalogItem>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: String, trim: true, maxlength: 60 },
    unit: {
      type: String,
      enum: ['KG', 'TON', 'PIECE', 'BAG', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER', 'BOX', 'SHEET'],
      required: true,
    },
    description: { type: String, maxlength: 3000 },
    images: [{ _id: false, url: String, publicId: String, altText: String }],
    specifications: { type: Map, of: String, default: {} },
    gstRate: { type: Number, default: 18, min: 0, max: 40 },
    weightKgPerUnit: { type: Number, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    needsReview: { type: Boolean, default: false, index: true },
    mergedInto: { type: Schema.Types.ObjectId, ref: 'CatalogItem' },
    createdBy: {
      role: { type: String, enum: ['SUPPLIER', 'OPERATOR', 'ADMIN', 'SYSTEM'], required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

catalogItemSchema.index({ name: 'text', brand: 'text' });
catalogItemSchema.index({ categoryId: 1, status: 1 });

export const CatalogItem = model<ICatalogItem>('CatalogItem', catalogItemSchema);
