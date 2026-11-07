import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import {
  seedUser, seedSupplier, seedDriver, seedProduct, newKey, SITE,
  startDb, stopDb, clearDb, makeApp,
} from './helpers';
import { env } from '../src/config/env';
import { importPostalDirectory } from '../src/features/locations/postal-import';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { PostalOffice } from '../src/infrastructure/database/models/PostalOffice.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { User } from '../src/infrastructure/database/models/User.model';
import { Category } from '../src/infrastructure/database/models/Category.model';
import { HEADER_RECENT, ROWS_RECENT, csv, chunked } from './fixtures/postal';

// Fixture directory (synthetic): 572103, 560001, 110001 have delivery offices;
// 400001 only has a non-delivery office; 999999 does not exist.
const loadDirectory = () =>
  importPostalDirectory({ source: chunked(csv(HEADER_RECENT, ROWS_RECENT), 100), sourceFile: 'test.csv', version: 'test-1' });

const api = (path: string) => `/api/v1${path}`;
type Who = { headers: Record<string, string> };

let app: ReturnType<typeof makeApp>;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
  app = makeApp();
});

const coverage = {
  list: (who: Who) => request(app).get(api('/suppliers/me/service-pincodes')).set(who.headers),
  add: (who: Who, pincodes: unknown) => request(app).post(api('/suppliers/me/service-pincodes')).set(who.headers).send({ pincodes }),
  remove: (who: Who, pin: string) => request(app).delete(api(`/suppliers/me/service-pincodes/${pin}`)).set(who.headers),
  preview: (who: Who, pin: string) => request(app).get(api(`/suppliers/me/service-pincodes/${pin}`)).set(who.headers),
};
const servedPins = async (profileId: unknown) => (await SupplierProfile.findById(profileId).lean())!.servicePincodes;

// ─── Supplier coverage management ───────────────────────────────────────────

describe('supplier service PIN codes', () => {
  let supplier: Awaited<ReturnType<typeof seedSupplier>>;
  beforeEach(async () => {
    await loadDirectory();
    supplier = await seedSupplier('cov-supplier');
  });

  it('adds valid PIN codes and lists them with postal details', async () => {
    const res = await coverage.add(supplier, ['572103', '560001']);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ added: ['560001', '572103'], alreadyPresent: [], count: 2, limit: 500 });

    const list = await coverage.list(supplier);
    expect(list.body.data).toMatchObject({ postalStatus: 'AVAILABLE', count: 2 });
    expect(list.body.data.pincodes).toEqual([
      { pincode: '560001', district: 'BENGALURU URBAN', state: 'KARNATAKA', hasDeliveryOffice: true },
      { pincode: '572103', district: 'TUMAKURU', state: 'KARNATAKA', hasDeliveryOffice: true },
    ]);
  });

  it('rejects unknown PIN codes and changes nothing (all-or-nothing)', async () => {
    const res = await coverage.add(supplier, ['572103', '999999']);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ pincode: '999999', reason: 'NOT_FOUND' }]);
    expect(await servedPins(supplier.profile._id)).toEqual([]);
  });

  it('rejects malformed PIN codes with a reason per entry', async () => {
    const res = await coverage.add(supplier, ['5721', 'abcdef', '012345', ' 572103 ', '5721033']);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: any) => [d.pincode, d.reason])).toEqual([
      ['5721', 'MALFORMED'], ['abcdef', 'MALFORMED'], ['012345', 'MALFORMED'], ['5721033', 'MALFORMED'],
    ]);
    for (const body of [[], [572103], 'not-an-array', Array.from({ length: 51 }, (_, i) => String(560100 + i))]) {
      expect((await coverage.add(supplier, body)).status, JSON.stringify(body).slice(0, 30)).toBe(400);
    }
    expect(await servedPins(supplier.profile._id)).toEqual([]);
  });

  it('rejects PIN codes with no delivery post office', async () => {
    const res = await coverage.add(supplier, ['400001']);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ pincode: '400001', reason: 'NO_DELIVERY_OFFICE' }]);
  });

  it('never stores duplicates', async () => {
    await coverage.add(supplier, ['572103']);
    const res = await coverage.add(supplier, ['572103', '572103', '560001', '560001']);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ added: ['560001'], alreadyPresent: ['572103'], count: 2 });
    const again = await coverage.add(supplier, ['572103']);
    expect(again.status).toBe(200);
    expect((await servedPins(supplier.profile._id)).sort()).toEqual(['560001', '572103']);
  });

  it('removes PIN codes idempotently', async () => {
    await coverage.add(supplier, ['572103', '560001']);
    const res = await coverage.remove(supplier, '572103');
    expect(res.body.data).toMatchObject({ pincode: '572103', removed: true, count: 1 });
    expect((await coverage.remove(supplier, '572103')).body.data).toMatchObject({ removed: false, count: 1 });
    expect((await coverage.remove(supplier, '57210x')).status).toBe(400);
    expect(await servedPins(supplier.profile._id)).toEqual(['560001']);
  });

  it('enforces the per-supplier limit', async () => {
    const filler = Array.from({ length: 499 }, (_, i) => String(200000 + i));
    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { $set: { servicePincodes: filler } });
    expect((await coverage.add(supplier, ['572103', '560001'])).status).toBe(400);
    expect((await coverage.add(supplier, ['572103'])).status).toBe(201);
    expect(await servedPins(supplier.profile._id)).toHaveLength(500);
  });

  it('only the supplier themselves can change their coverage', async () => {
    const other = await seedSupplier('other-supplier');
    await coverage.add(other, ['110001']);
    for (const who of [await seedUser('a-buyer'), await seedDriver('a-driver'), await seedUser('an-op', { role: 'OPERATOR' })]) {
      expect((await coverage.add(who, ['572103'])).status).toBe(403);
      expect((await coverage.remove(who, '110001')).status).toBe(403);
    }
    expect((await request(app).post(api('/suppliers/me/service-pincodes')).send({ pincodes: ['572103'] })).status).toBe(401);

    // A supplier's request only ever touches their own profile
    await coverage.add(supplier, ['572103']);
    await coverage.remove(supplier, '110001');
    expect(await servedPins(other.profile._id)).toEqual(['110001']);

    // The generic profile update can't be used to bypass validation
    await request(app).patch(api('/suppliers/me')).set(supplier.headers).send({ servicePincodes: ['999999'] });
    expect(await servedPins(supplier.profile._id)).toEqual(['572103']);
  });

  it('refuses changes when the postal directory is missing, but still shows the list', async () => {
    await coverage.add(supplier, ['572103']);
    await clearDb();
    supplier = await seedSupplier('cov-supplier-2', { servicePincodes: ['572103'] });

    const res = await coverage.add(supplier, ['560001']);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LOOKUP_UNAVAILABLE');
    expect(res.headers['retry-after']).toBe('30');
    expect(await servedPins(supplier.profile._id)).toEqual(['572103']);

    const list = await coverage.list(supplier);
    expect(list.status).toBe(200);
    expect(list.body.data).toMatchObject({ postalStatus: 'UNAVAILABLE', pincodes: [{ pincode: '572103' }] });
  });

  it('returns 503 when the directory cannot be read', async () => {
    vi.spyOn(PostalOffice, 'aggregate').mockImplementationOnce(() => { throw new Error('connection reset'); });
    expect((await coverage.add(supplier, ['572103'])).status).toBe(503);
    expect(await servedPins(supplier.profile._id)).toEqual([]);
  });

  it('previews a PIN and explains why buyers cannot order yet', async () => {
    const pending = await seedSupplier('pending-supplier', { verificationStatus: 'PENDING' });
    const res = await coverage.preview(pending, '572103');
    expect(res.body.data).toMatchObject({ pincode: '572103', servedByYou: false, canAdd: true, district: 'TUMAKURU' });
    expect(res.body.data.note).toMatch(/verifies/);
    expect((await coverage.preview(pending, '400001')).body.data.canAdd).toBe(false);
  });
});

// ─── Destination serviceability ─────────────────────────────────────────────

describe('GET /locations/pincode/:pincode/serviceability', () => {
  const check = (pin: string) => request(app).get(api(`/locations/pincode/${pin}/serviceability`));

  it('a valid PIN with no suppliers is a clear "not yet" answer', async () => {
    await loadDirectory();
    const res = await check('110001');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ pincode: '110001', district: 'NEW DELHI', serviceable: false, supplierCount: 0, reason: 'NO_SUPPLIERS' });
  });

  it('counts every eligible supplier serving the PIN, and only those', async () => {
    await loadDirectory();
    await seedSupplier('s1', { servicePincodes: ['560001'] });
    await seedSupplier('s2', { servicePincodes: ['560001', '572103'] });
    await seedSupplier('pending', { verificationStatus: 'PENDING', servicePincodes: ['560001'] });
    await seedSupplier('rejected', { verificationStatus: 'REJECTED', servicePincodes: ['560001'] });
    const suspended = await seedSupplier('suspended', { servicePincodes: ['560001'] });
    await User.updateOne({ _id: suspended.user._id }, { isActive: false });
    const inactive = await seedSupplier('inactive', { servicePincodes: ['560001'] });
    await SupplierProfile.updateOne({ _id: inactive.profile._id }, { isActive: false });

    expect((await check('560001')).body.data).toMatchObject({ serviceable: true, supplierCount: 2 });
    expect((await check('572103')).body.data).toMatchObject({ serviceable: true, supplierCount: 1 });
  });

  it('a supplier with no configured coverage serves nowhere', async () => {
    await loadDirectory();
    await seedSupplier('no-coverage');
    expect((await check('572103')).body.data).toMatchObject({ serviceable: false, reason: 'NO_SUPPLIERS' });
  });

  it('distinguishes bad input, unknown PINs and an unavailable directory', async () => {
    expect((await check('572103')).status).toBe(503); // nothing imported yet
    await loadDirectory();
    expect((await check('57210')).body.error.code).toBe('PINCODE_INVALID');
    expect((await check('999999')).body.error.code).toBe('PINCODE_NOT_FOUND');
    vi.spyOn(SupplierProfile, 'find').mockImplementationOnce(() => { throw new Error('db down'); });
    const res = await check('572103');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LOOKUP_UNAVAILABLE');
  });
});

// ─── Product discovery ──────────────────────────────────────────────────────

describe('location-aware product discovery', () => {
  let a: Awaited<ReturnType<typeof seedSupplier>>;
  let b: Awaited<ReturnType<typeof seedSupplier>>;
  let aCement: any, aSteel: any, bCement: any, pendingProduct: any;

  beforeEach(async () => {
    await loadDirectory();
    a = await seedSupplier('supplier-a', { servicePincodes: ['572103', '560001'] });
    b = await seedSupplier('supplier-b', { servicePincodes: ['560001'] });
    const pending = await seedSupplier('supplier-pending', { verificationStatus: 'PENDING', servicePincodes: ['572103'] });
    const steelCat = await Category.create({ name: 'Steel', slug: 'steel', commission: { platformDeliveryPercent: 0 } });
    aCement = await seedProduct(a.profile._id, { name: 'Ultra Cement OPC 53' });
    aSteel = await seedProduct(a.profile._id, { name: 'TMT Steel Bar 12mm', categoryId: steelCat._id });
    bCement = await seedProduct(b.profile._id, { name: 'Ramco Cement PPC' });
    pendingProduct = await seedProduct(pending.profile._id, { name: 'Pending Cement' });
    await seedProduct(a.profile._id, { name: 'Old Cement', status: 'DISCONTINUED' });
  });

  const list = (query = '') => request(app).get(api(`/products${query}`));
  const ids = (res: request.Response) => res.body.products.map((p: any) => p._id).sort();

  it('filters products to suppliers serving the PIN', async () => {
    expect(ids(await list('?pincode=572103'))).toEqual([aCement._id, aSteel._id].map(String).sort());
    expect(ids(await list('?pincode=560001'))).toEqual([aCement._id, aSteel._id, bCement._id].map(String).sort());

    const none = await list('?pincode=110001');
    expect(none.status).toBe(200);
    expect(none.body.products).toEqual([]);
    expect(none.body.location).toMatchObject({ pincode: '110001', serviceable: false, reason: 'NO_SUPPLIERS' });
  });

  it('keeps category, search and pagination working with a PIN', async () => {
    expect(ids(await list('?pincode=560001&category=steel'))).toEqual([String(aSteel._id)]);
    expect(ids(await list('?pincode=560001&q=cement'))).toEqual([aCement._id, bCement._id].map(String).sort());
    const page2 = await list('?pincode=560001&limit=2&page=2&sort=newest');
    expect(page2.body.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
    expect(page2.body.products).toHaveLength(1);
  });

  it('rejects bad or unknown PINs', async () => {
    expect((await list('?pincode=abc')).body.error.code).toBe('PINCODE_INVALID');
    expect((await list('?pincode=999999')).body.error.code).toBe('PINCODE_NOT_FOUND');
  });

  it('without a PIN keeps the existing response shape (mobile) but hides non-public listings', async () => {
    const res = await list();
    expect(Object.keys(res.body).sort()).toEqual(['pagination', 'products']);
    expect(ids(res)).toEqual([aCement._id, aSteel._id, bCement._id].map(String).sort());
    expect(ids(res)).not.toContain(String(pendingProduct._id));
    expect(JSON.stringify(res.body)).not.toContain('servicePincodes');
  });

  it('product detail: deliverability with a PIN, unchanged without, 404 for hidden listings', async () => {
    const plain = await request(app).get(api(`/products/${aCement._id}`));
    expect(plain.status).toBe(200);
    expect(plain.body.availability).toBeUndefined();
    expect(plain.body.supplierId.servicePincodes).toBeUndefined();

    const served = await request(app).get(api(`/products/${bCement._id}?pincode=560001`));
    expect(served.body.availability).toMatchObject({ pincode: '560001', deliverable: true });
    const notServed = await request(app).get(api(`/products/${bCement._id}?pincode=572103`));
    expect(notServed.body.availability).toMatchObject({ deliverable: false, reason: 'PINCODE_NOT_SERVED' });

    expect((await request(app).get(api(`/products/${pendingProduct._id}`))).status).toBe(404);
    const discontinued = await Product.findOne({ name: 'Old Cement' }).lean();
    expect((await request(app).get(api(`/products/${discontinued!._id}`))).status).toBe(404);
  });
});

// ─── Quotes and orders ──────────────────────────────────────────────────────

describe('quote and order serviceability', () => {
  let buyer: Awaited<ReturnType<typeof seedUser>>;
  let supplier: Awaited<ReturnType<typeof seedSupplier>>;
  let product: any;
  const items = () => [{ productId: String(product._id), quantity: 10 }];
  const quote = (deliveryPincode?: string) =>
    request(app).post(api('/orders/quote')).set(buyer.headers).send({ items: items(), ...(deliveryPincode !== undefined && { deliveryPincode }) });
  const order = (pincode?: string, extra: Record<string, unknown> = {}) =>
    request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: items(), deliveryAddress: { ...SITE, ...(pincode !== undefined && { pincode }) }, ...extra });
  const stock = async () => (await Product.findById(product._id).lean())!.stockQuantity;
  const savedFlag = env.ORDERS_REQUIRE_DELIVERY_PINCODE;

  beforeEach(async () => {
    await loadDirectory();
    buyer = await seedUser('buyer');
    supplier = await seedSupplier('supplier', { servicePincodes: ['572103', '560001'] });
    product = await seedProduct(supplier.profile._id, { stockQuantity: 100 });
  });
  afterEach(() => { env.ORDERS_REQUIRE_DELIVERY_PINCODE = savedFlag; });

  it('quotes a served destination; an unserved one is quoted as out of area (Sthiva finds a supplier)', async () => {
    const ok = await quote('572103');
    expect(ok.status).toBe(200);
    expect(ok.body.data.delivery).toEqual({ pincode: '572103', district: 'TUMAKURU', state: 'KARNATAKA', serviceable: true });
    expect(ok.body.data.outOfArea).toBe(false);

    const far = await quote('110001');
    expect(far.status).toBe(200);
    expect(far.body.data).toMatchObject({ outOfArea: true, delivery: { pincode: '110001', serviceable: false } });
    expect((await quote('57210')).body.error.code).toBe('PINCODE_INVALID');
    expect((await quote('999999')).body.error.code).toBe('PINCODE_NOT_FOUND');
  });

  it('places an order for a served PIN with a postal snapshot and no invented coordinates', async () => {
    const { lat: _lat, lng: _lng, ...noCoords } = SITE;
    const res = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: items(), deliveryAddress: { ...noCoords, pincode: '560001' } });
    expect(res.status).toBe(201);
    const saved = await Order.findById(res.body.data.orderId).lean();
    expect(saved).toMatchObject({ serviceabilityCheck: 'VERIFIED', deliveryAddress: { pincode: '560001', district: 'BENGALURU URBAN', state: 'KARNATAKA' } });
    expect(saved!.deliveryAddress.lat).toBeUndefined();
    expect(await stock()).toBe(90);
  });

  it('a supplier with no configured coverage: every PIN is out of area, nothing is offered to them, no stock taken', async () => {
    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { $set: { servicePincodes: [] } });
    for (const pin of ['572103', '560001', '110001']) {
      const q = await quote(pin);
      expect(q.status, pin).toBe(200);
      expect(q.body.data.outOfArea, pin).toBe(true);
      expect((await order(pin)).status, pin).toBe(201);
    }
    const queued = await Order.find().lean();
    expect(queued.every((o) => o.outOfArea && o.allocation?.state === 'NEEDS_OPS' && o.inventoryState === 'NONE')).toBe(true);
    // The supplier does not see orders Sthiva is still placing
    expect((await request(app).get(api('/suppliers/me/orders')).set(supplier.headers)).body.data).toHaveLength(0);
    const detail = await request(app).get(api(`/products/${product._id}?pincode=572103`));
    expect(detail.body.availability).toMatchObject({ deliverable: false, reason: 'PINCODE_NOT_SERVED' });
    expect(await stock()).toBe(100);
  });

  it('takes an order for an unsupported PIN as out of area, for Sthiva to place, without touching stock', async () => {
    const res = await order('110001');
    expect(res.status).toBe(201);
    const saved = (await Order.findById(res.body.data.orderId).lean())!;
    expect(saved).toMatchObject({ status: 'PENDING', outOfArea: true, allocation: { state: 'NEEDS_OPS' }, inventoryState: 'NONE' });
    expect(await stock()).toBe(100);
    // The buyer sees it as in process, without internal allocation details
    const mine = await request(app).get(api(`/orders/${saved._id}`)).set(buyer.headers);
    expect(mine.body.data).toMatchObject({ status: 'PENDING', outOfArea: true });
    expect(mine.body.data.allocation).toBeUndefined();
  });

  it('re-checks coverage at checkout: a PIN removed after the quote becomes out of area', async () => {
    const q = await quote('572103');
    expect(q.status).toBe(200);
    await request(app).delete(api('/suppliers/me/service-pincodes/572103')).set(supplier.headers);

    const res = await order('572103', { expectedTotal: q.body.data.total });
    expect(res.status).toBe(201);
    expect((await Order.findById(res.body.data.orderId).lean())!.outOfArea).toBe(true);
    expect(await stock()).toBe(100);
  });

  it('refuses checkout if the supplier is suspended or unverified after the quote', async () => {
    expect((await quote('572103')).status).toBe(200);
    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { verificationStatus: 'REJECTED' });
    const res = await order('572103');
    expect(res.status).toBe(409);
    expect(res.body.error.details.reason).toBe('SUPPLIER_NOT_AVAILABLE');
    expect(await stock()).toBe(100);
  });

  it('handles a location change during checkout', async () => {
    const q = await quote('572103');
    // Buyer switches the address to a PIN this supplier doesn't serve → out of area, no stock taken
    const far = await order('110001', { expectedTotal: q.body.data.total });
    expect(far.status).toBe(201);
    expect((await Order.findById(far.body.data.orderId).lean())!.outOfArea).toBe(true);
    expect(await stock()).toBe(100);
    // …or to another PIN it does serve → accepted (server re-checks the new PIN)
    const res = await order('560001', { expectedTotal: q.body.data.total });
    expect(res.status).toBe(201);
    expect((await Order.findById(res.body.data.orderId).lean())!.deliveryAddress.pincode).toBe('560001');
    expect(await stock()).toBe(90);
  });

  it('fails safe when the directory or database is unavailable', async () => {
    vi.spyOn(SupplierProfile, 'findOne').mockImplementationOnce(() => { throw new Error('db down'); });
    const res = await order('572103');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LOOKUP_UNAVAILABLE');
    expect(await stock()).toBe(100);

    await clearDb();
    buyer = await seedUser('buyer-2');
    supplier = await seedSupplier('supplier-2', { servicePincodes: ['572103'] });
    product = await seedProduct(supplier.profile._id, { stockQuantity: 100 });
    const noDirectory = await order('572103');
    expect(noDirectory.status).toBe(503);
    expect(await stock()).toBe(100);
  });

  it('a replayed order stays idempotent even if coverage changed afterwards', async () => {
    const key = newKey();
    const send = () => request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', key)
      .send({ items: items(), deliveryAddress: { ...SITE, pincode: '572103' } });
    const first = await send();
    expect(first.status).toBe(201);
    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { $pull: { servicePincodes: '572103' } });
    const replay = await send();
    expect(replay.status).toBe(200);
    expect(replay.body.data).toMatchObject({ orderId: first.body.data.orderId, replayed: true });
    expect(await stock()).toBe(90);
  });

  describe('existing mobile clients (no PIN code)', () => {
    it('quote keeps its existing fields and adds delivery: null', async () => {
      const res = await quote();
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ subtotal: 4000, gstAmount: 1120, deliveryCharge: 0, total: 5120, delivery: null });
      expect(res.body.data.items[0]).toMatchObject({ quantity: 10, pricePerUnit: 400 });
    });

    it('accepts the current mobile payload: no coordinates and no PIN, and stores no coordinates', async () => {
      const { lat: _lat, lng: _lng, ...noCoords } = SITE;
      const res = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
        .send({ items: items(), deliveryAddress: noCoords });
      expect(res.status).toBe(201);
      const saved = await Order.findById(res.body.data.orderId).lean();
      expect(saved!.serviceabilityCheck).toBe('SKIPPED_NO_PINCODE');
      expect(saved!.deliveryAddress.lat).toBeUndefined();
      expect(saved!.deliveryAddress.lng).toBeUndefined();
      expect(saved!.deliveryAddress.pincode).toBeUndefined();
    });

    it('orders are still accepted, flagged, and queued for ops', async () => {
      const res = await order(undefined);
      expect(res.status).toBe(201);
      const saved = await Order.findById(res.body.data.orderId).lean();
      expect(saved!.serviceabilityCheck).toBe('SKIPPED_NO_PINCODE');

      const op = await seedUser('ops-person', { role: 'OPERATOR' });
      const summary = await request(app).get(api('/ops/summary')).set(op.headers);
      expect(summary.body.data.attention.uncheckedDestination.map((o: any) => o._id)).toEqual([res.body.data.orderId]);
    });

    it('still may not order from a supplier that is not public', async () => {
      await SupplierProfile.updateOne({ _id: supplier.profile._id }, { verificationStatus: 'PENDING' });
      const res = await order(undefined);
      expect(res.status).toBe(409);
      expect(res.body.error.details.reason).toBe('SUPPLIER_NOT_AVAILABLE');
      expect(await stock()).toBe(100);
    });

    it('can be switched off once old app builds are retired', async () => {
      env.ORDERS_REQUIRE_DELIVERY_PINCODE = true;
      const res = await order(undefined);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PINCODE_REQUIRED');
      expect(await stock()).toBe(100);
      expect((await order('572103')).status).toBe(201);
    });
  });
});
