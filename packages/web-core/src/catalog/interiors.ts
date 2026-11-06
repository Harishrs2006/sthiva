import type { CatalogCategory, CatalogItem } from './types';

// Interiors and finishing, filed under the categories buyers already know (plumbing, paints, plywood,
// tiles...) plus one new category, Hardware & Fittings. Same rules as data.ts: what exists in the Indian
// market and how it is sold; brand lists name what exists, not what Sthiva suppliers stock; no prices,
// stock or delivery promises. Made-to-order items are measured and quoted by the supplier, who then
// confirms a date.

const I = (name: string) => `/illustrations/${name}.svg`;

const HARDWARE_BRANDS = ['Hettich', 'Häfele', 'Ebco', 'Blum'];
const LOCK_BRANDS = ['Godrej', 'Dorset', 'Europa', 'Yale', 'Häfele'];
const UPVC_BRANDS = ['Fenesta', 'LG Hausys', 'Aparna Venster', 'Deceuninck'];
const SINK_BRANDS = ['Nirali', 'Futura', 'Carysil', 'Franke'];
const CHIMNEY_BRANDS = ['Elica', 'Faber', 'Glen', 'Hindware', 'Kaff'];
const BATH_BRANDS = ['Jaquar', 'Hindware', 'Cera', 'Parryware'];
const WATERPROOF_BRANDS = ['Dr. Fixit', 'Fosroc', 'Sika', 'MYK Laticrete'];
const CEILING_BRANDS = ['Saint-Gobain Gyproc', 'USG Boral', 'Knauf'];

const MADE_TO_ORDER_NOTE = 'Made to order: the supplier measures your site, quotes a price and confirms the delivery date once the order is accepted.';

export const INTERIOR_CATEGORIES: CatalogCategory[] = [
  { slug: 'hardware-fittings', name: 'Hardware & Fittings', photo: '/categories/hardware-fittings.jpg', tagline: 'Hinges, channels, handles, kitchen baskets, locks, screws and adhesives.', groups: ['Cabinet and wardrobe fittings', 'Locks and door hardware', 'Fixings and adhesives'] },
];

export const INTERIOR_ITEMS: CatalogItem[] = [
  // ── Modular & Woodwork ────────────────────────────────────────────
  {
    id: 'modular-kitchen', name: 'Modular kitchen', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Factory-made kitchen cabinets built to your kitchen\'s measurements, fitted on site.',
    uses: ['New homes and kitchen renovation', 'Base, wall and tall (pantry) units'],
    specs: [{ label: 'Priced by', value: 'Running foot of counter, or square foot of shutter area' }],
    variants: [
      { label: 'Layout', options: ['L-shaped', 'U-shaped', 'Parallel', 'Straight', 'With island'] },
      { label: 'Cabinet board', options: ['BWP plywood', 'BWR plywood', 'HDHMR'] },
      { label: 'Shutter finish', options: ['Laminate', 'Acrylic', 'PU paint', 'Membrane', 'Glass'] },
    ],
    soldAs: [{ label: 'Per running foot' }, { label: 'Per square foot', note: 'shutter area' }],
    brands: [], search: 'modular kitchen', aliases: ['kitchen cabinet', 'kitchen woodwork'], image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'wardrobes', name: 'Wardrobes', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Built-in wardrobes with hinged or sliding shutters, made to the wall size.',
    uses: ['Bedrooms', 'Walk-in closets', 'Loft storage above'],
    specs: [{ label: 'Priced by', value: 'Square foot of front area' }],
    variants: [
      { label: 'Type', options: ['Hinged', 'Sliding', 'Walk-in'] },
      { label: 'Finish', options: ['Laminate', 'Acrylic', 'Veneer', 'Lacquered glass', 'Fluted panels'] },
    ],
    soldAs: [{ label: 'Per square foot' }], brands: [], search: 'wardrobe', aliases: ['almirah', 'cupboard'], image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'tv-units', name: 'TV units and wall storage', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Wall-mounted or floor TV units with panelling, shelves and closed storage.',
    uses: ['Living rooms', 'Bedrooms'], specs: [],
    variants: [{ label: 'Style', options: ['Wall-mounted', 'Floor-standing', 'Full-wall panelling', 'Slatted (fluted) wood'] }],
    soldAs: [{ label: 'Per piece' }, { label: 'Per square foot' }], brands: [], search: 'tv unit', image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'storage-beds', name: 'Beds with storage', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Plywood or solid-wood beds with hydraulic lift-up or drawer storage underneath.',
    uses: ['Bedrooms with little floor space'], specs: [],
    variants: [
      { label: 'Storage', options: ['Hydraulic lift-up', 'Drawers', 'Box storage'] },
      { label: 'Size', options: ['Single', 'Queen', 'King'] },
    ],
    soldAs: [{ label: 'Per piece' }], brands: [], search: 'storage bed', aliases: ['hydraulic bed', 'cot'], image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'study-units', name: 'Study tables and bookshelves', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Wall-mounted desks, study units and bookshelves for homes and home offices.',
    uses: ['Kids\' rooms', 'Home office'], specs: [],
    variants: [{ label: 'Item', options: ['Study table', 'Wall-mounted desk', 'Bookshelf', 'Combined study unit'] }],
    soldAs: [{ label: 'Per piece' }], brands: [], search: 'study table bookshelf', image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'crockery-shoe-units', name: 'Crockery and shoe units', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Crockery cabinets with glass shutters and shoe racks for the entrance.',
    uses: ['Dining area', 'Entrance foyer'], specs: [],
    variants: [{ label: 'Item', options: ['Crockery unit', 'Shoe rack', 'Foyer storage with seat'] }],
    soldAs: [{ label: 'Per piece' }, { label: 'Per square foot' }], brands: [], search: 'crockery unit shoe rack', image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'pooja-units', name: 'Pooja units (mandir)', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Wall-mounted or floor-standing pooja units in wood, with jaali panels and drawers.',
    uses: ['Pooja corner or pooja room'], specs: [],
    variants: [
      { label: 'Type', options: ['Wall-mounted', 'Floor-standing', 'Full pooja room panelling'] },
      { label: 'Material', options: ['Teak wood', 'Plywood with veneer', 'Plywood with laminate', 'Solid surface with wood'] },
    ],
    soldAs: [{ label: 'Per piece' }], brands: [], search: 'pooja unit mandir', aliases: ['mandir', 'temple', 'pooja'], image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'jaali-partitions', name: 'CNC jaali and partition panels', categorySlug: 'plywood-timber', group: 'Modular furniture',
    summary: 'Cut patterned panels for room partitions, pooja doors, ceilings and wall features.',
    uses: ['Living and dining partitions', 'Pooja doors', 'Feature walls'], specs: [],
    variants: [{ label: 'Material', options: ['MDF', 'HDHMR', 'Plywood', 'Metal (MS or aluminium)'] }],
    soldAs: [{ label: 'Per square foot' }, { label: 'Per panel' }], brands: [], search: 'jaali partition cnc', aliases: ['jali', 'cnc cutting'], image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },

  // ── Walls & Ceilings ──────────────────────────────────────────────
  {
    id: 'gypsum-false-ceiling', name: 'Gypsum false ceiling', categorySlug: 'plywood-timber', group: 'Ceilings and wall panels',
    summary: 'Gypsum boards fixed on a galvanised steel frame, for smooth ceilings with cove and spot lights.',
    uses: ['Living rooms and bedrooms', 'Hiding wiring and AC ducts', 'Cove lighting'],
    standard: 'IS 2095 (gypsum plaster boards)', specs: [{ label: 'Board thickness', value: '12.5 mm is the usual ceiling board' }],
    variants: [{ label: 'Item', options: ['Gypsum board', 'Ceiling channels and sections', 'Moisture-resistant board', 'Installed ceiling'] }],
    soldAs: [{ label: 'Per board' }, { label: 'Per square foot', note: 'installed' }], brands: CEILING_BRANDS, search: 'gypsum false ceiling', aliases: ['gypsum board', 'false ceiling'], image: I('generic'),
  },
  {
    id: 'grid-ceiling', name: 'Grid ceiling tiles', categorySlug: 'plywood-timber', group: 'Ceilings and wall panels',
    summary: 'Lay-in mineral fibre or metal tiles on a T-grid, easy to open for services.',
    uses: ['Offices and shops', 'Basements and utility areas'], specs: [{ label: 'Tile size', value: '600 × 600 mm' }],
    variants: [{ label: 'Tile', options: ['Mineral fibre', 'Metal', 'Gypsum'] }],
    soldAs: [{ label: 'Per box' }, { label: 'Per square foot', note: 'installed' }], brands: ['Armstrong', 'USG Boral'], search: 'grid ceiling tile', image: I('generic'),
  },
  {
    id: 'pop', name: 'POP (plaster of Paris)', categorySlug: 'paints-chemicals', group: 'Preparation',
    summary: 'Quick-setting plaster for ceiling designs, cornices and smooth wall finishing.',
    uses: ['Ceiling designs and cornices', 'Wall finishing before paint'], specs: [],
    variants: [], soldAs: [{ label: 'Per bag' }], brands: [], search: 'pop plaster of paris', aliases: ['pop'], image: I('cement'),
  },
  {
    id: 'pvc-wpc-panels', name: 'PVC and WPC wall panels', categorySlug: 'plywood-timber', group: 'Ceilings and wall panels',
    summary: 'Ready panels for feature walls and ceilings: fluted, louvred or flat, water-resistant.',
    uses: ['TV and bed back walls', 'Ceilings in balconies and bathrooms'], specs: [],
    variants: [
      { label: 'Material', options: ['PVC', 'WPC', 'Charcoal (carbon) sheet'] },
      { label: 'Profile', options: ['Fluted', 'Louvres', 'Flat', 'Marble-look sheet'] },
    ],
    soldAs: [{ label: 'Per panel' }, { label: 'Per square foot' }], brands: [], search: 'pvc wpc wall panel', aliases: ['louvers', 'fluted panel', 'charcoal panel'], image: I('generic'),
  },
  {
    id: 'wall-cladding', name: 'Wall cladding (stone and tiles)', categorySlug: 'tiles-flooring', group: 'Wall cladding',
    summary: 'Natural stone strips, brick-look and elevation tiles for feature walls and facades.',
    uses: ['House front elevation', 'Feature walls', 'Compound walls'], specs: [],
    variants: [{ label: 'Type', options: ['Natural stone', 'Brick-look tile', 'Elevation tile', 'Stone-look panel'] }],
    soldAs: [{ label: 'Per square foot' }, { label: 'Per box' }], brands: [], search: 'wall cladding elevation', aliases: ['elevation tiles', 'stone cladding'], image: I('tiles'),
  },
  {
    id: 'wallpaper', name: 'Wallpaper', categorySlug: 'paints-chemicals', group: 'Wall finishes',
    summary: 'Printed and textured wall coverings, from vinyl rolls to custom murals.',
    uses: ['Bedroom and living room feature walls', 'Kids\' rooms'], specs: [],
    variants: [{ label: 'Type', options: ['Vinyl', 'Non-woven', 'Custom mural', 'Fabric-backed'] }],
    soldAs: [{ label: 'Per roll' }, { label: 'Per square foot', note: 'murals' }], brands: ['Marshalls', 'Asian Paints'], search: 'wallpaper', image: I('paint'),
  },
  {
    id: 'texture-finishes', name: 'Texture and designer finishes', categorySlug: 'paints-chemicals', group: 'Wall finishes',
    summary: 'Textured paints, metallic and concrete-look finishes applied by trained painters.',
    uses: ['Feature walls', 'Exterior textures'], specs: [],
    variants: [{ label: 'Finish', options: ['Interior texture', 'Exterior texture', 'Metallic', 'Concrete or stone look', 'Lime plaster'] }],
    soldAs: [{ label: 'Per litre or kg' }, { label: 'Per square foot', note: 'applied' }], brands: ['Asian Paints', 'Berger', 'Nerolac', 'Dulux'], search: 'texture paint', image: I('paint'),
  },

  // ── Hardware & Fittings ───────────────────────────────────────────
  {
    id: 'cabinet-hinges', name: 'Cabinet hinges', categorySlug: 'hardware-fittings', group: 'Cabinet and wardrobe fittings',
    summary: 'Concealed hinges for kitchen and wardrobe shutters, from basic to soft-close.',
    uses: ['Kitchen and wardrobe shutters', 'Glass and profile doors'], specs: [],
    variants: [
      { label: 'Type', options: ['Soft-close', 'Normal (auto-close)', 'Push-to-open', 'Glass door hinge'] },
      { label: 'Overlay', options: ['Full overlay', 'Half overlay', 'Inset'] },
    ],
    soldAs: [{ label: 'Per piece' }, { label: 'Per pack' }], brands: HARDWARE_BRANDS, search: 'cabinet hinge soft close', aliases: ['auto hinge', 'concealed hinge'], image: I('tools'),
  },
  {
    id: 'drawer-channels', name: 'Drawer channels and systems', categorySlug: 'hardware-fittings', group: 'Cabinet and wardrobe fittings',
    summary: 'Telescopic channels and complete drawer systems that run smooth under load.',
    uses: ['Kitchen drawers', 'Wardrobe and study drawers'], specs: [],
    variants: [
      { label: 'Type', options: ['Telescopic', 'Soft-close telescopic', 'Concealed undermount', 'Tandem drawer box'] },
      { label: 'Length', options: ['12 inch', '14 inch', '16 inch', '18 inch', '20 inch', '22 inch'] },
    ],
    soldAs: [{ label: 'Per pair' }], brands: HARDWARE_BRANDS, search: 'drawer channel', aliases: ['telescopic channel', 'tandem box'], image: I('tools'),
  },
  {
    id: 'handles-knobs', name: 'Handles and knobs', categorySlug: 'hardware-fittings', group: 'Cabinet and wardrobe fittings',
    summary: 'Cabinet, wardrobe and door handles in steel, aluminium and brass finishes.',
    uses: ['Kitchen shutters', 'Wardrobes', 'Main and room doors'], specs: [],
    variants: [{ label: 'Type', options: ['Bar handle', 'Profile (G or J) handle', 'Knob', 'Concealed handle', 'Main door pull handle'] }],
    soldAs: [{ label: 'Per piece' }], brands: ['Hettich', 'Häfele', 'Ebco', 'Godrej'], search: 'cabinet handle', image: I('tools'),
  },
  {
    id: 'kitchen-baskets', name: 'Kitchen baskets and accessories', categorySlug: 'hardware-fittings', group: 'Cabinet and wardrobe fittings',
    summary: 'Pull-out baskets, cutlery trays, corner units and tall pantry pull-outs.',
    uses: ['Modular kitchens'], specs: [],
    variants: [{ label: 'Item', options: ['Plain basket', 'Cutlery tray', 'Plate and cup rack', 'Bottle pull-out', 'Corner unit', 'Tall pantry pull-out'] }],
    soldAs: [{ label: 'Per piece' }], brands: HARDWARE_BRANDS, search: 'kitchen basket', aliases: ['ss basket', 'pull out'], image: I('tools'),
  },
  {
    id: 'wardrobe-fittings', name: 'Wardrobe and lift-up fittings', categorySlug: 'hardware-fittings', group: 'Cabinet and wardrobe fittings',
    summary: 'Sliding door tracks, lift-up mechanisms, wardrobe lifts and hanging rails.',
    uses: ['Sliding wardrobes', 'Overhead kitchen units', 'Lofts'], specs: [],
    variants: [{ label: 'Item', options: ['Sliding door system', 'Lift-up (flap) fitting', 'Wardrobe lift', 'Hanging rail', 'Gas strut'] }],
    soldAs: [{ label: 'Per set' }], brands: HARDWARE_BRANDS, search: 'sliding wardrobe fitting lift up', image: I('tools'),
  },
  {
    id: 'door-locks', name: 'Door locks', categorySlug: 'hardware-fittings', group: 'Locks and door hardware',
    summary: 'Mortise, cylindrical and digital locks for main doors, rooms and bathrooms.',
    uses: ['Main door', 'Bedroom and bathroom doors', 'Gates'], specs: [],
    variants: [{ label: 'Type', options: ['Mortise lock with handle', 'Cylindrical (knob) lock', 'Digital smart lock', 'Rim lock', 'Padlock'] }],
    soldAs: [{ label: 'Per piece' }], brands: LOCK_BRANDS, search: 'door lock', aliases: ['mortise', 'digital lock'], image: I('tools'),
  },
  {
    id: 'door-hardware', name: 'Door hardware', categorySlug: 'hardware-fittings', group: 'Locks and door hardware',
    summary: 'Butt hinges, tower bolts, door stoppers, closers and magnetic catches.',
    uses: ['Wooden and steel doors', 'Windows and cupboards'], specs: [],
    variants: [{ label: 'Item', options: ['Butt hinge', 'Tower bolt', 'Door stopper', 'Door closer', 'Magnetic catch', 'Aldrop'] }],
    soldAs: [{ label: 'Per piece' }, { label: 'Per set' }], brands: ['Dorset', 'Godrej', 'Ozone', 'Hettich'], search: 'tower bolt door hinge', image: I('tools'),
  },
  {
    id: 'screws-fasteners', name: 'Screws, nails and anchors', categorySlug: 'hardware-fittings', group: 'Fixings and adhesives',
    summary: 'Wood and self-tapping screws, nails, wall plugs and anchor fasteners.',
    uses: ['Carpentry and furniture', 'Fixing to concrete and brick'], specs: [],
    variants: [{ label: 'Item', options: ['Wood screw', 'Self-tapping screw', 'Drywall screw', 'Wire nail', 'Wall plug', 'Anchor fastener'] }],
    soldAs: [{ label: 'Per box' }, { label: 'Per kg' }], brands: [], search: 'screw nail anchor', image: I('tools'),
  },
  {
    id: 'adhesives-sealants', name: 'Wood adhesives and sealants', categorySlug: 'hardware-fittings', group: 'Fixings and adhesives',
    summary: 'Synthetic resin wood glue, contact adhesive, silicone sealant and epoxy.',
    uses: ['Laminate and veneer pasting', 'Furniture joints', 'Sealing glass and sanitaryware'], specs: [],
    variants: [{ label: 'Type', options: ['Synthetic resin (white) adhesive', 'Contact adhesive', 'Silicone sealant', 'Epoxy'] }],
    soldAs: [{ label: 'Per kg or tin' }, { label: 'Per tube' }], brands: ['Pidilite', 'Araldite', 'Henkel'], search: 'wood adhesive sealant', aliases: ['fevicol', 'silicone'], image: I('paint'),
  },

  // ── Doors & Windows ───────────────────────────────────────────────
  {
    id: 'upvc-windows', name: 'UPVC windows and doors', categorySlug: 'plywood-timber', group: 'Windows and glass',
    summary: 'Weather-tight, low-maintenance UPVC frames with glass, made to the opening size.',
    uses: ['Bedrooms and living rooms', 'Balcony sliding doors', 'Homes near traffic (noise)'], specs: [],
    variants: [
      { label: 'Type', options: ['Sliding', 'Casement', 'Tilt and turn', 'Fixed', 'Sliding door'] },
      { label: 'Glass', options: ['Single glass', 'Double glazed', 'Toughened'] },
    ],
    soldAs: [{ label: 'Per square foot' }], brands: UPVC_BRANDS, search: 'upvc window', image: I('generic'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'aluminium-windows', name: 'Aluminium windows and partitions', categorySlug: 'plywood-timber', group: 'Windows and glass',
    summary: 'Aluminium sliding windows, doors and glass partitions in powder-coated finishes.',
    uses: ['Windows and balcony doors', 'Office and shop partitions'], specs: [],
    variants: [{ label: 'Type', options: ['Sliding window', 'Casement window', 'Sliding door', 'Glass partition'] }],
    soldAs: [{ label: 'Per square foot' }], brands: ['Jindal Aluminium', 'Hindalco'], search: 'aluminium window', aliases: ['aluminum'], image: I('generic'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'main-doors', name: 'Main and designer doors', categorySlug: 'plywood-timber', group: 'Doors and timber',
    summary: 'Solid wood and engineered main doors with carving, veneer or laminate finish.',
    uses: ['Main entrance', 'Pooja room doors'], specs: [],
    variants: [{ label: 'Material', options: ['Teak wood', 'Solid hardwood', 'Engineered wood with veneer', 'Laminated'] }],
    soldAs: [{ label: 'Per door' }, { label: 'Per square foot' }], brands: [], search: 'main door teak', aliases: ['teak door', 'designer door'], image: I('plywood'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'steel-safety-doors', name: 'Steel and safety doors', categorySlug: 'steel-tmt-bars', group: 'Doors and grills',
    summary: 'Galvanised steel doors and safety grill doors, ready with frame and lock.',
    uses: ['Main doors', 'Utility and terrace doors'], specs: [],
    variants: [{ label: 'Type', options: ['Steel door with frame', 'Safety grill door', 'Fire-rated door'] }],
    soldAs: [{ label: 'Per door' }], brands: ['Tata Pravesh', 'Godrej'], search: 'steel door safety door', image: I('steel'),
  },
  {
    id: 'bathroom-doors', name: 'WPC and PVC doors', categorySlug: 'plywood-timber', group: 'Doors and timber',
    summary: 'Waterproof doors and frames that do not swell, for bathrooms and utility areas.',
    uses: ['Bathrooms', 'Utility rooms'], specs: [],
    variants: [{ label: 'Material', options: ['WPC door', 'PVC door', 'WPC frame'] }],
    soldAs: [{ label: 'Per door' }], brands: [], search: 'wpc door pvc door', aliases: ['bathroom door'], image: I('plywood'),
  },
  {
    id: 'glass', name: 'Float and toughened glass', categorySlug: 'plywood-timber', group: 'Windows and glass',
    summary: 'Clear and tinted float glass, toughened glass for doors and partitions, mirrors.',
    uses: ['Windows', 'Shower partitions and railings', 'Table tops and mirrors'],
    standard: 'IS 2553 (safety glass)', specs: [],
    variants: [
      { label: 'Type', options: ['Float glass', 'Toughened glass', 'Laminated glass', 'Mirror', 'Frosted or lacquered'] },
      { label: 'Thickness', options: ['4 mm', '5 mm', '6 mm', '8 mm', '10 mm', '12 mm'] },
    ],
    soldAs: [{ label: 'Per square foot', note: 'cut to size' }], brands: ['Saint-Gobain', 'AIS'], search: 'toughened glass', image: I('generic'),
    madeToOrder: true, note: 'Cut to size: the supplier confirms the date after measuring.',
  },
  {
    id: 'mosquito-mesh', name: 'Mosquito mesh and grills', categorySlug: 'plywood-timber', group: 'Windows and glass',
    summary: 'Pleated, sliding and magnetic mosquito mesh, and MS or SS window grills.',
    uses: ['Windows and balcony doors'], specs: [],
    variants: [{ label: 'Type', options: ['Pleated mesh', 'Sliding mesh', 'Magnetic mesh', 'MS grill', 'SS grill'] }],
    soldAs: [{ label: 'Per square foot' }], brands: [], search: 'mosquito mesh', aliases: ['net', 'grill'], image: I('steel'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },

  // ── Bath & Kitchen ────────────────────────────────────────────────
  {
    id: 'kitchen-sinks', name: 'Kitchen sinks', categorySlug: 'plumbing', group: 'Kitchen sinks',
    summary: 'Stainless steel and quartz sinks in single, double bowl and drainboard models.',
    uses: ['Kitchen counters', 'Utility areas'], specs: [],
    variants: [
      { label: 'Material', options: ['Stainless steel', 'Quartz', 'Granite composite'] },
      { label: 'Bowl', options: ['Single bowl', 'Double bowl', 'With drainboard'] },
    ],
    soldAs: [{ label: 'Per piece' }], brands: SINK_BRANDS, search: 'kitchen sink', image: I('plumbing'),
  },
  {
    id: 'kitchen-chimneys', name: 'Chimneys and hobs', categorySlug: 'electricals', group: 'Lighting and appliances',
    summary: 'Wall-mounted and island chimneys, built-in gas hobs and cooktops.',
    uses: ['Modular kitchens'], specs: [{ label: 'Chimney size', value: '60 cm or 90 cm wide, by hob size' }],
    variants: [{ label: 'Item', options: ['Wall-mounted chimney', 'Island chimney', 'Built-in hob', 'Cooktop'] }],
    soldAs: [{ label: 'Per piece' }], brands: CHIMNEY_BRANDS, search: 'kitchen chimney hob', image: I('electrical'),
  },
  {
    id: 'shower-partitions', name: 'Shower partitions and enclosures', categorySlug: 'plumbing', group: 'Bath and sanitary',
    summary: 'Toughened glass shower partitions, fixed or sliding, made to the bathroom size.',
    uses: ['Separating wet and dry areas'], specs: [],
    variants: [{ label: 'Type', options: ['Fixed panel', 'Hinged door', 'Sliding door', 'Corner enclosure'] }],
    soldAs: [{ label: 'Per square foot' }, { label: 'Per set' }], brands: [], search: 'shower partition glass', image: I('plumbing'),
    madeToOrder: true, note: MADE_TO_ORDER_NOTE,
  },
  {
    id: 'vanities-mirrors', name: 'Vanities and mirrors', categorySlug: 'plumbing', group: 'Bath and sanitary',
    summary: 'Wall-hung vanity cabinets, countertop basins and LED or plain mirrors.',
    uses: ['Bathrooms and powder rooms'], specs: [],
    variants: [{ label: 'Item', options: ['Vanity cabinet', 'Countertop basin', 'LED mirror', 'Mirror cabinet'] }],
    soldAs: [{ label: 'Per piece' }], brands: BATH_BRANDS, search: 'bathroom vanity mirror', image: I('plumbing'),
  },
  {
    id: 'bath-accessories', name: 'Bath accessories', categorySlug: 'plumbing', group: 'Bath and sanitary',
    summary: 'Towel rods, shelves, soap dishes, health faucets and floor drains.',
    uses: ['Bathrooms'], specs: [],
    variants: [{ label: 'Item', options: ['Towel rod or ring', 'Shelf', 'Soap dish', 'Health faucet', 'Floor drain'] }],
    soldAs: [{ label: 'Per piece' }, { label: 'Per set' }], brands: BATH_BRANDS, search: 'bath accessories towel rod', image: I('plumbing'),
  },

  // ── Roofing & Waterproofing ───────────────────────────────────────
  {
    id: 'clay-roof-tiles', name: 'Mangalore and clay roof tiles', categorySlug: 'bricks-blocks', group: 'Roof tiles',
    summary: 'Kiln-fired clay roof tiles laid on a sloped frame, cool under the sun.',
    uses: ['Sloped roofs', 'Sit-outs and verandahs', 'Decorative roof over a slab'], specs: [],
    variants: [{ label: 'Item', options: ['Mangalore tile', 'Ridge tile', 'Ceiling tile', 'Designer clay tile'] }],
    soldAs: [{ label: 'Per piece' }, { label: 'Per 1,000 pieces' }], brands: [], search: 'mangalore tile roof', aliases: ['mangalore', 'roof tile', 'odu'], image: I('bricks'),
  },
  {
    id: 'polycarbonate-sheets', name: 'Polycarbonate and FRP sheets', categorySlug: 'steel-tmt-bars', group: 'Roofing',
    summary: 'Light, clear or tinted sheets for skylights, car porches and terrace covers.',
    uses: ['Car porch roofs', 'Terrace and balcony covers', 'Skylights'], specs: [],
    variants: [{ label: 'Type', options: ['Multiwall polycarbonate', 'Solid polycarbonate', 'Corrugated FRP'] }],
    soldAs: [{ label: 'Per sheet' }, { label: 'Per square foot' }], brands: [], search: 'polycarbonate sheet', aliases: ['fibre sheet'], image: I('steel'),
  },
  {
    id: 'terrace-waterproofing', name: 'Terrace and roof waterproofing', categorySlug: 'paints-chemicals', group: 'Waterproofing',
    summary: 'Membranes and coatings that stop roof leaks, many with heat-reflective white finish.',
    uses: ['Terraces and roof slabs', 'Water tanks and sunken bathrooms'], specs: [],
    variants: [{ label: 'System', options: ['Liquid (acrylic or PU) membrane', 'APP or SBS sheet membrane', 'Cementitious coating', 'Heat-reflective coating'] }],
    soldAs: [{ label: 'Per pack' }, { label: 'Per square foot', note: 'applied' }], brands: WATERPROOF_BRANDS, search: 'terrace waterproofing', aliases: ['roof leak', 'membrane'], image: I('paint'),
  },
  {
    id: 'rainwater-gutters', name: 'Gutters and rainwater pipes', categorySlug: 'plumbing', group: 'Rainwater',
    summary: 'PVC gutters, downpipes and fittings that carry roof water away or to a recharge pit.',
    uses: ['Sloped and sheet roofs', 'Rainwater harvesting'], specs: [],
    variants: [{ label: 'Item', options: ['Gutter', 'Downpipe', 'Gutter fittings', 'Rainwater filter'] }],
    soldAs: [{ label: 'Per length' }, { label: 'Per piece' }], brands: [], search: 'rainwater gutter pipe', image: I('plumbing'),
  },

  // ── Tiles & Flooring (wood and vinyl) ─────────────────────────────
  {
    id: 'laminate-flooring', name: 'Laminate wooden flooring', categorySlug: 'tiles-flooring', group: 'Wood and vinyl flooring',
    summary: 'Wood-look laminate planks that click together over an underlay.',
    uses: ['Bedrooms', 'Home offices'], specs: [{ label: 'Thickness', value: '8 mm and 12 mm are common' }],
    variants: [{ label: 'Thickness', options: ['8 mm', '10 mm', '12 mm'] }],
    soldAs: [{ label: 'Per box' }, { label: 'Per square foot' }], brands: ['Action TESA', 'Pergo'], search: 'laminate wooden flooring', aliases: ['wooden flooring'], image: I('plywood'),
  },
  {
    id: 'vinyl-spc-flooring', name: 'Vinyl and SPC flooring', categorySlug: 'tiles-flooring', group: 'Wood and vinyl flooring',
    summary: 'Water-resistant vinyl planks, rolls and SPC click flooring in wood and stone looks.',
    uses: ['Bedrooms and kids\' rooms', 'Offices and shops'], specs: [],
    variants: [{ label: 'Type', options: ['SPC click planks', 'LVT planks', 'Vinyl roll'] }],
    soldAs: [{ label: 'Per box' }, { label: 'Per square foot' }], brands: ['Tarkett', 'Gerflor'], search: 'vinyl spc flooring', image: I('tiles'),
  },
];
