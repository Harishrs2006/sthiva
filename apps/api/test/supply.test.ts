import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, seedProduct, newKey, SITE, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product, ON_ORDER_STOCK } from '../src/infrastructure/database/models/Product.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { CatalogItem } from '../src/infrastructure/database/models/CatalogItem.model';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

let buyer: Awaited<ReturnType<typeof seedUser>>;
let a: Awaited<ReturnType<typeof seedSupplier>>;
let b: Awaited<ReturnType<typeof seedSupplier>>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  a = await seedSupplier('a');
  b = await seedSupplier('b');
});

const place = (productId: unknown, quantity = 2) =>
  request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
    .send({ items: [{ productId: String(productId), quantity }], deliveryAddress: SITE });

describe('in stock and on order listings', () => {
  it('an on-order listing never runs out and marks the order as in process', async () => {
    const p = await seedProduct(a.profile._id, { stockQuantity: 0, status: 'OUT_OF_STOCK' });
    const set = await request(app).patch(api(`/suppliers/me/products/${p._id}`)).set(a.headers).send({ supply: 'ON_ORDER', deliveryDays: 10, deliveryDaysMax: 15 });
    expect(set.status).toBe(200);
    expect(set.body.data).toMatchObject({ supply: 'ON_ORDER', stockQuantity: ON_ORDER_STOCK, status: 'ACTIVE' });

    // a stock figure sent for an on-order listing is ignored
    const stock = await request(app).patch(api(`/suppliers/me/products/${p._id}`)).set(a.headers).send({ stockQuantity: 3 });
    expect(stock.body.data.stockQuantity).toBe(ON_ORDER_STOCK);
    // not flagged as low stock
    const low = await request(app).get(api('/suppliers/me/products?lowStock=1')).set(a.headers);
    expect(low.body.data).toHaveLength(0);

    const quote = await request(app).post(api('/orders/quote')).set(buyer.headers).send({ items: [{ productId: String(p._id), quantity: 500 }] });
    expect(quote.body.data).toMatchObject({ onOrder: true, expectedDelivery: { minDays: 10, maxDays: 15 } });
    const res = await place(p._id, 500);
    expect(res.status).toBe(201);
    expect((await Order.findById(res.body.data.orderId).lean())!.onOrder).toBe(true);

    // back to in stock: needs a real figure, 0 if none given
    const back = await request(app).patch(api(`/suppliers/me/products/${p._id}`)).set(a.headers).send({ supply: 'IN_STOCK' });
    expect(back.body.data).toMatchObject({ supply: 'IN_STOCK', stockQuantity: 0, status: 'OUT_OF_STOCK' });
  });

  it('a new listing can be created as on order without stock', async () => {
    const cat = (await seedProduct(a.profile._id)).categoryId;
    const res = await request(app).post(api('/suppliers/me/products')).set(a.headers).send({
      name: 'Kajaria wall tile 300 x 600 (on order)', categoryId: String(cat), description: 'Ordered from the company for you',
      unit: 'BOX', basePrice: 650, supply: 'ON_ORDER', deliveryDays: 7, deliveryDaysMax: 10, status: 'ACTIVE',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ supply: 'ON_ORDER', stockQuantity: ON_ORDER_STOCK, status: 'ACTIVE' });
  });
});

describe('nearest supplier at the same price', () => {
  it('the order goes to the nearer of two suppliers charging the same', async () => {
    // a is in Bengaluru, b is in Tumakuru next to the site (SITE is in Tumakuru)
    await SupplierProfile.updateOne({ _id: a.profile._id }, { location: { lat: 12.97, lng: 77.59 } });
    await SupplierProfile.updateOne({ _id: b.profile._id }, { location: { lat: 13.341, lng: 77.101 } });
    const la = await seedProduct(a.profile._id, { basePrice: 400 });
    const item = (await CatalogItem.create({ name: 'Cement', slug: 'cement-near', categoryId: la.categoryId, unit: 'BAG', createdBy: { role: 'ADMIN' } }))._id;
    await Product.updateOne({ _id: la._id }, { catalogItemId: item });
    await seedProduct(b.profile._id, { basePrice: 400, catalogItemId: item });

    const res = await place(la._id);
    expect(res.status).toBe(201);
    expect((await Order.findById(res.body.data.orderId).lean())!.supplierId.toString()).toBe(b.profile._id.toString());
  });

  it('a lower price still wins over distance', async () => {
    await SupplierProfile.updateOne({ _id: a.profile._id }, { location: { lat: 12.97, lng: 77.59 } });
    await SupplierProfile.updateOne({ _id: b.profile._id }, { location: { lat: 13.341, lng: 77.101 } });
    const la = await seedProduct(a.profile._id, { basePrice: 380 });
    const item = (await CatalogItem.create({ name: 'Cement', slug: 'cement-price', categoryId: la.categoryId, unit: 'BAG', createdBy: { role: 'ADMIN' } }))._id;
    await Product.updateOne({ _id: la._id }, { catalogItemId: item });
    await seedProduct(b.profile._id, { basePrice: 400, catalogItemId: item });

    const res = await place(la._id);
    expect((await Order.findById(res.body.data.orderId).lean())!.supplierId.toString()).toBe(a.profile._id.toString());
  });
});
