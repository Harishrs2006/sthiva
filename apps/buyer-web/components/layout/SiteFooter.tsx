import Link from 'next/link';
import { ProductHuntBadge } from './ProductHuntBadge';
import { SthivaLogo } from '@sthiva/web-core';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="on-ink relative overflow-hidden bg-ink text-sand">
      <div className="container-x relative z-10 grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <SthivaLogo onDark height={44} />
          </div>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-sand/60">
            The construction materials marketplace. Verified suppliers, honest prices, delivery checked against your PIN code.
          </p>
          <p className="mt-6 text-[13px] text-sand/65">{SITE.city}</p>
          {(SITE.supportEmail || SITE.supportPhone) && (
            <ul className="mt-2 space-y-1 text-[13px] text-sand/60">
              {SITE.supportEmail && (
                <li>
                  <a className="hover:text-lime" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
                </li>
              )}
              {SITE.supportPhone && (
                <li>
                  <a className="hover:text-lime" href={`tel:${SITE.supportPhone.replace(/\s/g, '')}`}>{SITE.supportPhone}</a>
                </li>
              )}
            </ul>
          )}
        </div>

        <FooterCol
          title="Shop"
          links={[
            { href: '/#categories', label: 'All materials' },
            { href: '/search', label: 'Search' },
            { href: '/cart', label: 'Cart' },
            { href: '/orders', label: 'Track orders' },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { href: '/#how-it-works', label: 'How it works' },
            { href: '/#suppliers', label: 'Sell on Sthiva' },
            { href: '/signin', label: 'Sign in' },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: '/terms', label: 'Terms of service' },
            { href: '/privacy', label: 'Privacy policy' },
            { href: '/refunds', label: 'Cancellations and refunds' },
            { href: '/cookies', label: 'Cookie policy and settings' },
            { href: '/account-deletion', label: 'Delete your account' },
          ]}
        />
      </div>

      <div className="container-x relative z-10 flex flex-col gap-3 border-t border-white/10 py-6 text-[12px] text-sand/65 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {SITE.legalName}. All rights reserved.
        </p>
        <ProductHuntBadge />
        <p className="font-mono uppercase tracking-[0.16em]">Made in India · Cash on delivery</p>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.18em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[26vw] font-extrabold leading-none tracking-[-0.06em] text-white/[0.03]"
      >
        Sthiva
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="md:col-span-2 lg:col-span-2 [&:nth-child(2)]:md:col-start-7">
      <h2 className="eyebrow text-sand/65">{title}</h2>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[14px] text-sand/75 transition-colors hover:text-lime">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
