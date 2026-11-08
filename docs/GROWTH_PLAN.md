# Sthiva growth plan: catalogue, product recognition, experience, growth

Written 2026-11-06 from the owner's request, a review of HomeRun (home-run.co, Bengaluru) and IndiaMART, and
Sthiva's current code. Nothing here is built yet unless marked DONE. Rule from the PRD still applies: no invented
prices, stock, ratings or numbers on the site.

## 1. What the two reference sites teach us

| | HomeRun (home-run.co) | IndiaMART | Sthiva today |
|---|---|---|---|
| Model | Own stock, 60-minute delivery in Bengaluru | Directory: buyers send enquiries, sellers call back | Verified local suppliers, one price, cash on delivery |
| Strength | Speed, brand names on every product, bulk price tiers, deals, cost calculator | Huge seller base, "Post requirement", image search, city pages, Hindi | Verified suppliers, PIN-based availability, weekly stock check, delivery code |
| Weakness for us to beat | One city, needs big warehouses and money | No prices, buyers get spam calls, quality varies | Small catalogue, no brands shown yet, no interiors |

What to copy: **brand names on products**, **bulk price tiers**, **a quantity calculator**, **"send us your list"**
(IndiaMART's Post Requirement), **search by photo**, **city pages**, **regional language**.
What to avoid: IndiaMART's spam calls and hidden prices; HomeRun's warehouse-heavy model (too costly now).

## 2. Categories customers actually need

A house is built in stages, and each stage buys different things. Today Sthiva covers the structure well
(cement, steel, sand, bricks) but stops before the finishing stage, which is where most of the money is spent
and where repeat buying happens.

Current 10 categories (66 material types): cement and concrete, bricks and blocks, sand and aggregates, steel
and TMT, plumbing, electricals, paints and chemicals, plywood and timber, tiles and flooring, machines and tools.

**Add, in this order:**

1. **Hardware and fittings** (HomeRun's biggest range): hinges, drawer channels, handles, door locks, tower
   bolts, screws and nails, adhesives (Fevicol type), sealants, kitchen and wardrobe fittings.
2. **Walls and ceilings (interiors)**: gypsum boards and false-ceiling channels, POP, PVC and WPC wall panels,
   wallpaper, wall cladding (stone and tile), texture paint, wall putty (move here), grid ceilings.
3. **Roofing and waterproofing**: roofing sheets (move from steel), Mangalore tiles, polycarbonate sheets,
   waterproofing membranes and coatings, terrace tiles, rainwater pipes.
4. **Doors and windows**: UPVC and aluminium windows, glass, wooden and steel doors, mosquito mesh, grills.
5. **Bath and kitchen** (split from plumbing): sanitaryware, faucets and showers, kitchen sinks, water heaters,
   chimneys, bathroom accessories.
6. **Flooring** (beyond tiles): laminate, vinyl and SPC flooring, skirting.
7. **Safety, CCTV and power backup**: CCTV, inverters and batteries, safety gear (move here).

**Shop by room and by stage** (new browsing, same products): "Bathroom", "Kitchen", "Bedroom wardrobe",
"Living room ceiling"; and "Foundation", "Walls", "Roof slab", "Plastering", "Finishing". A first-time home
builder thinks in rooms and stages, not in trade category names.

How to add a category: ops console, Settings, Categories (already built), then material types in the catalogue.

## 3. Brands and distributors

The backend already stores a **brand** on every catalogue item and a **brands list** on every supplier
(dealership or stockist). What is missing is using it:

- **Brand pages**: /brand/ultratech, /brand/asian-paints, showing which verified local dealers stock it.
- **"Authorised dealer" badge**: the supplier uploads the dealership certificate (same private upload as GST);
  ops verifies it; the badge shows on their listings. Real proof only, never a claim we have not checked.
- **Distributors as suppliers**: a distributor is a supplier with many brands and a wide PIN range. The current
  supplier account fits; add a "distributor" tag and larger minimum order if needed.
- **Brand catalogues**: ask brands or their distributors for their official product list and photos (with
  permission). Do not copy catalogues from brand websites without permission.

Start with the brands buyers ask for by name in Karnataka: UltraTech, Ramco, Dalmia, ACC (cement); JSW, Tata
Tiscon, Kamdhenu (steel); Asian Paints, Berger, Nerolac (paint); Kajaria, Somany, Johnson (tiles); Finolex,
Havells, Polycab, Anchor (electrical); Ashirvad, Supreme, Astral (pipes); Jaquar, Cera, Hindware (bath);
Greenply, Century (plywood); Hettich, Ebco (hardware). These are names only, to approach; none is a partner.

## 4. Recognising a supplier's products (the "it is difficult sometimes" problem)

Problem: a shop owner has a product but cannot find or describe it in our catalogue (unknown brand, local name,
Kannada name, no spec sheet).

**Proposal: "Add by photo" in the Partner app and seller website.**

1. Supplier takes a photo of the bag, box, label or the item.
2. An AI vision model reads the label: brand, product name, grade or size, ISI/BIS mark, pack size.
3. Sthiva matches it to our catalogue item (cement OPC 53 + UltraTech = known item). If nothing matches, the
   model searches the internet for the product's official page and proposes a new catalogue entry with
   specifications, marked "needs review" (the catalogue already has this flag) for ops to approve.
4. Supplier only confirms and types price and stock.

Also useful:
- **Barcode scan**: many branded items (switches, fittings, paint tins) carry a barcode; scan, look it up in a
  product database, fill the form. GS1 India's product registry (DataKart) is the Indian source; it needs an
  account and may cost money, so check terms first.
- **Local names**: keep a list of trade and Kannada names ("jelly" for aggregate, "M-sand") that point to the
  right item. Search already fixes typos and trade words; extend that list.
- **Buyer side, search by photo**: a buyer photographs a tile or tap they like; we show the closest items.

Cost and setup: the AI key slot already exists in the API (ANTHROPIC_API_KEY, currently empty). Each photo costs
a small amount per lookup; measure on 50 real photos before turning it on for everyone. Owner decides when to
add the key (it is a paid account).

## 5. Best experience for buyers

Already done: PIN-based availability, one clear price, cash on delivery, delivery code, verified suppliers,
weekly stock check, fast site (after the speed work), cookie choice, account deletion.

Next, in order of value:

1. **Quantity calculator**: enter wall size or floor area, get bags of cement, bricks, sand, litres of paint,
   boxes of tiles, then "add all to cart". HomeRun has one; contractors and first-time builders love it.
2. **"Send your list"**: upload a photo of a handwritten material list or a contractor's estimate (BOQ). Ops (or
   the AI step above) turns it into a cart and quote. This is how most Indian sites buy today.
3. **Bulk price tiers** shown on the product page ("10+ bags", "50+ bags"), from the supplier's real tiers.
4. **WhatsApp**: order updates and "chat to order" on WhatsApp (the API has an Interakt slot); support number
   on the site once the owner chooses it.
5. **Kannada** version of the shop (then Hindi, Telugu, Tamil when entering those states).
6. **Brand, grade and certificate on every product** (BIS / ISI number, warranty from the brand) so buyers can
   trust the item, not only the seller.
7. **Visualiser for interiors** (later): try a paint shade or a tile on a photo of your own room.
8. **Reviews** after delivery, from real buyers only (the Review model exists).
9. **Order again** and **site projects**: save a site address and its orders, reorder the same list.

## 6. Growth plan

Supply first, then demand. Buyers leave if the shelf is empty.

**Month 1 (Tumakuru):** 15 to 25 verified suppliers covering cement, steel, sand, bricks, paint, electrical,
plumbing; every listing with brand and real price. Owner visits shops in person; supplier joins in 10 minutes
on seller.sthiva.com.

**Month 2 to 3:** the people who decide what gets bought on a site are the **contractor, mason, electrician,
plumber and painter**. A trade programme: free account, order for their clients, reward points or a small
cash-back per delivered order, a "Sthiva verified contractor" listing later. This is how building-material
brands sell in India.

**Marketing that fits the budget:**
- Google Business Profile for Sthiva (Tumakuru), with real photos; local search "cement shop near me".
- City and material pages on the site ("Cement in Tumakuru"), showing real suppliers and real prices only.
- WhatsApp groups of local contractors and builders; hardware shop counters (QR posters).
- Instagram and YouTube shorts: "how many bags of cement for a 1,000 sq ft slab", calculator clips.
- Product Hunt launch (kit in docs/PRODUCT_HUNT.md) for credibility with investors, not for Tumakuru buyers.

**Later money makers:** commission per order (built), featured listings for suppliers, brand promotions, credit
for contractors through a lending partner (needs the company and RBI-registered partner), Sthiva-branded
logistics.

**Expansion:** next Karnataka towns (Tiptur, Hassan, Davanagere, Mysuru), then Bengaluru outskirts, then other
states with their language.

## 7. What Claude can build next (no money needed)

| # | Item | Size |
|---|---|---|
| 1 | New categories and room/stage browsing (sections 2) | small, mostly ops data + 1 page |
| 2 | Brand pages and brand filter, dealer certificate upload and badge (section 3) | medium |
| 3 | Quantity calculator with "add all to cart" (5.1) | medium |
| 4 | "Send your list" photo upload to ops (5.2, manual first) | medium |
| 5 | Bulk price tiers on product pages (5.3) | small to medium |
| 6 | Kannada shop (5.5) | medium |
| 7 | Add-by-photo for suppliers (section 4) | medium; needs the AI key (paid) to go live |

Owner decisions needed: which categories to open first (suppliers must exist for them), the trade-programme
reward (money), the AI key (money), WhatsApp number.
