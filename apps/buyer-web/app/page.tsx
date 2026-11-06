'use client';

import Link from 'next/link';
import { LocationSelector } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { CategoryGrid, CategoryGridSkeleton } from '@/components/CategoryGrid';
import { HeroSlideshow } from '@/components/cinematic/HeroSlideshow';
import { Reveal } from '@/components/motion/Reveal';
import { useCategories } from '@/lib/categories';
import { SITE } from '@/lib/site';

const MATERIALS = [
  'Cement',
  'TMT steel',
  'M-sand',
  'Bricks and blocks',
  'Jelly and aggregates',
  'Plywood',
  'Tiles and granite',
  'Paint',
  'Plumbing',
  'Electricals',
  'Hardware',
  'Machinery',
];

const STEPS = [
  {
    n: '01',
    title: 'Set your site PIN',
    body: 'Enter the PIN code of your site. We match it against the areas each supplier has actually configured, so you only see what can reach you.',
    icon: 'pin_drop',
  },
  {
    n: '02',
    title: 'Compare and add to cart',
    body: 'Prices, units, minimum quantities and bulk tiers come straight from the supplier listing. GST and delivery are shown at checkout before you confirm.',
    icon: 'compare_arrows',
  },
  {
    n: '03',
    title: 'Pay cash on delivery',
    body: 'Place the order with your phone number. Track every status change from confirmed to delivered, and pay when it reaches your site.',
    icon: 'local_shipping',
  },
];

const PRINCIPLES = [
  { icon: 'verified_user', title: 'Verified suppliers only', body: 'Only suppliers that pass verification can list products that buyers see.' },
  { icon: 'receipt_long', title: 'Prices you can audit', body: 'Before an order is placed, our servers recalculate the total from the live listing.' },
  { icon: 'block', title: 'No false promises', body: 'A valid PIN is not a delivery promise. If no supplier serves your area, we tell you.' },
  { icon: 'lock', title: 'Phone sign-in, no passwords', body: 'One-time codes over SMS. Nothing to remember, nothing to leak.' },
];

export default function HomePage() {
  const categories = useCategories();

  return (
    <>
      <Header tone="dark" darkUntilId="story" />

      <main id="main">
        <HeroSlideshow categories={categories.status === 'success' ? categories.data : null} />

        {/* ── Materials marquee ─────────────────────────── */}
        <div className="relative overflow-hidden border-y border-ink bg-lime py-4 text-ink" aria-label="Materials on Sthiva">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap hover:[animation-play-state:paused]">
            {[...MATERIALS, ...MATERIALS].map((m, i) => (
              <span key={i} className="flex items-center gap-10 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]" aria-hidden={i >= MATERIALS.length}>
                {m}
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M7 0l1.8 5.2L14 7l-5.2 1.8L7 14l-1.8-5.2L0 7l5.2-1.8z" fill="currentColor" />
                </svg>
              </span>
            ))}
          </div>
        </div>

        {/* ── Categories ───────────────────────────────── */}
        <section id="categories" className="scroll-mt-24 pb-20 md:pb-28">
          <div className="container-x">
            <Reveal className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="eyebrow text-stone">The catalogue</p>
                <h2 className="mt-4 font-display text-[clamp(2.25rem,4.6vw,3.75rem)] font-bold leading-[0.98] tracking-tightest">
                  Everything for the site.
                </h2>
              </div>
              <p className="max-w-sm text-[15px] leading-relaxed text-stone">
                Categories and listings come live from suppliers on Sthiva. Pick one to see products, prices and delivery.
              </p>
            </Reveal>

            {categories.status === 'loading' && <CategoryGridSkeleton />}
            {categories.status === 'error' && (
              <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
                <span className="material-symbols-outlined text-4xl text-error" aria-hidden="true">cloud_off</span>
                <p className="font-display text-xl font-semibold">We could not load the catalogue</p>
                <p className="max-w-sm text-[15px] text-stone">Check your connection and try again.</p>
                <button type="button" onClick={() => window.location.reload()} className="btn-ink mt-2">
                  Try again
                </button>
              </div>
            )}
            {categories.status === 'success' && <CategoryGrid categories={categories.data} />}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────── */}
        <section id="how-it-works" className="on-ink scroll-mt-16 bg-ink py-20 text-sand md:py-28">
          <div className="container-x">
            <Reveal className="max-w-3xl">
              <p className="eyebrow text-lime">How it works</p>
              <h2 className="mt-4 font-display text-[clamp(2.25rem,4.6vw,3.75rem)] font-bold leading-[0.98] tracking-tightest text-balance">
                From PIN code to site gate in three steps.
              </h2>
            </Reveal>

            <ol className="mt-14 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.n} delay={i * 120}>
                  <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-ink-2 p-7 transition-colors duration-500 hover:border-lime/50 sm:p-8">
                    <div className="flex items-center justify-between">
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-lime transition-colors duration-500 group-hover:bg-lime group-hover:text-ink">
                        <span className="material-symbols-outlined text-[28px]" aria-hidden="true">{s.icon}</span>
                      </span>
                      <span className="font-display text-6xl font-bold tracking-tightest text-white/[0.07] transition-colors duration-500 group-hover:text-lime/25">
                        {s.n}
                      </span>
                    </div>
                    <h3 className="mt-10 font-display text-2xl font-semibold tracking-[-0.02em]">{s.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-sand/60">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Principles ───────────────────────────────── */}
        <section className="py-20 md:py-28">
          <div className="container-x grid gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-4">
              <p className="eyebrow text-stone">Our promise</p>
              <h2 className="mt-4 font-display text-[clamp(2.25rem,4.2vw,3.5rem)] font-bold leading-[0.98] tracking-tightest">
                Built on <span className="font-serif font-normal italic">honesty</span>, not hype.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-stone">
                No invented ratings, no made-up stock, no delivery dates we cannot keep. Just the real marketplace.
              </p>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
              {PRINCIPLES.map((p, i) => (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="card group h-full p-7 transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(11,12,10,0.4)]">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-lime transition-transform duration-500 ease-out-expo group-hover:rotate-[-6deg] group-hover:scale-110">
                      <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{p.icon}</span>
                    </span>
                    <h3 className="mt-8 font-display text-[22px] font-semibold tracking-[-0.02em]">{p.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Suppliers ────────────────────────────────── */}
        <section id="suppliers" className="scroll-mt-24 pb-20 md:pb-28">
          <div className="container-x">
            <Reveal>
              <div className="relative overflow-hidden rounded-[32px] bg-cobalt p-8 text-white sm:p-12 lg:p-16">
                <div className="blueprint absolute inset-0 opacity-70" aria-hidden="true" />
                <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-lime/30 blur-[100px]" aria-hidden="true" />
                <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
                  <div className="lg:col-span-8">
                    <p className="eyebrow text-white/60">For suppliers</p>
                    <h2 className="mt-4 font-display text-[clamp(2.25rem,5vw,4.25rem)] font-bold leading-[0.95] tracking-tightest text-balance">
                      Sell to every site in your service area.
                    </h2>
                    <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/75">
                      List your catalogue, set your own prices and bulk tiers, choose the PIN codes you deliver to, and manage
                      orders from one portal.
                    </p>
                  </div>
                  <div className="lg:col-span-4 lg:text-right">
                    {SITE.sellerPortalUrl ? (
                      <a href={SITE.sellerPortalUrl} className="btn bg-white text-ink hover:bg-lime">
                        Open the seller portal
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_outward</span>
                      </a>
                    ) : (
                      <p className="text-[15px] text-white/70">Seller portal access is shared with suppliers during onboarding.</p>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────── */}
        <section className="pb-24 md:pb-32">
          <div className="container-x text-center">
            <Reveal>
              <h2 className="mx-auto max-w-4xl font-display text-[clamp(2.75rem,7vw,6rem)] font-bold leading-[0.92] tracking-tightest text-balance">
                Your next pour starts <span className="relative inline-block">here<span className="absolute -bottom-1 left-0 right-0 h-[0.14em] rounded-full bg-lime" aria-hidden="true" /></span>.
              </h2>
              <p className="mx-auto mt-6 max-w-md text-[17px] text-stone">Sign in with your phone number in under a minute. No passwords.</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/signin" className="btn-ink group">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">smartphone</span>
                  Continue with phone
                </Link>
                <Link href="#categories" className="btn-ghost">
                  Browse first
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
      <BottomNav />
    </>
  );
}
