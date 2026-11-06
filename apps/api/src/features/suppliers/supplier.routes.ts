import { supplierSettlements } from '../settlements/settlement.controller';
import { myDocuments, uploadDocument, documentUpload } from './documents';
import { getWeekly, confirmWeekly, weeklyConfirmSchema } from './weekly';
import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { supplierStatusSchema, codCollectedSchema, problemSchema } from '../orders/order.schemas';
import {
  getProfile, updateProfile, getStats, getAnalytics,
  listSupplierOrders, updateOrderStatus, confirmCodCollected,
  listSupplierProducts, getSupplierProduct, createProduct, updateProduct, deleteProduct,
  acceptOrder, rejectOrder, reportProblem, changeDeliveryDate,
} from './supplier.controller';
import { z } from 'zod';
import {
  listServicePincodes, addServicePincodes, removeServicePincode, previewServicePincode,
} from '../serviceability/service-pincodes.controller';
import { MAX_PINCODES_PER_REQUEST } from '../serviceability/serviceability.service';
import { bulkPricingProblem } from './product-rules';
import { supplierSearch } from '../catalog/catalog.controller';

// Strings are format-checked per item in the controller so each bad entry gets its own reason
const addPincodesSchema = z.object({
  pincodes: z.array(z.string().max(20)).min(1).max(MAX_PINCODES_PER_REQUEST),
});

// GSTIN: 2-digit state code, 10-character PAN, entity number, 'Z', check character
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Everything a supplier may change about their own profile; unknown fields are rejected
export const updateProfileSchema = z
  .object({
    businessName: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000),
    whatsappNumber: z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number'),
    deliveryRadiusKm: z.number().int().min(1).max(500),
    serviceAreas: z.array(z.string().trim().min(1).max(80)).max(50),
    businessType: z.enum(['RETAILER', 'DEALER', 'DISTRIBUTOR', 'MANUFACTURER']),
    gstin: z.union([z.literal(''), z.string().trim().toUpperCase().regex(GSTIN_RE, 'Enter a valid 15-character GSTIN')]),
    address: z.string().trim().max(300),
    categories: z.array(z.string().trim().regex(/^[a-z0-9-]{2,60}$/)).max(20),
    brands: z.array(z.string().trim().min(1).max(60)).max(60),
    canDeliver: z.boolean(),
    // Pickup point (shop or yard), to price delivery by distance
    location: z.object({ lat: z.number().min(6).max(38), lng: z.number().min(68).max(98) }, { invalid_type_error: 'Location must be inside India' }),
  })
  .partial()
  .strict();

// GST slabs in force for building materials (cement, steel, tiles, paint, pipes, wires...)
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export const PRODUCT_UNITS = ['KG', 'TON', 'PIECE', 'BAG', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER'] as const;
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

const productFields = {
  // Pick an item from the Sthiva catalog; without it a new catalog item is created from this listing
  catalogItemId: objectId,
  brand: z.string().trim().min(1).max(60),
  name: z.string().trim().min(3, 'Name is too short').max(150),
  categoryId: objectId,
  description: z.string().trim().min(10, 'Describe the product in at least 10 characters').max(3000),
  shortDescription: z.string().trim().max(200),
  unit: z.enum(PRODUCT_UNITS),
  basePrice: z.number().positive('Price must be more than 0').max(10_000_000),
  gstRate: z.number().refine((r) => (GST_RATES as readonly number[]).includes(r), 'GST must be 0, 5, 12, 18 or 28%'),
  isGstInclusive: z.boolean(),
  stockQuantity: z.number().int('Stock must be a whole number').min(0).max(10_000_000),
  minOrderQuantity: z.number().int().min(1).max(100_000),
  // Usual delivery time after accepting an order, as a range of days (woodwork can take weeks)
  deliveryDays: z.number().int().min(0).max(90),
  deliveryDaysMax: z.number().int().min(0).max(90),
  lowStockAlert: z.number().int().min(0).max(10_000_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  specifications: z.record(z.string().trim().min(1).max(60), z.string().trim().max(200))
    .refine((o) => Object.keys(o).length <= 30, 'Too many specifications'),
  images: z.array(z.object({
    url: z.string().url().startsWith('https://'),
    publicId: z.string().min(1).max(300),
    altText: z.string().max(200).optional(),
    isPrimary: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(50).optional(),
  })).max(8, 'Up to 8 photos'),
  // Cheaper unit price from a quantity upwards, e.g. 100+ bags at ₹365
  bulkPricing: z.array(z.object({
    minQty: z.number().int().min(2, 'A bulk price starts at 2 or more'),
    price: z.number().positive().max(10_000_000),
  })).max(5, 'Up to 5 bulk prices'),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']),
};

export const createProductSchema = z
  .object({
    ...productFields,
    // A new listing is either published or kept as a draft; the server decides live vs out of stock
    status: z.enum(['DRAFT', 'ACTIVE']),
  })
  .partial({ catalogItemId: true, brand: true, shortDescription: true, gstRate: true, isGstInclusive: true, stockQuantity: true, minOrderQuantity: true,
    deliveryDays: true, deliveryDaysMax: true, lowStockAlert: true, tags: true, specifications: true, images: true, bulkPricing: true, status: true })
  .strict()
  .superRefine((v, ctx) => {
    const problem = bulkPricingProblem(v.bulkPricing, v.basePrice, v.minOrderQuantity);
    if (problem) ctx.addIssue({ code: 'custom', path: ['bulkPricing'], message: problem });
    if (v.deliveryDays !== undefined && v.deliveryDaysMax !== undefined && v.deliveryDaysMax < v.deliveryDays) {
      ctx.addIssue({ code: 'custom', path: ['deliveryDaysMax'], message: 'The longest delivery time cannot be shorter than the shortest' });
    }
  });

// Category, catalog item and brand are fixed once listed (ops can re-link or merge items)
export const updateProductSchema = z.object(productFields).omit({ categoryId: true, catalogItemId: true, brand: true }).partial().strict()
  .refine((v) => v.deliveryDays === undefined || v.deliveryDaysMax === undefined || v.deliveryDaysMax >= v.deliveryDays,
    { path: ['deliveryDaysMax'], message: 'The longest delivery time cannot be shorter than the shortest' });

const router = Router();

// Supplier-only; every handler resolves the caller's own SupplierProfile
router.use(requireAuth, requireRole('SUPPLIER'));

router.get('/me', getProfile);
router.patch('/me', validate(updateProfileSchema), updateProfile);
router.get('/me/stats', getStats);
router.get('/me/analytics', getAnalytics);
router.get('/me/settlements', supplierSettlements);
router.get('/me/documents', myDocuments);
router.get('/me/weekly', getWeekly);
router.post('/me/weekly', validate(weeklyConfirmSchema), confirmWeekly);
router.post('/me/documents', documentUpload, uploadDocument);

router.get('/me/orders', listSupplierOrders);
// Orders are offered to one supplier at a time: accept, or reject so the next supplier gets it
const rejectSchema = z.object({ reason: z.string().trim().min(3, 'Tell us why (at least 3 characters)').max(300) });
// deliveryDate: the date the supplier commits to (YYYY-MM-DD); optional so older app versions still work
const acceptSchema = z.object({ deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a delivery date').optional() }).strict();
const deliveryDateSchema = z.object({ deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a delivery date') }).strict();
router.post('/me/orders/:id/accept', validate(acceptSchema), acceptOrder);
router.patch('/me/orders/:id/delivery-date', validate(deliveryDateSchema), changeDeliveryDate);
router.post('/me/orders/:id/reject', validate(rejectSchema), rejectOrder);
router.post('/me/orders/:id/problem', validate(problemSchema), reportProblem);
router.patch('/me/orders/:id/status', validate(supplierStatusSchema), updateOrderStatus);
router.post('/me/orders/:id/cod', validate(codCollectedSchema), confirmCodCollected);

// Sthiva catalog search, to list an existing item instead of creating a duplicate
router.get('/me/catalog', supplierSearch);

router.get('/me/products', listSupplierProducts);
router.get('/me/products/:id', getSupplierProduct);
router.post('/me/products', validate(createProductSchema), createProduct);
router.patch('/me/products/:id', validate(updateProductSchema), updateProduct);
router.delete('/me/products/:id', deleteProduct);

// Delivery coverage (PIN codes this supplier serves)
router.get('/me/service-pincodes', listServicePincodes);
router.post('/me/service-pincodes', validate(addPincodesSchema), addServicePincodes);
router.get('/me/service-pincodes/:pincode', previewServicePincode);
router.delete('/me/service-pincodes/:pincode', removeServicePincode);

export { router as supplierRoutes };
