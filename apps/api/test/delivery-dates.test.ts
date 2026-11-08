import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { seedUser, seedSupplier, seedProduct, newKey, SITE, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { CatalogItem } from '../src/infrastructure/database/models/CatalogItem.model';
import { checkDeliveryDate, deliveryWindow, istToday } from '../src/features/orders/delivery-window';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;
type Who = { headers: Record<string, string> };

let buyer: Awaited<ReturnType<typeof seedUser>>;
let a: Awaited<ReturnType<typeof seedSupplier>>;
let b: Awaited<ReturnType<typeof seedSupplier>>;
let listing: Record<string, Types.ObjectId>;

/** YYYY-MM-DD, `days` from today in India */
const inDays = (days: number) => {
  const d = new Date(`${istToday()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  a = await seedSupplier('a');
  b = await seedSupplier('b');
  const first = await seedProduct(a.profile._id, { basePrice: 400, deliveryDays: 2, deliveryDaysMax: 3 });
  const item = (await CatalogItem.create({ name: 'Wardrobe', slug: 'wardrobe-x', categoryId: first.categoryId, unit: 'PIECE', createdBy: { role: 'ADMIN' } }))._id;
  await Product.updateOne({ _id: first._id }, { catalogItemId: item });
  const second = await seedProduct(b.profile._id, { basePrice: 400, catalogItemId: item, deliveryDays: 14, deliveryDaysMax: 21 });
  listing = { a: first._id, b: second._id };
});

async function place() {
  const res = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
    .send({ items: [{ productId: listing.a.toString(), quantity: 1 }], deliveryAddress: SITE });
  expect(res.status).toBe(201);
  return res.body.data.orderId as string;
}
const accept = (who: Who, id: string, body?: object) => request(app).post(api(`/suppliers/me/orders/${id}/accept`)).set(who.headers).send(body ?? {});
const changeDate = (who: Who, id: string, deliveryDate: string) =>
  request(app).patch(api(`/suppliers/me/orders/${id}/delivery-date`)).set(who.headers).send({ deliveryDate });
const get = async (id: string) => (await Order.findById(id).lean())!;

describe('delivery window helpers', () => {
  it('takes the slowest line for both ends; a missing longest time means the shortest', () => {
    expect(deliveryWindow([{ deliveryDays: 1 }, { deliveryDays: 2, deliveryDaysMax: 5 }])).toEqual({ minDays: 2, maxDays: 5 });
    expect(deliveryWindow([{ deliveryDays: 3, deliveryDaysMax: 1 }])).toEqual({ minDays: 3, maxDays: 3 });
    expect(deliveryWindow([{}])).toEqual({ minDays: 2, maxDays: 2 });
  });

  it('accepts today up to six months ahead, as a real date', () => {
    expect(checkDeliveryDate(inDays(0))).toBeNull();
    expect(checkDeliveryDate(inDays(180))).toBeNull();
    expect(checkDeliveryDate(inDays(-1))).toMatch(/past/);
    expect(checkDeliveryDate(inDays(181))).toMatch(/six months/);
    expect(checkDeliveryDate('2026-02-30')).toMatch(/valid/);
    expect(checkDeliveryDate('12-11-2026')).toMatch(/valid/);
  });
});

describe('expected delivery and confirmed date', () => {
  it('the quote and the order carry the listing\'s usual delivery time', async () => {
    const quote = await request(app).post(api('/orders/quote')).set(buyer.headers)
      .send({ items: [{ productId: listing.a.toString(), quantity: 1 }] });
    expect(quote.status).toBe(200);
    expect(quote.body.data.expectedDelivery).toEqual({ minDays: 2, maxDays: 3 });

    const id = await place();
    const mine = await request(app).get(api(`/orders/${id}`)).set(buyer.headers);
    expect(mine.body.data.expectedDelivery).toEqual({ minDays: 2, maxDays: 3 });
    expect(mine.body.data.deliveryDate).toBeUndefined();
  });

  it('the supplier confirms a date when accepting; bad dates are refused and nothing changes', async () => {
    const id = await place();
    expect((await accept(a, id, { deliveryDate: inDays(-1) })).status).toBe(400);
    expect((await accept(a, id, { deliveryDate: 'tomorrow' })).status).toBe(400);
    expect((await get(id)).status).toBe('PENDING');

    const ok = await accept(a, id, { deliveryDate: inDays(3) });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ status: 'CONFIRMED', deliveryDate: inDays(3) });
    const mine = await request(app).get(api(`/orders/${id}`)).set(buyer.headers);
    expect(mine.body.data.deliveryDate).toBe(inDays(3));
  });

  it('older app versions can still accept without a date', async () => {
    const id = await place();
    const ok = await accept(a, id);
    expect(ok.status).toBe(200);
    expect(ok.body.data.deliveryDate).toBeUndefined();
  });

  it('the supplier can set or change the date until delivery, only for their own accepted orders', async () => {
    const id = await place();
    expect((await changeDate(a, id, inDays(2))).status).toBe(409); // not accepted yet
    await accept(a, id);
    expect((await changeDate(b, id, inDays(2))).status).toBe(404); // not b's order
    expect((await changeDate(a, id, inDays(400))).status).toBe(400);

    const set = await changeDate(a, id, inDays(2));
    expect(set.status).toBe(200);
    expect(set.body.data.deliveryDate).toBe(inDays(2));
    const moved = await changeDate(a, id, inDays(5));
    expect(moved.body.data.deliveryDate).toBe(inDays(5));

    await Order.updateOne({ _id: id }, { status: 'DELIVERED' });
    expect((await changeDate(a, id, inDays(6))).status).toBe(409);
  });

  it('when the order moves to another supplier, the expected time follows their listing', async () => {
    const id = await place();
    await Product.updateOne({ _id: listing.b }, { basePrice: 400 });
    const r = await request(app).post(api(`/suppliers/me/orders/${id}/reject`)).set(a.headers).send({ reason: 'Fully booked this month' });
    expect(r.status).toBe(200);
    const o = await get(id);
    expect(o.supplierId.toString()).toBe(b.profile._id.toString());
    expect(o.expectedDelivery).toEqual({ minDays: 14, maxDays: 21 });
  });
});

describe('listing delivery time', () => {
  it('is a range; the longest cannot be shorter than the shortest, and edits keep it valid', async () => {
    const bad = await request(app).patch(api(`/suppliers/me/products/${listing.a}`)).set(a.headers).send({ deliveryDaysMax: 1 });
    expect(bad.status).toBe(400);
    const longer = await request(app).patch(api(`/suppliers/me/products/${listing.a}`)).set(a.headers).send({ deliveryDays: 7 });
    expect(longer.status).toBe(200);
    const p = (await Product.findById(listing.a).lean())!;
    expect([p.deliveryDays, p.deliveryDaysMax]).toEqual([7, 7]);
    const both = await request(app).patch(api(`/suppliers/me/products/${listing.a}`)).set(a.headers).send({ deliveryDays: 14, deliveryDaysMax: 28 });
    expect(both.status).toBe(200);
    expect(both.body.data).toMatchObject({ deliveryDays: 14, deliveryDaysMax: 28 });
    const tooLong = await request(app).patch(api(`/suppliers/me/products/${listing.a}`)).set(a.headers).send({ deliveryDaysMax: 120 });
    expect(tooLong.status).toBe(400);
  });
});
