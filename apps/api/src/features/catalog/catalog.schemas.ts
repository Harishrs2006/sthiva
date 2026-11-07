import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectId = z.string().refine((v) => isValidObjectId(v), 'Invalid ID');
const UNITS = ['KG', 'TON', 'PIECE', 'BAG', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER', 'BOX', 'SHEET'] as const;

const fields = {
  name: z.string().trim().min(3).max(150),
  categoryId: objectId,
  brand: z.string().trim().min(1).max(60),
  unit: z.enum(UNITS),
  description: z.string().trim().max(3000),
  gstRate: z.number().refine((r) => [0, 5, 12, 18, 28].includes(r), 'GST must be 0, 5, 12, 18 or 28%'),
  weightKgPerUnit: z.number().finite().positive().max(1_00_000),
  images: z.array(z.object({ url: z.string().url().startsWith('https://'), publicId: z.string().min(1).max(300), altText: z.string().max(200).optional() })).max(8),
};

export const catalogCreateSchema = z.object(fields).partial({ brand: true, description: true, gstRate: true, weightKgPerUnit: true, images: true }).strict();

export const catalogUpdateSchema = z
  .object({
    ...fields,
    brand: fields.brand.nullable(),
    weightKgPerUnit: fields.weightKgPerUnit.nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    needsReview: z.boolean(),
  })
  .partial()
  .strict();

export const catalogMergeSchema = z.object({ intoId: objectId });
