'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelectedLocation } from '@sthiva/web-core';
import { useCart } from '../lib/cart';
import { useAuth } from './auth/AuthProvider';
import { Logo } from './brand/Logo';

// `tone="dark"` starts transparent over the ink hero on the landing page and turns into a
// sand glass bar once the page scrolls. Every other page uses the light bar from the start.
// `darkUntilId` keeps the dark bar until the bottom of that element passes under the header
// (the landing page's pinned 3D story).
export function Header({ tone = 'light', darkUntilId }: { tone?: 'light' | 'dark'; darkUntilId?: string }) {
  const cart = useCart();
  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
  const location = useSelectedLocation();
  const { status } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const until = darkUntilId ? document.getElementById(darkUntilId) : null;
      setScrolled(until ? until.getBoundingClientRect().bottom < 80 : window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [darkUntilId]);

  const dark = tone === 'dark' && !scrolled;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const iconBtn = `relative grid h-11 w-11 place-items-center rounded-full transition-colors duration-200 ${
    dark ? 'text-sand hover:bg-white/10' : 'text-ink hover:bg-ink/5'
  }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ease-out-expo ${
        dark ? 'on-ink border-b border-transparent bg-transparent' : 'border-b border-ink/[0.07] bg-sand/80 backdrop-blur-xl backdrop-saturate-150'
      }`}
    >
      <div className="container-x flex h-[var(--header-h)] items-center gap-4">
        <Logo tone={dark ? 'sand' : 'ink'} />

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {[
            { href: '/#categories', label: 'Materials' },
            { href: '/#how-it-works', label: 'How it works' },
            { href: '/#suppliers', label: 'For suppliers' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
                dark ? 'text-sand/70 hover:text-sand' : 'text-stone hover:text-ink'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} role="search" className="ml-auto hidden w-full max-w-[340px] md:block">
          <label className="relative block">
            <span className="sr-only">Search materials</span>
            <span
              className={`material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] ${
                dark ? 'text-sand/50' : 'text-stone'
              }`}
              aria-hidden="true"
            >
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search cement, TMT, bricks..."
              className={`h-11 w-full rounded-full pl-11 pr-4 text-[14px] outline-none transition-[background-color,box-shadow] duration-200 ${
                dark
                  ? 'bg-white/[0.07] text-sand placeholder:text-sand/40 focus:bg-white/[0.12] focus:shadow-[0_0_0_3px_rgba(243,184,6,0.45)]'
                  : 'bg-ink/[0.05] text-ink placeholder:text-stone focus:bg-sand-2 focus:shadow-[0_0_0_3px_rgba(243,184,6,0.6)]'
              }`}
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <button type="button" className={`${iconBtn} md:hidden`} aria-label="Search" onClick={() => setSearchOpen((v) => !v)}>
            <span className="material-symbols-outlined" aria-hidden="true">{searchOpen ? 'close' : 'search'}</span>
          </button>

          {location && (
            <span
              className={`mr-1 hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium xl:inline-flex ${
                dark ? 'bg-white/[0.07] text-sand/80' : 'bg-ink/[0.05] text-stone'
              }`}
              title={location.label}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
              {location.pincode}
            </span>
          )}

          <Link href="/cart" className={iconBtn} aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}>
            <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 font-mono text-[10px] font-semibold text-ink">
                {cartCount}
              </span>
            )}
          </Link>

          {status === 'signed-in' ? (
            <Link href="/profile" className={`${iconBtn} hidden md:grid`} aria-label="Your account">
              <span className="material-symbols-outlined" aria-hidden="true">account_circle</span>
            </Link>
          ) : (
            <Link
              href="/signin"
              className={`ml-1 hidden rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors md:inline-flex ${
                dark ? 'bg-lime text-ink hover:bg-lime-deep' : 'bg-ink text-sand hover:bg-ink-3'
              }`}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} role="search" className="container-x pb-4 md:hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            aria-label="Search materials"
            placeholder="Search cement, TMT, bricks..."
            className="field h-12 rounded-full"
          />
        </form>
      )}
    </header>
  );
}
