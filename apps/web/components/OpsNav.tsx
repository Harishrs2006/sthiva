'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth/AuthProvider';
import { Logo } from './brand/Logo';

const TABS = [
  { href: '/', label: 'Today', icon: 'space_dashboard' },
  { href: '/orders', label: 'Orders', icon: 'receipt_long' },
  { href: '/suppliers', label: 'Suppliers', icon: 'storefront' },
  { href: '/drivers', label: 'Drivers', icon: 'local_shipping' },
  { href: '/people', label: 'People', icon: 'group' },
  { href: '/catalog', label: 'Catalog', icon: 'inventory_2' },
  { href: '/payouts', label: 'Payouts', icon: 'payments' },
  { href: '/insights', label: 'Insights', icon: 'monitoring' },
  { href: '/settings', label: 'Settings', icon: 'tune' },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function OpsNav() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <>
      <header className="on-ink sticky top-0 z-50 bg-ink text-sand">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo tone="sand" />
            <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-lime">{user?.role === 'ADMIN' ? 'Admin' : 'Operations'}</span>
          </div>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  title={tab.label}
                  className={`flex h-10 items-center gap-2 rounded-full px-3 xl:px-4 text-[14px] font-medium transition-colors ${
                    active ? 'bg-lime text-ink' : 'text-sand/70 hover:bg-white/10 hover:text-sand'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{tab.icon}</span>
                  <span className="sr-only xl:not-sr-only">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <span className="hidden items-center gap-2 text-[14px] text-sand/70 md:flex">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 font-semibold text-sand">{user.name?.[0]?.toUpperCase() ?? 'O'}</span>
                {user.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-sand/70 transition-colors hover:bg-white/10 hover:text-sand"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* phone: floating pill tab bar, same as the storefront */}
      <nav className="on-ink fixed inset-x-3 bottom-3 z-50 flex items-center justify-between overflow-x-auto rounded-full bg-ink p-1.5 shadow-[0_20px_50px_-20px_rgba(11,12,10,0.6)] sm:hidden" aria-label="Main">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-colors ${active ? 'bg-lime text-ink' : 'text-sand/70'}`}
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{tab.icon}</span>
              <span className="text-[11px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
