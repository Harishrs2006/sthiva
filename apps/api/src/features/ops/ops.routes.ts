import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  summary, listOrders, getOrder, cancel, unassign, assign, recordCod, addNote,
  listDrivers, listSuppliers, setSupplierVerification, setUserActive,
  offerToSupplier, nextSupplier, supplierOptions, setDriverVerification, markDelivered, resolveProblem,
  listUsers, getAnalytics,
} from './ops.controller';
import {
  listOrdersQuery, opsCancelSchema, opsUnassignSchema, opsAssignSchema, opsCodSchema, opsNoteSchema,
  supplierListQuery, supplierVerificationSchema, userActiveSchema, opsOfferSchema, opsUnassignSchema as opsReasonSchema,
  usersQuery, analyticsQuery,
} from './ops.schemas';
import { opsList, opsGet, opsCreate, opsUpdate, opsMerge } from '../catalog/catalog.controller';
import { opsDocuments, reviewDocument } from '../suppliers/documents';
import { z } from 'zod';

const documentReviewSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
  note: z.string().trim().max(300).optional(),
}).refine((v) => v.status === 'ACCEPTED' || (v.note ?? '').length >= 3, { message: 'Say why it was not accepted', path: ['note'] });
import { catalogCreateSchema, catalogUpdateSchema, catalogMergeSchema } from '../catalog/catalog.schemas';
import { getSettings, setCommission, createVehicle, updateVehicle, updateGeneral, createCategory, updateCategory } from '../settings/settings.controller';
import { opsBalances, opsList as settlementList, opsGet as settlementGet, opsCreate as settlementCreate, opsMarkPaid, opsCancel as settlementCancel } from '../settlements/settlement.controller';
import { balancesQuery, settlementListQuery, createSettlementSchema, markPaidSchema, cancelSettlementSchema } from '../settlements/settlement.schemas';
import { commissionSchema, vehicleCreateSchema, vehicleUpdateSchema, generalSettingsSchema, categoryCreateSchema, categoryUpdateSchema } from '../settings/settings.schemas';

const router = Router();

// Operations team only. OPERATOR/ADMIN can never be self-assigned (see auth onboarding);
// accounts are promoted with `npm run grant-role --workspace=apps/api`.
router.use(requireAuth, requireRole('OPERATOR', 'ADMIN'));

router.get('/summary', summary);

router.get('/orders', validate(listOrdersQuery, 'query'), listOrders);
router.get('/orders/:id', getOrder);
router.post('/orders/:id/cancel', validate(opsCancelSchema), cancel);
router.post('/orders/:id/unassign', validate(opsUnassignSchema), unassign);
router.post('/orders/:id/assign', validate(opsAssignSchema), assign);
router.post('/orders/:id/cod', validate(opsCodSchema), recordCod);
router.post('/orders/:id/notes', validate(opsNoteSchema), addNote);
// Supplier allocation for orders still waiting for a supplier
router.get('/orders/:id/supplier-options', supplierOptions);
router.post('/orders/:id/offer', validate(opsOfferSchema), offerToSupplier);
router.post('/orders/:id/next-supplier', validate(opsReasonSchema), nextSupplier);
router.post('/orders/:id/deliver', validate(opsReasonSchema), markDelivered);
router.post('/orders/:id/resolve-problem', validate(opsReasonSchema), resolveProblem);

router.get('/drivers', listDrivers);
router.patch('/drivers/:id/verification', validate(supplierVerificationSchema), setDriverVerification);
router.get('/suppliers', validate(supplierListQuery, 'query'), listSuppliers);
router.patch('/suppliers/:id/verification', validate(supplierVerificationSchema), setSupplierVerification);
router.get('/suppliers/:id/documents', opsDocuments);
router.patch('/suppliers/:id/documents/:type', validate(documentReviewSchema), reviewDocument);

router.get('/users', validate(usersQuery, 'query'), listUsers);
router.get('/analytics', validate(analyticsQuery, 'query'), getAnalytics);

// Account suspension is ADMIN-only
router.patch('/users/:id/active', requireRole('ADMIN'), validate(userActiveSchema), setUserActive);

// Sthiva catalog: operators and admins keep it tidy (review new items, fix, merge duplicates)
router.get('/catalog', opsList);
router.get('/catalog/:id', opsGet);
router.post('/catalog', validate(catalogCreateSchema), opsCreate);
router.patch('/catalog/:id', validate(catalogUpdateSchema), opsUpdate);
router.post('/catalog/:id/merge', validate(catalogMergeSchema), opsMerge);

// Platform settings: operators read, ADMIN changes
router.get('/settings', getSettings);
router.patch('/settings/commission/:id', requireRole('ADMIN'), validate(commissionSchema), setCommission);
router.post('/settings/categories', requireRole('ADMIN'), validate(categoryCreateSchema), createCategory);
router.patch('/settings/categories/:id', requireRole('ADMIN'), validate(categoryUpdateSchema), updateCategory);
router.post('/settings/vehicles', requireRole('ADMIN'), validate(vehicleCreateSchema), createVehicle);
router.patch('/settings/vehicles/:id', requireRole('ADMIN'), validate(vehicleUpdateSchema), updateVehicle);
router.patch('/settings/general', requireRole('ADMIN'), validate(generalSettingsSchema), updateGeneral);

// Settlements with suppliers and drivers: operators read, ADMIN creates, marks paid, cancels
router.get('/settlements/balances', validate(balancesQuery, 'query'), opsBalances);
router.get('/settlements', validate(settlementListQuery, 'query'), settlementList);
router.get('/settlements/:id', settlementGet);
router.post('/settlements', requireRole('ADMIN'), validate(createSettlementSchema), settlementCreate);
router.post('/settlements/:id/paid', requireRole('ADMIN'), validate(markPaidSchema), opsMarkPaid);
router.post('/settlements/:id/cancel', requireRole('ADMIN'), validate(cancelSettlementSchema), settlementCancel);

export { router as opsRoutes };
