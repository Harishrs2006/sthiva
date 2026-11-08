# Landing page media

The landing page story (`components/cinematic/`) is built from one photo per chapter. Each photo is
listed in `components/cinematic/chapters.ts`; a chapter without a photo is left out of the story
automatically, so adding a photo is all it takes to switch a chapter on.

## Photos in use (`public/cinematic/`)

| File | Chapter | Scene | Source |
|---|---|---|---|
| `hero.jpg` | Hero | Indian construction site at golden hour: tower crane, concrete frame, mixer and tipper trucks, workers in hi-vis walking | AI-generated for Sthiva with Canva AI (Magic Media), 2026-10-28 |
| `trucks.jpg` | Delivery | Supervisor waving a truck loaded with steel bars through the site gate | AI-generated, Canva AI, 2026-10-28 |
| `concrete.jpg` | Concrete | Transit mixer pouring concrete down a chute onto rebar mesh, workers spreading it | AI-generated, Canva AI, 2026-10-28 |
| `bricks.jpg` | Masonry | Worker tossing a brick to a mason laying a red brick wall | AI-generated, Canva AI, 2026-10-28 |
| `interiors.jpg` | Interiors | Tile layer setting large vitrified tiles, plywood and tile boxes behind | AI-generated, Canva AI, 2026-10-28 |

| `paint.jpg` | Paint | Rope-access painters rolling terracotta and teal onto a high-rise facade | AI-generated for Sthiva with Figma AI (gemini-3.1-flash-image), 2026-10-28 |
| `electrical.jpg` | Electrical | Electrician on a step ladder at dusk, wired distribution board, colourful string lights | AI-generated, Figma AI, 2026-10-28 |
| `plumbing.jpg` | Plumbing | Plumber checking a gold floor tap filling a freestanding tub in a marble bathroom. A hotel-style crest and name badge the model drew on the uniform were painted out | AI-generated, Figma AI, 2026-10-28 |
| `skyline.jpg` | Closing chapter | Indian city skyline at dusk, tower under construction with two lit cranes, traffic light trails | AI-generated, Figma AI, 2026-10-28 |

The Canva images are 1680x944, the Figma images 1376x768; all are JPG between 150 and 470 KB. They are served through the Next.js image optimiser
(`next/image` and `photoUrl()` in `chapters.ts`), which resizes them per screen and converts them to
WebP/AVIF, so visitors never download the originals. These are generated images, not photos of real
Sthiva suppliers or sites, and they contain no brand names or logos.

## Adding or replacing a chapter photo
To add or replace one: save a landscape photo (at least 1600 px wide, 16:9) as `public/cinematic/<file>`, set
`photo: '/cinematic/<file>'` (and optionally `focus`) on that chapter in `chapters.ts`. Use only images Sthiva generated, owns, or has a
licence for, and note the source in the tables above. No other brands' photos, logos or copy.

## Optional upgrade: filmed footage
A real hero clip (site at golden hour, 8-12 s seamless loop, 720p, under 3 MB, H.264 + VP9, no audio)
can replace the hero photo later. Keep the photo as its poster and for phones and reduced motion.

## Category and room photos (2026-11-07)

`public/categories/` (modular-woodwork, walls-ceilings, hardware-fittings, doors-windows, bath-kitchen,
roofing-waterproofing) and `public/rooms/` (kitchen, bathroom, bedroom, living, pooja, exterior): AI-generated for
Sthiva with Figma AI (gemini-3.1-flash-image), 1264x848, saved as JPG (82 to 187 KB). No people, no brand names.
The woodwork photo showed a machine maker's logo and model number on a panel saw: painted out with the
surrounding colours. They are illustrations of the kind of work, not photos of real Sthiva suppliers.
