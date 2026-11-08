import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  productId: Types.ObjectId;   // the listing of the supplier currently holding the order
  catalogItemId?: Types.ObjectId; // what the buyer ordered (lets the order move to another supplier)
  name: string;
  imageUrl: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;    // unit price applied (bulk tier or base), as listed
  listPrice: number;       // product basePrice at order time
  tierMinQty?: number;     // bulk tier applied, if any
  gstRate: number;
  isGstInclusive: boolean;
  subtotal: number;        // pricePerUnit × quantity, as listed
  taxableValue: number;
  gstAmount: number;
  lineTotal: number;
  // Supplier side (orders from 2026-11-05): their own price for the line, and commission rates used
  supplierUnitPrice?: number;
  supplierLineTotal?: number;
  commissionPercent?: number;        // Sthiva delivers rate, built into the buyer price
  supplierDeliveryPercent?: number;  // lower rate Sthiva keeps if the supplier delivers
}

export type OrderStatusEvent = {
  status: IOrder['status'];
  at: Date;
  byRole: 'BUYER' | 'SUPPLIER' | 'DELIVERY_PARTNER' | 'OPERATOR' | 'ADMIN' | 'SYSTEM';
  byUserId?: Types.ObjectId;
  note?: string;
};

// Who has been offered the order and what they said. The order stays PENDING until a supplier accepts.
export type OfferAttempt = {
  supplierId: Types.ObjectId;
  offeredAt: Date;
  outcome?: 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
  at?: Date;
  reason?: string;
  byOps?: boolean;
};
export type Allocation = {
  // OFFERED: waiting for supplierId to answer. ACCEPTED: supplier confirmed.
  // NEEDS_OPS: no suitable supplier left; ops must offer it by hand or cancel.
  state: 'OFFERED' | 'ACCEPTED' | 'NEEDS_OPS';
  expiresAt?: Date;
  attempts: OfferAttempt[];
};

export type OpsNote = { at: Date; byUserId: Types.ObjectId; byRole: 'OPERATOR' | 'ADMIN'; note: string };

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  buyerId: Types.ObjectId;
  supplierId: Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: {
    label: string;
    fullAddress: string;
    lat?: number;           // only when the buyer pinned/shared a location
    lng?: number;
    contactPhone: string;
    pincode?: string;       // confirmed delivery PIN (absent on legacy mobile orders)
    district?: string;      // postal snapshot at order time
    state?: string;
  };
  // VERIFIED: supplier coverage checked for deliveryAddress.pincode inside the order transaction.
  // SKIPPED_NO_PINCODE: legacy client sent no PIN (see ORDERS_REQUIRE_DELIVERY_PINCODE).
  serviceabilityCheck?: 'VERIFIED' | 'SKIPPED_NO_PINCODE';
  allocation?: Allocation;
  // Sthiva delivery job: offered to one driver at a time (features/delivery/driver-offers.ts)
  driverOffer?: {
    state: 'OFFERED' | 'ASSIGNED' | 'NEEDS_OPS';
    driverUserId?: Types.ObjectId;
    expiresAt?: Date;
    attempts: { driverUserId: Types.ObjectId; offeredAt: Date; outcome?: 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN'; at?: Date; reason?: string }[];
  };
  // The buyer gives this code to whoever delivers; required to mark the order delivered
  deliveryOtp?: string;
  otpFailures?: number;
  // A delivery that went wrong (buyer not there, site closed, refused...), waiting for ops
  deliveryIssue?: { reason: string; at: Date; byRole: 'DELIVERY_PARTNER' | 'SUPPLIER'; byUserId: Types.ObjectId; resolvedAt?: Date; resolution?: string };
  // Usual delivery time of the listings holding the order (days after acceptance); see delivery-window.ts
  expectedDelivery?: { minDays: number; maxDays: number };
  // Calendar date (YYYY-MM-DD, India) the supplier confirmed; can be changed later, buyer is told
  deliveryDate?: string;
  deliveryDateSetAt?: Date;
  // Something in the order is made or ordered from the company for the buyer: in process until the supplier confirms
  onOrder?: boolean;
  // No supplier delivers to this PIN yet: Sthiva's team finds one (allocation NEEDS_OPS), the buyer is told within 24 hours
  outOfArea?: boolean;
  deliveryMethod: 'STANDARD' | 'EXPRESS';
  deliveryCharge: number;
  // How the delivery charge was worked out (absent when delivery pricing was off)
  delivery?: { vehicleCode: string; vehicleName: string; weightKg: number; distanceKm: number; driverSharePercent?: number };
  subtotal: number;        // Σ taxable value
  gstAmount: number;       // Σ GST
  total: number;           // amount payable
  supplierTotal?: number;   // Σ supplier line totals (before any own-delivery adjustment)
  commissionTotal?: number; // total − supplierTotal
  status: 'PENDING' | 'CONFIRMED' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';
  // Chosen by the supplier at dispatch: Sthiva delivery partner, or supplier's own vehicle
  deliveryMode?: 'PLATFORM' | 'SUPPLIER';
  dispatchedAt?: Date;
  driverId?: Types.ObjectId;
  assignedAt?: Date;
  pickedUpAt?: Date;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'CAPTURED' | 'RELEASED' | 'REFUNDED';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: 'UPI' | 'CARD' | 'COD';
  notes?: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: 'BUYER' | 'SUPPLIER' | 'OPS' | 'SYSTEM';
  // DEDUCTED: stock taken at creation. RESTORED: given back on cancel (exactly once).
  // NOT_RESTORED: cancelled by ops after dispatch with goods not returned to stock.
  // NONE: no supplier holds stock for it right now (order waiting for ops to find a supplier)
  inventoryState: 'DEDUCTED' | 'RESTORED' | 'NOT_RESTORED' | 'NONE';
  idempotencyKey?: string;
  requestHash?: string;
  codAmountCollected?: number;
  codCollectedAt?: Date;
  codCollectedBy?: Types.ObjectId;
  codCollectedByRole?: 'DELIVERY_PARTNER' | 'SUPPLIER' | 'OPERATOR' | 'ADMIN';
  // Settlement statements this order is counted in (features/settlements); absent = not settled yet
  supplierSettlementId?: Types.ObjectId;
  driverSettlementId?: Types.ObjectId;
  statusHistory: OrderStatusEvent[];
  opsNotes: OpsNote[];
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', required: true, index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        catalogItemId: { type: Schema.Types.ObjectId, ref: 'CatalogItem' },
        name: String,
        imageUrl: String,
        unit: String,
        quantity: Number,
        pricePerUnit: Number,
        listPrice: Number,
        tierMinQty: Number,
        gstRate: { type: Number, default: 18 },
        isGstInclusive: Boolean,
        subtotal: Number,
        taxableValue: Number,
        gstAmount: Number,
        lineTotal: Number,
        supplierUnitPrice: Number,
        supplierLineTotal: Number,
        commissionPercent: Number,
        supplierDeliveryPercent: Number,
      },
    ],
    deliveryAddress: {
      label: String,
      fullAddress: String,
      lat: Number,
      lng: Number,
      contactPhone: String,
      pincode: { type: String, match: /^[1-9]\d{5}$/ },
      district: String,
      state: String,
    },
    serviceabilityCheck: { type: String, enum: ['VERIFIED', 'SKIPPED_NO_PINCODE'] },
    allocation: {
      state: { type: String, enum: ['OFFERED', 'ACCEPTED', 'NEEDS_OPS'] },
      expiresAt: Date,
      attempts: [
        {
          _id: false,
          supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile' },
          offeredAt: Date,
          outcome: { type: String, enum: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'] },
          at: Date,
          reason: String,
          byOps: Boolean,
        },
      ],
    },
    deliveryMethod: { type: String, enum: ['STANDARD', 'EXPRESS'], default: 'STANDARD' },
    deliveryCharge: { type: Number, default: 0 },
    delivery: {
      _id: false,
      vehicleCode: String,
      vehicleName: String,
      weightKg: Number,
      distanceKm: Number,
      driverSharePercent: Number,
    },
    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    total: { type: Number, required: true },
    supplierTotal: Number,
    commissionTotal: Number,
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED'],
      default: 'PENDING',
      index: true,
    },
    deliveryMode: { type: String, enum: ['PLATFORM', 'SUPPLIER'] },
    expectedDelivery: { minDays: Number, maxDays: Number },
    deliveryDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    deliveryDateSetAt: Date,
    onOrder: Boolean,
    outOfArea: Boolean,
    driverOffer: {
      state: { type: String, enum: ['OFFERED', 'ASSIGNED', 'NEEDS_OPS'] },
      driverUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      expiresAt: Date,
      attempts: [
        {
          _id: false,
          driverUserId: { type: Schema.Types.ObjectId, ref: 'User' },
          offeredAt: Date,
          outcome: { type: String, enum: ['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'] },
          at: Date,
          reason: String,
        },
      ],
    },
    deliveryOtp: { type: String, select: false },
    otpFailures: { type: Number, default: 0 },
    deliveryIssue: {
      reason: String,
      at: Date,
      byRole: { type: String, enum: ['DELIVERY_PARTNER', 'SUPPLIER'] },
      byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: Date,
      resolution: String,
    },
    dispatchedAt: Date,
    driverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedAt: Date,
    pickedUpAt: Date,
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'CAPTURED', 'RELEASED', 'REFUNDED'],
      default: 'PENDING',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paymentMethod: { type: String, enum: ['UPI', 'CARD', 'COD'] },
    notes: String,
    confirmedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: { type: String, enum: ['BUYER', 'SUPPLIER', 'OPS', 'SYSTEM'] },
    // Orders created before this field existed had stock deducted at creation too
    inventoryState: { type: String, enum: ['DEDUCTED', 'RESTORED', 'NOT_RESTORED', 'NONE'], default: 'DEDUCTED' },
    idempotencyKey: String,
    requestHash: String,
    codAmountCollected: Number,
    supplierSettlementId: { type: Schema.Types.ObjectId, ref: 'Settlement', index: true },
    driverSettlementId: { type: Schema.Types.ObjectId, ref: 'Settlement', index: true },
    codCollectedAt: Date,
    codCollectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    codCollectedByRole: { type: String, enum: ['DELIVERY_PARTNER', 'SUPPLIER', 'OPERATOR', 'ADMIN'] },
    statusHistory: [
      {
        _id: false,
        status: String,
        at: Date,
        byRole: { type: String, enum: ['BUYER', 'SUPPLIER', 'DELIVERY_PARTNER', 'OPERATOR', 'ADMIN', 'SYSTEM'] },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
    // Internal notes from the operations team. select:false keeps them out of every
    // buyer/supplier/driver response; ops queries opt in with .select('+opsNotes').
    opsNotes: {
      type: [
        {
          _id: false,
          at: Date,
          byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
          byRole: { type: String, enum: ['OPERATOR', 'ADMIN'] },
          note: String,
        },
      ],
      select: false,
    },
  },
  { timestamps: true }
);

// Ops "needs attention" queues filter on status + age
orderSchema.index({ status: 1, updatedAt: 1 });
// Offer timeout sweep
orderSchema.index({ 'allocation.state': 1, 'allocation.expiresAt': 1 });
orderSchema.index({ 'driverOffer.driverUserId': 1, 'driverOffer.state': 1 });
orderSchema.index({ 'driverOffer.state': 1, 'driverOffer.expiresAt': 1 });

// One order per (buyer, Idempotency-Key): a retried or double-tapped checkout can't create a second order
orderSchema.index(
  { buyerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export const Order = model<IOrder>('Order', orderSchema);
