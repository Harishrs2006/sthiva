'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CATALOG_CATEGORIES, useSelectedLocation } from '@sthiva/web-core';
import { useCart } from '../lib/cart';
import { useAuth } from './auth/AuthProvider';
import { Logo } from './brand/Logo';

// One solid header on every page, laid out like the big Indian marketplaces:
//   row 1: logo · deliver to (PIN) · search · account · orders · cart
//   row 2: every category in building order (desktop) / full-width search (phones)
// Its height is --header-h in globals.css; keep the two in step.
// (tone and darkUntilId are accepted for older pages and ignored: the bar is always solid.)
export function Header(_props: { tone?: 'light' | 'dark'; darkUntilId?: string } = {}) {
  const cart = useCart();
  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
  const location = useSelectedLocation();
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // The materials menu closes on navigation, Escape, or a click anywhere outside it
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const search = (id: string, className: string) => (
    <form onSubmit={submitSearch} role="search" className={className}>
      <label htmlFor={id} className="sr-only">Search materials</label>
      <div className="flex h-11 w-full overflow-hidden rounded-xl border border-ink/15 bg-sand-2 focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgba(243,184,6,0.45)]">
        <input
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search cement, TMT, tiles, wires..."
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-ink outline-none placeholder:text-stone"
        />
        <button type="submit" className="grid w-12 shrink-0 place-items-center bg-lime text-ink transition-colors hover:bg-lime-deep" aria-label="Search">
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">search</span>
        </button>
      </div>
    </form>
  );

  const deliverTo = (
    <Link
      href="/#site-pin"
      className="flex min-w-0 shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-ink/5"
      title={location?.label ?? 'Set your site PIN'}
    >
      <span className="material-symbols-outlined text-[22px] text-ink" aria-hidden="true">location_on</span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] text-stone">{location ? 'Deliver to' : 'Set your'}</span>
        <span className="font-mono text-[13px] font-semibold text-ink">{location ? location.pincode : 'site PIN'}</span>
      </span>
    </Link>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-sand/95 backdrop-blur-xl">
      {/* row 1 */}
      <div className="container-x flex h-[60px] items-center gap-2 md:h-16 md:gap-4">
        <Logo tone="ink" />
        <div className="hidden md:block">{deliverTo}</div>
        {search('header-search', 'hidden flex-1 md:block')}

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <div className="md:hidden">{deliverTo}</div>
          {status === 'signed-in' ? (
            <Link href="/profile" className="hidden items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-ink/5 md:flex" aria-label="Your account">
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">account_circle</span>
              <span className="text-[14px] font-semibold">Account</span>
            </Link>
          ) : (
            <Link href={`/signin?next=${encodeURIComponent(pathname || '/')}`} className="hidden rounded-lg bg-ink px-4 py-2.5 text-[14px] font-semibold text-sand hover:bg-ink-3 md:inline-flex">
              Sign in
            </Link>
          )}
          <Link href="/orders" className="hidden items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-ink/5 lg:flex">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">receipt_long</span>
            <span className="text-[14px] font-semibold">Orders</span>
          </Link>
          <Link href="/cart" className="relative flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-ink/5" aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}>
            <span className="material-symbols-outlined text-[26px]" aria-hidden="true">shopping_cart</span>
            <span className="hidden text-[14px] font-semibold md:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute left-5 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 font-mono text-[10px] font-semibold text-ink">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* row 2: phones get the search here; desktop lists every category */}
      <div className="container-x pb-2.5 md:hidden">{search('header-search-m', 'block')}</div>
      <div ref={menuRef} className="relative hidden border-t border-ink/[0.07] md:block">
        <nav aria-label="Materials" className="container-x flex h-12 items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="materials-menu"
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[14px] font-semibold transition-colors ${menuOpen ? 'bg-ink text-sand' : 'text-ink hover:bg-ink/5'}`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{menuOpen ? 'close' : 'menu'}</span>
            All materials
          </button>
          <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [mask-image:linear-gradient(90deg,#000_92%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATALOG_CATEGORIES.map((c) => {
              const active = pathname === `/category/${c.slug}`;
              return (
                <li key={c.slug} className="shrink-0">
                  <Link
                    href={`/category/${c.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={`block whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[14px] transition-colors ${active ? 'bg-ink font-semibold text-sand' : 'text-stone hover:bg-ink/5 hover:text-ink'}`}
                  >
                    {c.name}
                  </Link>
                </li>
              );
            })}
            <li className="w-8 shrink-0" aria-hidden="true" />
          </ul>
        </nav>

        {menuOpen && (
          <div id="materials-menu" className="absolute inset-x-0 top-full border-y border-ink/10 bg-sand shadow-[0_24px_48px_-24px_rgba(11,12,10,0.35)]">
            <ul className="container-x grid grid-cols-3 gap-x-6 gap-y-1 py-5 lg:grid-cols-4 xl:grid-cols-5">
              {CATALOG_CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="block rounded-lg px-3 py-2.5 hover:bg-ink/5">
                    <span className="block text-[15px] font-semibold text-ink">{c.name}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-stone">{c.groups?.slice(0, 3).join(', ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
