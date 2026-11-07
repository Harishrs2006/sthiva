import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG, CATALOG_CATEGORIES, catalogItem } from '../src/catalog/data';
import { searchCatalog } from '../src/catalog/search';
import { buyerDeliveryPhrase, deliveryTimeLabel, deliveryTimePhrase, formatDeliveryDate, istDate } from '../src/delivery';

const PUBLIC = path.join(__dirname, '../../../apps/buyer-web/public');

describe('catalogue data', () => {
  it('has unique ids and category slugs', () => {
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const slugs = CATALOG_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('puts every item in a known category and one of its groups', () => {
    for (const item of CATALOG) {
      const category = CATALOG_CATEGORIES.find((c) => c.slug === item.categorySlug);
      expect(category, item.id).toBeDefined();
      expect(category!.groups, item.id).toContain(item.group);
    }
  });

  it('every category has items and slugs the API would make from its name', () => {
    for (const c of CATALOG_CATEGORIES) {
      expect(CATALOG.some((i) => i.categorySlug === c.slug), c.slug).toBe(true);
      // apps/api slugify: lower case, runs of other characters become one hyphen
      expect(c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), c.name).toBe(c.slug);
    }
  });

  it('every photo and illustration exists', () => {
    for (const c of CATALOG_CATEGORIES) expect(fs.existsSync(path.join(PUBLIC, c.photo)), c.photo).toBe(true);
    for (const i of CATALOG) expect(fs.existsSync(path.join(PUBLIC, i.image)), i.image).toBe(true);
  });

  it('made-to-order items explain how the date is set', () => {
    for (const i of CATALOG.filter((x) => x.madeToOrder)) expect(i.note, i.id).toMatch(/confirm/i);
  });
});


describe('search finds the new interiors', () => {
  it.each([
    ['wardrobe', 'wardrobes'],
    ['mangalore tiles', 'clay-roof-tiles'],
    ['false ceiling', 'gypsum-false-ceiling'],
    ['hinges', 'cabinet-hinges'],
    ['upvc window', 'upvc-windows'],
    ['mandir', 'pooja-units'],
  ])('%s', (q, id) => {
    expect(searchCatalog(q).items.map((i) => i.id)).toContain(id);
  });
});

describe('delivery wording', () => {
  it.each([
    [0, 0, 'Same day'], [1, 1, '1 day'], [2, 3, '2 to 3 days'], [0, 2, 'Same day to 2 days'],
    [14, 21, '2 to 3 weeks'], [14, 14, '2 weeks'], [7, 7, '7 days'], [10, 20, '10 to 20 days'], [3, 1, '3 days'],
  ])('%i to %i days reads "%s"', (lo, hi, label) => {
    expect(deliveryTimeLabel(lo, hi)).toBe(label);
  });
  it('defaults to the API default of 2 days and formats dates without a time-zone shift', () => {
    expect(deliveryTimeLabel(undefined)).toBe('2 days');
    expect([deliveryTimePhrase(0, 0), deliveryTimePhrase(0, 2), deliveryTimePhrase(14, 21)]).toEqual(['the same day', 'within 2 days', 'in 2 to 3 weeks']);
    expect(formatDeliveryDate('2026-11-12')).toMatch(/Thu.*12.*Nov/);
    expect(istDate(0, new Date('2026-11-06T20:00:00Z'))).toBe('2026-11-07'); // 01:30 IST next day
  });
});

describe('what buyers are told', () => {
  it('a single number gets one day of slack; ranges and weeks stay', () => {
    expect(buyerDeliveryPhrase(2)).toBe('in 2 to 3 days');
    expect(buyerDeliveryPhrase(2, 2)).toBe('in 2 to 3 days');
    expect(buyerDeliveryPhrase(2, 4)).toBe('in 2 to 4 days');
    expect(buyerDeliveryPhrase(0, 0)).toBe('the same day or next day');
    expect(buyerDeliveryPhrase(14, 21)).toBe('in 2 to 3 weeks');
    expect(buyerDeliveryPhrase(14, 14)).toBe('in 2 weeks');
  });
});
