import type { CatalogCategory, CatalogItem, ListingUnit } from './types';
import { INTERIOR_CATEGORIES, INTERIOR_ITEMS } from './interiors';

// Material types, specs, trade units and well-known brands in the Indian market (checked against
// BIS standards and public product listings, October 2026). Brand lists say what exists in the
// market, not what Sthiva suppliers stock: buyers only ever order from real supplier listings.
// No prices, stock or delivery promises live here.

const I = (name: string) => `/illustrations/${name}.svg`;

const CEMENT_BRANDS = ['UltraTech', 'ACC', 'Ambuja', 'Dalmia', 'Ramco', 'Shree', 'JK Lakshmi', 'Chettinad', 'Penna', 'Zuari', 'Coromandel King', 'Bharathi', 'Maha'];
const TMT_BRANDS = ['TATA Tiscon', 'JSW Neosteel', 'SAIL', 'Vizag Steel (RINL)', 'Jindal Panther', 'Kamdhenu', 'Shyam Steel', 'Sunvik'];
const WIRE_BRANDS = ['Havells', 'Polycab', 'Finolex', 'V-Guard', 'KEI', 'RR Kabel', 'Anchor by Panasonic'];
const SWITCH_BRANDS = ['Anchor by Panasonic', 'Legrand', 'Havells', 'Schneider Electric', 'GM Modular', 'Lisha', 'Polycab', 'V-Guard'];
const PIPE_BRANDS = ['Astral', 'Ashirvad', 'Supreme', 'Finolex', 'Prince', 'Jain'];
const BATH_BRANDS = ['Jaquar', 'Hindware', 'Cera', 'Parryware', 'Kohler', 'Grohe', 'Essco'];
const PAINT_BRANDS = ['Asian Paints', 'Berger', 'Nerolac', 'Dulux', 'Birla Opus', 'Indigo', 'Nippon Paint', 'JSW Paints'];
const PLY_BRANDS = ['Century', 'Greenply', 'Kitply', 'Archidply'];
const TILE_BRANDS = ['Kajaria', 'Somany', 'H&R Johnson', 'Orientbell', 'Nitco', 'AGL', 'Simpolo', 'Varmora'];

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { slug: 'cement-concrete', name: 'Cement & Concrete', photo: '/categories/cement-concrete.jpg', tagline: 'OPC, PPC, PSC, white cement and ready-mix concrete.', groups: ['Cement', 'Ready-mix concrete'] },
  { slug: 'bricks-blocks', name: 'Bricks & Blocks', photo: '/categories/bricks-blocks.jpg', tagline: 'Clay and fly ash bricks, AAC and concrete blocks, pavers.', groups: ['Bricks', 'Blocks', 'Paving', 'Roof tiles'] },
  { slug: 'sand-aggregates', name: 'Sand & Aggregates', photo: '/categories/sand-aggregates.jpg', tagline: 'M-sand, P-sand and jelly in every size, by the tonne or brass.', groups: ['Sand', 'Aggregates (jelly)', 'Fill and road base'] },
  { slug: 'steel-tmt-bars', name: 'Steel & TMT Bars', photo: '/categories/steel-tmt-bars.jpg', tagline: 'TMT bars by grade and diameter, binding wire, structural steel, sheets.', groups: ['Reinforcement', 'Structural steel', 'Roofing', 'Doors and grills'] },
  { slug: 'plumbing', name: 'Plumbing', photo: '/categories/plumbing.jpg', tagline: 'Pipes and fittings, sanitaryware, taps and showers, kitchen sinks, tanks and pumps.', groups: ['Pipes', 'Fittings and valves', 'Bath and sanitary', 'Kitchen sinks', 'Tanks and pumps', 'Rainwater'] },
  { slug: 'electricals', name: 'Electricals', photo: '/categories/electricals.jpg', tagline: 'House wires, switches, MCBs, conduits, lights, fans, geysers and chimneys.', groups: ['Wires and cables', 'Switches and protection', 'Conduits and earthing', 'Lighting and appliances'] },
  { slug: 'paints-chemicals', name: 'Paints & Chemicals', photo: '/categories/paints-chemicals.jpg', tagline: 'Emulsions, textures, wallpaper, primers, putty and waterproofing.', groups: ['Paints', 'Wall finishes', 'Preparation', 'Waterproofing'] },
  { slug: 'plywood-timber', name: 'Plywood & Timber', photo: '/categories/plywood-timber.jpg', tagline: 'Plywood, laminates, modular furniture, doors, windows, glass and false ceilings.', groups: ['Plywood', 'Boards and laminates', 'Modular furniture', 'Doors and timber', 'Windows and glass', 'Ceilings and wall panels'] },
  { slug: 'machines-tools', name: 'Machines & Tools', photo: '/categories/machines-tools.jpg', tagline: 'Power tools, site equipment, scaffolding and safety gear.', groups: ['Tools', 'Site equipment', 'Safety'] },
  { slug: 'tiles-flooring', name: 'Tiles & Flooring', photo: '/categories/tiles-flooring.jpg', tagline: 'Vitrified and ceramic tiles, natural stone, wood and vinyl flooring, adhesives.', groups: ['Tiles', 'Natural stone', 'Wood and vinyl flooring', 'Wall cladding', 'Fixing'] },
  ...INTERIOR_CATEGORIES,
];

export const CATALOG: CatalogItem[] = [
  // ── Cement & Concrete ─────────────────────────────────────────────
  {
    id: 'opc-53-cement', name: 'OPC 53 grade cement', categorySlug: 'cement-concrete', group: 'Cement',
    summary: 'Ordinary Portland Cement that reaches 53 MPa at 28 days. Gains strength fast.',
    uses: ['RCC slabs, beams and columns', 'Precast and high-strength concrete', 'Work that needs early de-shuttering'],
    standard: 'IS 269', specs: [{ label: '28-day strength', value: '53 MPa minimum' }, { label: 'Pack', value: '50 kg bag' }],
    variants: [], soldAs: [{ label: 'Per 50 kg bag' }, { label: 'Per tonne', note: '20 bags' }],
    brands: CEMENT_BRANDS, search: 'OPC 53', aliases: ['opc 53', '53 grade'], image: I('cement'), calculator: { kind: 'bags', kgPerBag: 50 },
  },
  {
    id: 'opc-43-cement', name: 'OPC 43 grade cement', categorySlug: 'cement-concrete', group: 'Cement',
    summary: 'Ordinary Portland Cement at 43 MPa. A general-purpose grade for everyday RCC and masonry.',
    uses: ['General RCC work', 'Masonry and plastering', 'Flooring'],
    standard: 'IS 269', specs: [{ label: '28-day strength', value: '43 MPa minimum' }, { label: 'Pack', value: '50 kg bag' }],
    variants: [], soldAs: [{ label: 'Per 50 kg bag' }, { label: 'Per tonne', note: '20 bags' }],
    brands: CEMENT_BRANDS, search: 'OPC 43', aliases: ['opc 43', '43 grade'], image: I('cement'), calculator: { kind: 'bags', kgPerBag: 50 },
  },
  {
    id: 'ppc-cement', name: 'PPC cement', categorySlug: 'cement-concrete', group: 'Cement',
    summary: 'Portland Pozzolana Cement, blended with fly ash. Slower to set, less heat, better durability.',
    uses: ['Plastering and brickwork', 'Foundations and mass concrete', 'Residential RCC'],
    standard: 'IS 1489 (Part 1)', specs: [{ label: 'Blend', value: 'OPC clinker with fly ash' }, { label: 'Pack', value: '50 kg bag' }],
    variants: [], soldAs: [{ label: 'Per 50 kg bag' }, { label: 'Per tonne', note: '20 bags' }],
    brands: CEMENT_BRANDS, search: 'PPC cement', aliases: ['ppc', 'pozzolana'], image: I('cement'), calculator: { kind: 'bags', kgPerBag: 50 },
  },
  {
    id: 'psc-cement', name: 'PSC cement', categorySlug: 'cement-concrete', group: 'Cement',
    summary: 'Portland Slag Cement, blended with ground blast-furnace slag. Good against sulphates and chlorides.',
    uses: ['Coastal and marine work', 'Sewage and water-retaining structures', 'Mass concrete'],
    standard: 'IS 455', specs: [{ label: 'Blend', value: 'OPC clinker with GGBS slag' }, { label: 'Pack', value: '50 kg bag' }],
    variants: [], soldAs: [{ label: 'Per 50 kg bag' }, { label: 'Per tonne', note: '20 bags' }],
    brands: ['JSW', 'UltraTech', 'Dalmia', 'Ramco'], search: 'PSC cement', aliases: ['psc', 'slag cement'], image: I('cement'), calculator: { kind: 'bags', kgPerBag: 50 },
  },
  {
    id: 'white-cement', name: 'White cement', categorySlug: 'cement-concrete', group: 'Cement',
    summary: 'Low-iron Portland cement for finishes, joints and decorative work.',
    uses: ['Tile and marble joints', 'Decorative finishes', 'Base for wall putty'],
    standard: 'IS 8042', specs: [{ label: 'Colour', value: 'White' }],
    variants: [{ label: 'Pack', options: ['1 kg', '5 kg', '40 kg', '50 kg'] }], soldAs: [{ label: 'Per pack or bag' }],
    brands: ['Birla White', 'JK White'], search: 'white cement', image: I('cement'),
  },
  {
    id: 'ready-mix-concrete', name: 'Ready-mix concrete (RMC)', categorySlug: 'cement-concrete', group: 'Ready-mix concrete',
    summary: 'Concrete batched at a plant to a specified grade and delivered in a transit mixer.',
    uses: ['Slabs and roofs in one pour', 'Foundations and rafts', 'Large columns and walls'],
    standard: 'IS 4926', specs: [{ label: 'Delivery', value: 'Transit mixer; pump on request' }],
    variants: [{ label: 'Grade', options: ['M10', 'M15', 'M20', 'M25', 'M30', 'M35', 'M40'] }],
    soldAs: [{ label: 'Per cubic metre (m³)' }],
    brands: ['UltraTech', 'ACC', 'Nuvoco', 'Prism Johnson'], search: 'ready mix concrete', aliases: ['rmc', 'ready mix'], image: I('cement'),
    note: 'Pump charges, minimum loads and pour timing are set by each supplier. Confirm before ordering.',
  },

  // ── Bricks & Blocks ───────────────────────────────────────────────
  {
    id: 'red-clay-bricks', name: 'Red clay bricks', categorySlug: 'bricks-blocks', group: 'Bricks',
    summary: 'Kiln-fired clay bricks, the traditional walling unit across India.',
    uses: ['Load-bearing and partition walls', 'Compound walls', 'Brick-on-edge and paving'],
    standard: 'IS 1077', specs: [{ label: 'Traditional size', value: 'About 230 × 110 × 75 mm (varies by kiln)' }, { label: 'Modular size', value: '190 × 90 × 90 mm' }],
    variants: [{ label: 'Type', options: ['Country (hand-moulded)', 'Table-moulded', 'Wire-cut (machine-made)'] }],
    soldAs: [{ label: 'Per 1,000 nos' }, { label: 'Per piece' }],
    brands: [], search: 'red brick', aliases: ['clay brick', 'red brick', 'wire cut', 'table moulded', 'table molded', 'facing brick', 'country brick'], image: I('bricks'), calculator: { kind: 'count', perLabel: 'thousand', per: 1000 },
    note: 'Clay bricks are made by local kilns, so size and strength vary. Ask the supplier for the class and a sample.',
  },
  {
    id: 'fly-ash-bricks', name: 'Fly ash bricks', categorySlug: 'bricks-blocks', group: 'Bricks',
    summary: 'Machine-pressed bricks of fly ash, lime and sand. Uniform size, smooth faces.',
    uses: ['Walls with less plaster', 'Partition and load-bearing walls'],
    standard: 'IS 12894', specs: [{ label: 'Common size', value: '230 × 110 × 75 mm' }, { label: 'Colour', value: 'Grey' }],
    variants: [], soldAs: [{ label: 'Per 1,000 nos' }, { label: 'Per piece' }],
    brands: [], search: 'fly ash brick', aliases: ['fly ash'], image: I('blocks'), calculator: { kind: 'count', perLabel: 'thousand', per: 1000 },
  },
  {
    id: 'aac-blocks', name: 'AAC blocks', categorySlug: 'bricks-blocks', group: 'Blocks',
    summary: 'Autoclaved aerated concrete: light, insulating blocks laid with thin-joint mortar.',
    uses: ['Partition walls in framed buildings', 'Upper floors where weight matters', 'Thermal insulation'],
    standard: 'IS 2185 (Part 3)', specs: [{ label: 'Face size', value: '600 × 200 mm' }, { label: 'Density', value: 'About 550 to 700 kg/m³' }],
    variants: [{ label: 'Thickness', options: ['75 mm', '100 mm', '125 mm', '150 mm', '200 mm', '230 mm'] }],
    soldAs: [{ label: 'Per cubic metre (m³)' }, { label: 'Per piece' }],
    brands: ['Magicrete', 'Biltech', 'UltraTech Xtralite', 'HIL Aerocon', 'Siporex'], search: 'AAC block', aliases: ['aac', 'aerated'], image: I('blocks'),
  },
  {
    id: 'solid-concrete-blocks', name: 'Solid concrete blocks', categorySlug: 'bricks-blocks', group: 'Blocks',
    summary: 'Dense cement-aggregate blocks, strong and quick to lay.',
    uses: ['Load-bearing walls', 'Compound walls', 'Foundations above plinth'],
    standard: 'IS 2185 (Part 1)', specs: [{ label: 'Face size', value: '400 × 200 mm' }],
    variants: [{ label: 'Thickness', options: ['100 mm', '150 mm', '200 mm'] }], soldAs: [{ label: 'Per piece' }],
    brands: [], search: 'solid block', aliases: ['solid block', 'solid concrete block', 'cement solid block', 'concrete block'], image: I('blocks'),
  },
  {
    id: 'hollow-concrete-blocks', name: 'Hollow concrete blocks', categorySlug: 'bricks-blocks', group: 'Blocks',
    summary: 'Concrete blocks with cores, lighter than solid blocks and quicker to lay.',
    uses: ['Partition and compound walls', 'Walls with vertical reinforcement in the cores'],
    standard: 'IS 2185 (Part 1)', specs: [{ label: 'Face size', value: '400 × 200 mm' }],
    variants: [{ label: 'Thickness', options: ['100 mm', '150 mm', '200 mm'] }], soldAs: [{ label: 'Per piece' }],
    brands: [], search: 'hollow block', aliases: ['hollow block'], image: I('blocks'),
  },
  {
    id: 'paver-blocks', name: 'Interlocking paver blocks', categorySlug: 'bricks-blocks', group: 'Paving',
    summary: 'Precast concrete pavers laid on a sand bed, for driveways and outdoor floors.',
    uses: ['Driveways and parking', 'Walkways and courtyards'],
    standard: 'IS 15658', specs: [{ label: 'Shapes', value: 'I-shape, zig-zag, rectangle and more' }],
    variants: [{ label: 'Thickness', options: ['60 mm', '80 mm', '100 mm'] }],
    soldAs: [{ label: 'Per square metre or square foot' }, { label: 'Per piece' }],
    brands: [], search: 'paver block', aliases: ['paver'], image: I('blocks'),
  },

  // ── Sand & Aggregates ─────────────────────────────────────────────
  {
    id: 'm-sand', name: 'M-sand (concrete sand)', categorySlug: 'sand-aggregates', group: 'Sand',
    summary: 'Manufactured sand: hard rock crushed and graded to replace river sand in concrete.',
    uses: ['Concrete (RCC and PCC)', 'Block and brick masonry mortar'],
    standard: 'IS 383 (fine aggregate)', specs: [{ label: 'Grading', value: 'Up to 4.75 mm, usually Zone II' }],
    variants: [], soldAs: [{ label: 'Per tonne' }, { label: 'Per cubic foot (cft)' }, { label: 'Per brass', note: '100 cft, about 2.83 m³' }, { label: 'Per truck load' }],
    brands: [], search: 'M sand', aliases: ['manufactured sand', 'm sand', 'msand'], image: I('sand'), calculator: { kind: 'bulk', densityTPerM3: 1.6, material: 'sand' },
  },
  {
    id: 'p-sand', name: 'P-sand (plastering sand)', categorySlug: 'sand-aggregates', group: 'Sand',
    summary: 'Finer manufactured sand, washed and graded for smooth plaster.',
    uses: ['Wall and ceiling plaster', 'Tile bedding mortar'],
    specs: [{ label: 'Grading', value: 'Finer, typically up to 2.36 mm' }],
    variants: [], soldAs: [{ label: 'Per tonne' }, { label: 'Per cubic foot (cft)' }, { label: 'Per brass', note: '100 cft' }],
    brands: [], search: 'P sand', aliases: ['plastering sand', 'p sand', 'psand'], image: I('sand'), calculator: { kind: 'bulk', densityTPerM3: 1.6, material: 'sand' },
  },
  {
    id: 'river-sand', name: 'River sand', categorySlug: 'sand-aggregates', group: 'Sand',
    summary: 'Natural sand from river beds.',
    uses: ['Plastering', 'Concrete where specified'],
    specs: [], variants: [], soldAs: [{ label: 'Per tonne' }, { label: 'Per brass', note: '100 cft' }],
    brands: [], search: 'river sand', aliases: ['river sand'], image: I('sand'), calculator: { kind: 'bulk', densityTPerM3: 1.6, material: 'sand' },
    note: 'River sand mining is regulated by each state. Buy only from suppliers who can show it was legally sourced.',
  },
  {
    id: 'jelly-aggregate', name: 'Jelly (coarse aggregate)', categorySlug: 'sand-aggregates', group: 'Aggregates (jelly)',
    summary: 'Crushed granite stone, graded by size. 20 mm is the everyday size for RCC.',
    uses: ['6 mm: precast work and hollow blocks', '12 mm: thin slabs and sections', '20 mm: most RCC work', '40 mm: PCC, foundations and roads'],
    standard: 'IS 383 (coarse aggregate)', specs: [{ label: 'Material', value: 'Crushed granite or basalt' }],
    variants: [{ label: 'Size', options: ['6 mm', '12 mm', '20 mm', '40 mm'] }],
    soldAs: [{ label: 'Per tonne' }, { label: 'Per cubic foot (cft)' }, { label: 'Per brass', note: '100 cft' }, { label: 'Per truck load' }],
    brands: [], search: 'jelly aggregate', aliases: ['jelly', 'crushed stone', 'stone chips', 'kapchi', 'blue metal', 'aggregate'], image: I('sand'), calculator: { kind: 'bulk', densityTPerM3: 1.5, material: 'aggregate' },
  },
  {
    id: 'stone-dust', name: 'Quarry dust', categorySlug: 'sand-aggregates', group: 'Fill and road base',
    summary: 'Fine crusher dust left after making aggregate.',
    uses: ['Paver and tile bedding', 'Filling and levelling'],
    specs: [], variants: [], soldAs: [{ label: 'Per tonne' }, { label: 'Per brass', note: '100 cft' }],
    brands: [], search: 'quarry dust', aliases: ['quarry dust', 'stone dust', 'crusher dust'], image: I('sand'), calculator: { kind: 'bulk', densityTPerM3: 1.6, material: 'dust' },
  },
  {
    id: 'gsb-wmm', name: 'GSB and wet mix macadam', categorySlug: 'sand-aggregates', group: 'Fill and road base',
    summary: 'Graded mixes of stone and fines for road and yard bases.',
    uses: ['Internal roads and driveways', 'Yards and parking bases'],
    specs: [], variants: [{ label: 'Type', options: ['Granular sub-base (GSB)', 'Wet mix macadam (WMM)'] }],
    soldAs: [{ label: 'Per tonne' }], brands: [], search: 'GSB', image: I('sand'),
  },
  {
    id: 'size-stone', name: 'Size stones and boulders', categorySlug: 'sand-aggregates', group: 'Fill and road base',
    summary: 'Dressed granite stones and rubble for foundations and retaining walls.',
    uses: ['Stone masonry foundations', 'Retaining and compound walls'],
    specs: [], variants: [], soldAs: [{ label: 'Per piece' }, { label: 'Per truck load' }],
    brands: [], search: 'size stone', image: I('sand'),
  },

  // ── Steel & TMT ───────────────────────────────────────────────────
  {
    id: 'tmt-bars', name: 'TMT bars', categorySlug: 'steel-tmt-bars', group: 'Reinforcement',
    summary: 'Thermo-mechanically treated reinforcement bars, the steel inside every RCC member.',
    uses: ['8 to 10 mm: slabs, stirrups and rings', '12 to 16 mm: beams and columns', '20 to 32 mm: heavy columns and foundations'],
    standard: 'IS 1786', specs: [{ label: 'Standard length', value: '12 m' }, { label: 'Weight', value: 'D² ÷ 162 kg per metre' }],
    variants: [
      { label: 'Grade', options: ['Fe 500', 'Fe 500D', 'Fe 550', 'Fe 550D', 'Fe 600'] },
      { label: 'Diameter', options: ['8 mm', '10 mm', '12 mm', '16 mm', '20 mm', '25 mm', '32 mm'] },
    ],
    soldAs: [{ label: 'Per kg' }, { label: 'Per tonne' }, { label: 'Per bundle', note: 'bundle weight varies by brand and size' }],
    brands: TMT_BRANDS, search: 'TMT', aliases: ['tmt', 'rebar', 'fe 500', 'fe500', 'fe 550', 'fe550'], image: I('steel'), calculator: { kind: 'tmt' },
  },
  {
    id: 'binding-wire', name: 'Binding wire', categorySlug: 'steel-tmt-bars', group: 'Reinforcement',
    summary: 'Soft annealed wire for tying reinforcement bars together.',
    uses: ['Tying rebar at laps and crossings'],
    specs: [{ label: 'Finish', value: 'Black annealed or galvanised' }],
    variants: [{ label: 'Gauge', options: ['18 gauge', '20 gauge'] }], soldAs: [{ label: 'Per kg' }, { label: 'Per coil' }],
    brands: [], search: 'binding wire', aliases: ['binding wire'], image: I('steel'),
  },
  {
    id: 'structural-steel', name: 'Structural steel sections', categorySlug: 'steel-tmt-bars', group: 'Structural steel',
    summary: 'Hot-rolled angles, channels, beams and flats for frames, sheds and fabrication.',
    uses: ['Sheds and mezzanines', 'Staircases and frames', 'Gates and grills'],
    standard: 'IS 2062', specs: [],
    variants: [{ label: 'Section', options: ['Angle', 'Channel (ISMC)', 'Beam (ISMB)', 'Flat', 'Square and round bar'] }],
    soldAs: [{ label: 'Per kg' }, { label: 'Per tonne' }], brands: ['SAIL', 'JSW', 'TATA Steel', 'Jindal'], search: 'MS angle channel', image: I('steel'),
  },
  {
    id: 'ms-hollow-sections', name: 'MS pipes and hollow sections', categorySlug: 'steel-tmt-bars', group: 'Structural steel',
    summary: 'Square, rectangular and round steel tubes.',
    uses: ['Gates, grills and railings', 'Roof trusses and sheds'],
    standard: 'IS 4923 / IS 1161', specs: [],
    variants: [{ label: 'Shape', options: ['Square', 'Rectangular', 'Round'] }, { label: 'Finish', options: ['Black', 'Galvanised (GI)'] }],
    soldAs: [{ label: 'Per kg' }, { label: 'Per length' }], brands: ['APL Apollo', 'TATA Structura', 'Jindal'], search: 'MS pipe square tube', image: I('steel'),
  },
  {
    id: 'roofing-sheets', name: 'Roofing sheets', categorySlug: 'steel-tmt-bars', group: 'Roofing',
    summary: 'Profiled galvanised and colour-coated steel sheets for roofs and cladding.',
    uses: ['Sheds and car parks', 'Terrace roofs and cladding'],
    specs: [{ label: 'Coating', value: 'Galvanised, galvalume or colour coated' }],
    variants: [{ label: 'Thickness', options: ['0.35 mm', '0.40 mm', '0.45 mm', '0.50 mm'] }],
    soldAs: [{ label: 'Per sheet' }, { label: 'Per running metre or square foot' }],
    brands: ['TATA Durashine', 'JSW Colouron+', 'Everest'], search: 'roofing sheet', image: I('steel'),
  },

  // ── Plumbing ──────────────────────────────────────────────────────
  {
    id: 'cpvc-pipes', name: 'CPVC pipes', categorySlug: 'plumbing', group: 'Pipes',
    summary: 'Chlorinated PVC pipes for hot and cold water inside the building.',
    uses: ['Hot and cold water lines', 'Geyser and solar heater connections'],
    standard: 'IS 15778', specs: [{ label: 'Rating', value: 'SDR 11 and SDR 13.5' }],
    variants: [{ label: 'Size', options: ['½″ (15 mm)', '¾″ (20 mm)', '1″ (25 mm)', '1¼″ (32 mm)', '1½″ (40 mm)', '2″ (50 mm)'] }],
    soldAs: [{ label: 'Per length (pipe)' }, { label: 'Per metre' }], brands: PIPE_BRANDS, search: 'CPVC pipe', aliases: ['cpvc'], image: I('plumbing'),
  },
  {
    id: 'upvc-pipes', name: 'UPVC pipes', categorySlug: 'plumbing', group: 'Pipes',
    summary: 'Unplasticised PVC pressure pipes for cold water supply.',
    uses: ['Cold water lines', 'Overhead tank and sump connections'],
    specs: [{ label: 'Schedule', value: 'SCH 40 and SCH 80' }],
    variants: [{ label: 'Size', options: ['½″', '¾″', '1″', '1¼″', '1½″', '2″', '3″', '4″'] }],
    soldAs: [{ label: 'Per length (pipe)' }, { label: 'Per metre' }], brands: PIPE_BRANDS, search: 'UPVC pipe', aliases: ['upvc'], image: I('plumbing'),
  },
  {
    id: 'swr-pipes', name: 'PVC SWR drainage pipes', categorySlug: 'plumbing', group: 'Pipes',
    summary: 'Soil, waste and rainwater pipes for drainage.',
    uses: ['Toilet and kitchen drains', 'Rainwater down-takes'],
    standard: 'IS 13592', specs: [],
    variants: [{ label: 'Size', options: ['75 mm', '110 mm', '160 mm'] }, { label: 'Type', options: ['Type A (rainwater)', 'Type B (soil and waste)'] }],
    soldAs: [{ label: 'Per length (pipe)' }], brands: PIPE_BRANDS, search: 'SWR pipe', aliases: ['swr'], image: I('plumbing'),
  },
  {
    id: 'column-pipes', name: 'Borewell column pipes', categorySlug: 'plumbing', group: 'Pipes',
    summary: 'Threaded uPVC pipes that hang the submersible pump in a borewell.',
    uses: ['Borewell pump lines'], specs: [],
    variants: [{ label: 'Size', options: ['1″', '1¼″', '1½″', '2″', '2½″', '3″'] }],
    soldAs: [{ label: 'Per length (pipe)' }], brands: ['Finolex', 'Supreme', 'Ashirvad', 'Astral'], search: 'column pipe', image: I('plumbing'),
  },
  {
    id: 'pipe-fittings', name: 'Pipe fittings and solvent', categorySlug: 'plumbing', group: 'Fittings and valves',
    summary: 'Elbows, tees, couplers, reducers, unions and the solvent cement that joins them.',
    uses: ['Joining CPVC, UPVC and SWR lines'], specs: [],
    variants: [{ label: 'Fitting', options: ['Elbow', 'Tee', 'Coupler', 'Reducer', 'Union', 'End cap', 'Solvent cement'] }],
    soldAs: [{ label: 'Per piece' }], brands: PIPE_BRANDS, search: 'pipe fitting elbow tee', image: I('plumbing'),
  },
  {
    id: 'valves', name: 'Valves', categorySlug: 'plumbing', group: 'Fittings and valves',
    summary: 'Ball, gate and foot valves to isolate and control water lines.',
    uses: ['Isolating bathrooms and tanks', 'Pump suction lines'], specs: [],
    variants: [{ label: 'Type', options: ['Ball valve', 'Gate valve', 'Foot valve', 'Non-return valve'] }, { label: 'Material', options: ['Brass', 'CPVC', 'UPVC'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Zoloto', 'Sant', 'Astral', 'Ashirvad'], search: 'valve', image: I('plumbing'),
  },
  {
    id: 'bath-fittings', name: 'Taps, mixers and showers', categorySlug: 'plumbing', group: 'Bath and sanitary',
    summary: 'Chrome and designer finishes for bathrooms and kitchens.',
    uses: ['Basin and kitchen taps', 'Shower mixers and rain showers', 'Health faucets'], specs: [],
    variants: [{ label: 'Item', options: ['Pillar tap', 'Wall mixer', 'Diverter', 'Overhead shower', 'Health faucet', 'Floor-mount bath filler'] }],
    soldAs: [{ label: 'Per piece' }], brands: BATH_BRANDS, search: 'tap mixer shower', image: I('plumbing'),
  },
  {
    id: 'sanitaryware', name: 'Sanitaryware', categorySlug: 'plumbing', group: 'Bath and sanitary',
    summary: 'Water closets, wash basins and cisterns.',
    uses: ['Bathrooms and toilets'], specs: [],
    variants: [{ label: 'Item', options: ['Floor-mounted WC', 'Wall-hung WC', 'Wash basin', 'Counter-top basin', 'Concealed cistern'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Hindware', 'Cera', 'Parryware', 'Jaquar', 'Kohler'], search: 'wash basin closet', image: I('plumbing'),
  },
  {
    id: 'water-tanks', name: 'Water tanks', categorySlug: 'plumbing', group: 'Tanks and pumps',
    summary: 'Rotomoulded plastic overhead and loft tanks.',
    uses: ['Overhead storage', 'Loft tanks'], specs: [{ label: 'Construction', value: '3 or 4 layer' }],
    variants: [{ label: 'Capacity', options: ['500 L', '750 L', '1000 L', '1500 L', '2000 L', '3000 L', '5000 L'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Sintex', 'Supreme', 'Vectus', 'Ashirvad'], search: 'water tank', image: I('plumbing'),
  },
  {
    id: 'water-pumps', name: 'Water pumps', categorySlug: 'plumbing', group: 'Tanks and pumps',
    summary: 'Monoblock, self-priming and submersible pumps.',
    uses: ['Sump to overhead tank', 'Borewells'], specs: [],
    variants: [{ label: 'Type', options: ['Monoblock', 'Self-priming', 'Openwell submersible', 'Borewell submersible'] }, { label: 'Power', options: ['0.5 HP', '1 HP', '1.5 HP', '2 HP'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Kirloskar', 'Crompton', 'CRI', 'Texmo', 'V-Guard', 'Lubi'], search: 'pump', image: I('plumbing'),
  },

  // ── Electricals ───────────────────────────────────────────────────
  {
    id: 'house-wires', name: 'House wires', categorySlug: 'electricals', group: 'Wires and cables',
    summary: 'Single-core multi-strand copper building wire, sold in coils.',
    uses: ['1 to 1.5 sq mm: lights and fans', '2.5 sq mm: 6A sockets', '4 to 6 sq mm: AC, geyser and mains'],
    standard: 'IS 694', specs: [{ label: 'Coil length', value: '90 m' }, { label: 'Conductor', value: 'Copper' }],
    variants: [
      { label: 'Size', options: ['0.75 sq mm', '1 sq mm', '1.5 sq mm', '2.5 sq mm', '4 sq mm', '6 sq mm'] },
      { label: 'Insulation', options: ['FR', 'FRLS', 'HFFR'] },
      { label: 'Colour', options: ['Red', 'Black', 'Yellow', 'Blue', 'Green'] },
    ],
    soldAs: [{ label: 'Per coil', note: '90 m' }], brands: WIRE_BRANDS, search: 'house wire', aliases: ['house wire', 'building wire', 'frls', 'hffr', 'sq mm'], image: I('electrical'), calculator: { kind: 'coil', metresPerCoil: 90 },
  },
  {
    id: 'modular-switches', name: 'Modular switches and sockets', categorySlug: 'electricals', group: 'Switches and protection',
    summary: 'Snap-in switches, sockets, regulators and the plates that hold them.',
    uses: ['Every switchboard in the building'], specs: [{ label: 'Ratings', value: '6A and 16A' }],
    variants: [{ label: 'Item', options: ['1-way switch', '2-way switch', '6A socket', '16A socket', 'Fan regulator', 'USB charger', 'Cover plate', 'Modular box'] }],
    soldAs: [{ label: 'Per piece' }], brands: SWITCH_BRANDS, search: 'modular switch', aliases: ['modular switch', 'socket'], image: I('electrical'),
  },
  {
    id: 'mcb-db', name: 'MCBs, RCCBs and DBs', categorySlug: 'electricals', group: 'Switches and protection',
    summary: 'Circuit protection: breakers, earth-leakage protection and distribution boards.',
    uses: ['Circuit protection per room', 'Shock protection (RCCB)', 'Main distribution board'], specs: [],
    variants: [
      { label: 'Item', options: ['MCB single pole', 'MCB double pole', 'RCCB', 'Isolator', 'Distribution board'] },
      { label: 'DB size', options: ['4 way', '6 way', '8 way', '12 way', '16 way'] },
    ],
    soldAs: [{ label: 'Per piece' }], brands: ['Havells', 'Legrand', 'Schneider Electric', 'Lauritz Knudsen', 'Siemens', 'ABB', 'Polycab', 'V-Guard'], search: 'MCB', aliases: ['mcb', 'rccb', 'distribution board'], image: I('electrical'),
  },
  {
    id: 'conduits', name: 'PVC conduits and accessories', categorySlug: 'electricals', group: 'Conduits and earthing',
    summary: 'Rigid PVC conduit with bends, boxes and junctions for concealed wiring.',
    uses: ['Concealed wiring in slabs and walls'], specs: [],
    variants: [{ label: 'Size', options: ['20 mm', '25 mm', '32 mm'] }, { label: 'Gauge', options: ['Light', 'Medium', 'Heavy'] }],
    soldAs: [{ label: 'Per length' }, { label: 'Per piece (accessories)' }], brands: ['Polycab', 'Finolex', 'Precision'], search: 'conduit pipe', image: I('electrical'),
  },
  {
    id: 'earthing', name: 'Earthing materials', categorySlug: 'electricals', group: 'Conduits and earthing',
    summary: 'Electrodes, strips and backfill for a safe earth connection.',
    uses: ['Building earth pits'], specs: [],
    variants: [{ label: 'Item', options: ['GI electrode', 'Copper-bonded electrode', 'Earthing compound', 'GI strip'] }],
    soldAs: [{ label: 'Per piece or kit' }], brands: [], search: 'earthing', image: I('electrical'),
  },
  {
    id: 'led-lighting', name: 'LED lighting', categorySlug: 'electricals', group: 'Lighting and appliances',
    summary: 'Bulbs, battens, panels and downlights.',
    uses: ['Room and ceiling lighting', 'Outdoor and facade lighting'], specs: [],
    variants: [{ label: 'Item', options: ['Bulb', 'Batten', 'Panel light', 'Downlight', 'Strip light', 'Flood light'] }, { label: 'Colour', options: ['Warm white', 'Neutral white', 'Cool daylight'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Philips', 'Syska', 'Wipro', 'Havells', 'Crompton', 'Bajaj', 'Orient', 'Halonix'], search: 'LED light', image: I('electrical'),
  },
  {
    id: 'ceiling-fans', name: 'Ceiling fans', categorySlug: 'electricals', group: 'Lighting and appliances',
    summary: 'Standard and energy-saving BLDC ceiling fans.',
    uses: ['Living rooms and bedrooms'], specs: [],
    variants: [{ label: 'Sweep', options: ['900 mm', '1200 mm', '1400 mm'] }, { label: 'Motor', options: ['Standard', 'BLDC'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Crompton', 'Havells', 'Orient', 'Usha', 'Bajaj', 'Atomberg', 'Polycab', 'V-Guard'], search: 'ceiling fan', image: I('electrical'),
  },
  {
    id: 'water-heaters', name: 'Water heaters (geysers)', categorySlug: 'electricals', group: 'Lighting and appliances',
    summary: 'Storage and instant electric water heaters.',
    uses: ['Bathrooms', 'Kitchens'], specs: [],
    variants: [{ label: 'Capacity', options: ['3 L instant', '6 L', '10 L', '15 L', '25 L'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['AO Smith', 'Racold', 'V-Guard', 'Havells', 'Bajaj', 'Crompton'], search: 'water heater geyser', image: I('electrical'),
  },
  {
    id: 'stabilizers-inverters', name: 'Stabilizers and inverters', categorySlug: 'electricals', group: 'Lighting and appliances',
    summary: 'Voltage stabilizers for appliances, inverters and batteries for backup.',
    uses: ['Protecting ACs and fridges', 'Power backup'], specs: [],
    variants: [{ label: 'Item', options: ['Voltage stabilizer', 'Inverter', 'Inverter battery'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['V-Guard', 'Luminous', 'Microtek', 'Exide', 'Amaron'], search: 'stabilizer inverter', image: I('electrical'),
  },

  // ── Paints & Chemicals ────────────────────────────────────────────
  {
    id: 'interior-emulsion', name: 'Interior emulsion', categorySlug: 'paints-chemicals', group: 'Paints',
    summary: 'Water-based wall paint for inside walls and ceilings, from economy to luxury.',
    uses: ['Living rooms and bedrooms', 'Ceilings'], specs: [{ label: 'Finish', value: 'Matt, soft sheen or high sheen' }],
    variants: [{ label: 'Pack', options: ['1 L', '4 L', '10 L', '20 L'] }], soldAs: [{ label: 'Per pack' }],
    brands: PAINT_BRANDS, search: 'interior emulsion', image: I('paint'),
  },
  {
    id: 'exterior-emulsion', name: 'Exterior emulsion', categorySlug: 'paints-chemicals', group: 'Paints',
    summary: 'Weather-resistant paint for outside walls.',
    uses: ['Facades and compound walls'], specs: [],
    variants: [{ label: 'Pack', options: ['1 L', '4 L', '10 L', '20 L'] }], soldAs: [{ label: 'Per pack' }],
    brands: PAINT_BRANDS, search: 'exterior emulsion', image: I('paint'),
  },
  {
    id: 'enamel-paint', name: 'Enamel paint', categorySlug: 'paints-chemicals', group: 'Paints',
    summary: 'Solvent-based gloss and satin paint for metal and wood.',
    uses: ['Grills, gates and railings', 'Doors and windows'], specs: [],
    variants: [{ label: 'Pack', options: ['500 ml', '1 L', '4 L', '20 L'] }], soldAs: [{ label: 'Per pack' }],
    brands: PAINT_BRANDS, search: 'enamel paint', image: I('paint'),
  },
  {
    id: 'primer', name: 'Primers', categorySlug: 'paints-chemicals', group: 'Preparation',
    summary: 'Base coats that seal the surface and help paint bond.',
    uses: ['New plaster', 'Metal (red oxide)', 'Wood'], specs: [],
    variants: [{ label: 'Type', options: ['Interior wall primer', 'Exterior wall primer', 'Red oxide metal primer', 'Wood primer'] }, { label: 'Pack', options: ['1 L', '4 L', '10 L', '20 L'] }],
    soldAs: [{ label: 'Per pack' }], brands: PAINT_BRANDS, search: 'primer', image: I('paint'),
  },
  {
    id: 'wall-putty', name: 'Wall putty', categorySlug: 'paints-chemicals', group: 'Preparation',
    summary: 'White-cement or acrylic putty that fills and smooths plaster before painting.',
    uses: ['Smoothing new and old walls'], specs: [],
    variants: [{ label: 'Type', options: ['White cement based', 'Acrylic'] }, { label: 'Pack', options: ['1 kg', '5 kg', '20 kg', '40 kg'] }],
    soldAs: [{ label: 'Per bag or pack' }], brands: ['Birla White', 'JK WallMaxX', 'Asian Paints', 'Berger'], search: 'wall putty', aliases: ['putty'], image: I('paint'),
  },
  {
    id: 'waterproofing', name: 'Waterproofing', categorySlug: 'paints-chemicals', group: 'Waterproofing',
    summary: 'Coatings, membranes and admixtures for roofs, bathrooms and basements.',
    uses: ['Terraces and roofs', 'Bathrooms and sunken slabs', 'Concrete admixture'], specs: [],
    variants: [{ label: 'Type', options: ['Liquid membrane', 'Cementitious coating', 'Integral admixture', 'Crack filler'] }],
    soldAs: [{ label: 'Per pack' }], brands: ['Dr. Fixit', 'Fosroc', 'Sika', 'Asian Paints SmartCare', 'Berger'], search: 'waterproofing', image: I('paint'),
  },

  // ── Plywood & Timber ──────────────────────────────────────────────
  {
    id: 'mr-plywood', name: 'MR plywood', categorySlug: 'plywood-timber', group: 'Plywood',
    summary: 'Moisture-resistant interior plywood for furniture away from water.',
    uses: ['Wardrobes and beds', 'Interior furniture'], standard: 'IS 303 (MR)',
    specs: [{ label: 'Sheet size', value: '8 × 4 ft (2440 × 1220 mm)' }],
    variants: [{ label: 'Thickness', options: ['4 mm', '6 mm', '9 mm', '12 mm', '16 mm', '19 mm'] }],
    soldAs: [{ label: 'Per sheet' }, { label: 'Per square foot' }], brands: PLY_BRANDS, search: 'MR plywood', aliases: ['mr plywood', 'mr grade'], image: I('plywood'),
  },
  {
    id: 'bwr-bwp-plywood', name: 'BWR and BWP (marine) plywood', categorySlug: 'plywood-timber', group: 'Plywood',
    summary: 'Boiling-water resistant and waterproof grades for kitchens and wet areas.',
    uses: ['Kitchen cabinets', 'Bathroom vanities', 'Exterior and marine use (BWP)'], standard: 'IS 303 (BWR) / IS 710 (BWP)',
    specs: [{ label: 'Sheet size', value: '8 × 4 ft (2440 × 1220 mm)' }],
    variants: [{ label: 'Grade', options: ['BWR', 'BWP / Marine'] }, { label: 'Thickness', options: ['6 mm', '9 mm', '12 mm', '16 mm', '19 mm'] }],
    soldAs: [{ label: 'Per sheet' }, { label: 'Per square foot' }], brands: PLY_BRANDS, search: 'BWP plywood', aliases: ['bwr', 'bwp', 'marine ply'], image: I('plywood'),
  },
  {
    id: 'boards', name: 'Block board, MDF and HDHMR', categorySlug: 'plywood-timber', group: 'Boards and laminates',
    summary: 'Engineered boards for long shelves, doors and CNC work.',
    uses: ['Long shelves and doors (block board)', 'Painted and CNC panels (MDF, HDHMR)'], specs: [],
    variants: [{ label: 'Type', options: ['Block board', 'MDF', 'HDHMR'] }, { label: 'Thickness', options: ['12 mm', '16 mm', '18 mm', '19 mm', '25 mm'] }],
    soldAs: [{ label: 'Per sheet' }], brands: ['Century', 'Greenpanel', 'Action Tesa', 'Greenply'], search: 'block board MDF', image: I('plywood'),
  },
  {
    id: 'laminates', name: 'Laminates and veneers', categorySlug: 'plywood-timber', group: 'Boards and laminates',
    summary: 'Decorative surface sheets for furniture.',
    uses: ['Wardrobe and kitchen shutters', 'Wall panelling'], specs: [],
    variants: [{ label: 'Type', options: ['0.8 mm laminate', '1 mm laminate', 'Acrylic', 'Natural veneer'] }],
    soldAs: [{ label: 'Per sheet' }], brands: ['Merino', 'Greenlam', 'Century', 'Royale Touche'], search: 'laminate', image: I('plywood'),
  },
  {
    id: 'flush-doors', name: 'Flush doors and door frames', categorySlug: 'plywood-timber', group: 'Doors and timber',
    summary: 'Ready flush door shutters and frames.',
    uses: ['Room and bathroom doors'], standard: 'IS 2202', specs: [],
    variants: [{ label: 'Thickness', options: ['30 mm', '32 mm', '35 mm'] }], soldAs: [{ label: 'Per piece' }, { label: 'Per square foot' }],
    brands: ['Century', 'Greenply', 'Kitply'], search: 'flush door', image: I('plywood'),
  },
  {
    id: 'sawn-timber', name: 'Sawn timber', categorySlug: 'plywood-timber', group: 'Doors and timber',
    summary: 'Seasoned hardwood sections for frames and joinery.',
    uses: ['Door and window frames', 'Staircases and joinery'], specs: [],
    variants: [{ label: 'Wood', options: ['Teak', 'Sal', 'Honne', 'Other hardwood'] }], soldAs: [{ label: 'Per cubic foot (cft)' }],
    brands: [], search: 'timber', image: I('plywood'),
    note: 'Timber species and seasoning vary by depot. Ask for the species and moisture content.',
  },

  // ── Machines & Tools ──────────────────────────────────────────────
  {
    id: 'power-tools', name: 'Power tools', categorySlug: 'machines-tools', group: 'Tools',
    summary: 'Drills, grinders, cutters and saws for site and interior work.',
    uses: ['Drilling and fixing', 'Cutting tiles, stone and metal'], specs: [],
    variants: [{ label: 'Tool', options: ['Drill', 'Hammer drill', 'Angle grinder', 'Tile and marble cutter', 'Circular saw', 'Demolition hammer'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Bosch', 'Makita', 'DeWalt', 'Stanley', 'HiKOKI'], search: 'drill grinder', image: I('tools'),
  },
  {
    id: 'hand-tools', name: 'Hand tools', categorySlug: 'machines-tools', group: 'Tools',
    summary: 'Masonry, measuring and carrying tools every site uses.',
    uses: ['Masonry and plastering', 'Measuring and levelling'], specs: [],
    variants: [{ label: 'Tool', options: ['Trowel', 'Spirit level', 'Measuring tape', 'Shovel', 'Mortar pan', 'Wheelbarrow', 'Hammer'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Taparia', 'Stanley', 'Jhalani'], search: 'trowel tool', image: I('tools'),
  },
  {
    id: 'site-equipment', name: 'Concrete and compaction equipment', categorySlug: 'machines-tools', group: 'Site equipment',
    summary: 'Mixers, vibrators and compactors, to buy or to hire.',
    uses: ['Site-mixed concrete', 'Compacting concrete and soil'], specs: [],
    variants: [{ label: 'Machine', options: ['Concrete mixer (half bag)', 'Concrete mixer (one bag)', 'Needle vibrator', 'Plate compactor'] }],
    soldAs: [{ label: 'Per piece' }, { label: 'Hire per day', note: 'where the supplier offers hire' }], brands: [], search: 'concrete mixer vibrator', image: I('tools'),
  },
  {
    id: 'scaffolding', name: 'Scaffolding and shuttering', categorySlug: 'machines-tools', group: 'Site equipment',
    summary: 'Props, frames and plates to support formwork and work at height.',
    uses: ['Slab shuttering', 'Facade and plaster work at height'], specs: [],
    variants: [{ label: 'Item', options: ['Adjustable steel prop', 'Cuplock system', 'H-frame', 'Shuttering plate', 'Spans and runners'] }],
    soldAs: [{ label: 'Per piece' }, { label: 'Hire per day or month' }], brands: [], search: 'scaffolding prop', image: I('tools'),
  },
  {
    id: 'safety-gear', name: 'Safety gear', categorySlug: 'machines-tools', group: 'Safety',
    summary: 'Personal protective equipment for everyone on site.',
    uses: ['Helmets, vests and gloves for crews', 'Harnesses for work at height'], specs: [],
    variants: [{ label: 'Item', options: ['Helmet', 'Hi-vis vest', 'Safety shoes', 'Gloves', 'Goggles', 'Full-body harness'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Karam', 'Udyogi', 'Allen Cooper'], search: 'safety helmet', image: I('tools'),
  },

  // ── Tiles & Flooring ──────────────────────────────────────────────
  {
    id: 'vitrified-tiles', name: 'Vitrified tiles', categorySlug: 'tiles-flooring', group: 'Tiles',
    summary: 'Dense, low-absorption tiles for floors, from glazed GVT to large slabs.',
    uses: ['Living and bedroom floors', 'Commercial floors'], specs: [{ label: 'Sold in', value: 'Boxes; coverage per box printed on the box' }],
    variants: [
      { label: 'Type', options: ['GVT / PGVT', 'Double charge', 'Full body', 'Slab'] },
      { label: 'Size', options: ['600 × 600 mm', '800 × 800 mm', '600 × 1200 mm', '800 × 1600 mm', '1200 × 1800 mm'] },
    ],
    soldAs: [{ label: 'Per box' }, { label: 'Per square foot' }], brands: TILE_BRANDS, search: 'vitrified tile', aliases: ['vitrified', 'gvt', 'pgvt', 'double charge'], image: I('tiles'),
  },
  {
    id: 'ceramic-wall-tiles', name: 'Ceramic wall tiles', categorySlug: 'tiles-flooring', group: 'Tiles',
    summary: 'Glazed wall tiles for bathrooms and kitchens.',
    uses: ['Bathroom walls', 'Kitchen dado'], specs: [],
    variants: [{ label: 'Size', options: ['300 × 450 mm', '300 × 600 mm', '250 × 375 mm'] }],
    soldAs: [{ label: 'Per box' }, { label: 'Per square foot' }], brands: TILE_BRANDS, search: 'wall tile', image: I('tiles'),
  },
  {
    id: 'floor-outdoor-tiles', name: 'Ceramic floor and parking tiles', categorySlug: 'tiles-flooring', group: 'Tiles',
    summary: 'Matt and anti-skid tiles for bathrooms, balconies and parking.',
    uses: ['Bathroom floors', 'Balconies and terraces', 'Parking and driveways'], specs: [],
    variants: [{ label: 'Size', options: ['300 × 300 mm', '400 × 400 mm', '500 × 500 mm'] }],
    soldAs: [{ label: 'Per box' }, { label: 'Per square foot' }], brands: TILE_BRANDS, search: 'parking tile floor tile', image: I('tiles'),
  },
  {
    id: 'granite', name: 'Granite', categorySlug: 'tiles-flooring', group: 'Natural stone',
    summary: 'Polished natural granite slabs and tiles.',
    uses: ['Kitchen counters', 'Staircases and floors'], specs: [],
    variants: [{ label: 'Finish', options: ['Polished', 'Flamed', 'Leather'] }], soldAs: [{ label: 'Per square foot' }],
    brands: [], search: 'granite', image: I('tiles'),
  },
  {
    id: 'marble-kota-shahabad', name: 'Marble, Kota and Shahabad stone', categorySlug: 'tiles-flooring', group: 'Natural stone',
    summary: 'Natural stone flooring, from polished marble to hard-wearing Kota and Shahabad.',
    uses: ['Floors and steps', 'Outdoor paving (Kota, Shahabad)'], specs: [],
    variants: [{ label: 'Stone', options: ['Marble', 'Kota stone', 'Shahabad stone'] }], soldAs: [{ label: 'Per square foot' }],
    brands: [], search: 'marble kota shahabad', image: I('tiles'),
  },
  {
    id: 'tile-adhesive-grout', name: 'Tile adhesive and grout', categorySlug: 'tiles-flooring', group: 'Fixing',
    summary: 'Polymer adhesives for fixing tiles and grouts for the joints.',
    uses: ['Large-format and vitrified tiles', 'Wall tiles over plaster', 'Epoxy grout in wet areas'],
    standard: 'IS 15477 (adhesives)', specs: [],
    variants: [{ label: 'Type', options: ['Adhesive C1', 'Adhesive C2', 'Cement grout', 'Epoxy grout'] }],
    soldAs: [{ label: 'Per bag or pack' }], brands: ['MYK Laticrete', 'Roff', 'Ardex Endura', 'Kerakoll'], search: 'tile adhesive grout', image: I('tiles'),
  },
  ...INTERIOR_ITEMS,
];

export function catalogCategory(slug: string): CatalogCategory | undefined {
  return CATALOG_CATEGORIES.find((c) => c.slug === slug);
}

export function catalogItems(categorySlug: string): CatalogItem[] {
  return CATALOG.filter((i) => i.categorySlug === categorySlug);
}

export function catalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((i) => i.id === id);
}

const normalise = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

// Best catalogue match for a supplier listing, by its name. Whole-phrase matches on the search
// term or a trade alias win; otherwise most of the search words must appear.
export function matchCatalogItem(productName: string, categorySlug?: string): CatalogItem | undefined {
  const name = normalise(productName);
  const pool = categorySlug ? catalogItems(categorySlug) : CATALOG;
  let best: { item: CatalogItem; score: number } | undefined;
  for (const item of pool) {
    const phrases = [item.search, item.name.replace(/\s*\(.*\)\s*$/, ''), ...(item.aliases ?? [])].map(normalise);
    // longer matched phrase = more specific match
    const phrase = Math.max(0, ...phrases.filter((p) => name.includes(p)).map((p) => p.length));
    const words = normalise(item.search).trim().split(' ').filter((w) => w.length > 1);
    const ratio = words.length ? words.filter((w) => name.includes(` ${w} `)).length / words.length : 0;
    const score = phrase > 0 ? 10 + phrase : ratio;
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  return best && best.score >= 0.5 ? best.item : undefined;
}

// Search text for GET /products?q= (MongoDB text search matches any of the words)
export function offerQuery(item: CatalogItem): string {
  return [item.search, ...(item.aliases ?? [])].join(' ');
}

// The API unit a supplier listing should usually use, from how the trade sells the item
export function suggestedListingUnit(item: CatalogItem): ListingUnit {
  const first = item.soldAs[0]?.label.toLowerCase() ?? '';
  if (first.includes('bag')) return 'BAG';
  if (first.includes('per box')) return 'BOX';
  if (first.includes('per sheet')) return 'SHEET';
  if (first.includes('tonne')) return 'TON';
  if (first.includes('per kg')) return 'KG';
  if (first.includes('cubic metre')) return 'CUBIC_METER';
  if (first.includes('square metre') || first.includes('square foot')) return 'SQUARE_METER';
  if (first.includes('metre') && !first.includes('cubic')) return 'METER';
  return 'PIECE';
}

// A listing name buyers will recognise and matchCatalogItem will map back to this item:
// brand first, then the material, then the chosen options
export function suggestedListingName(item: CatalogItem, brand: string | null, choices: Record<string, string | null>): string {
  const base = item.name.replace(/\s*\(.*\)\s*$/, '');
  const options = item.variants.map((v) => choices[v.label]).filter((v): v is string => !!v);
  return [brand, base, ...options].filter(Boolean).join(' ');
}
