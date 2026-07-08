'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  symbol: string;
  matchPath: string;
  matchHash?: string;
  accent: 'pond' | 'red' | 'green' | 'blue' | 'gold' | 'relic';
};

const navItems: NavItem[] = [
  {
    label: 'Pond',
    href: '/',
    matchPath: '/',
    symbol: '🐸',
    accent: 'pond',
  },
  {
    label: 'Rite',
    href: '/#daily-rite',
    matchPath: '/',
    matchHash: 'daily-rite',
    symbol: '△',
    accent: 'red',
  },
  {
    label: 'Atlas',
    href: '/#atlas',
    matchPath: '/',
    matchHash: 'atlas',
    symbol: '☷',
    accent: 'blue',
  },
  {
    label: 'Role',
    href: '/#pond-role',
    matchPath: '/',
    matchHash: 'pond-role',
    symbol: '✦',
    accent: 'gold',
  },
  {
    label: 'Relics',
    href: '/milestones',
    matchPath: '/milestones',
    symbol: '🏺',
    accent: 'relic',
  },
  {
    label: 'Shrine',
    href: '/community',
    matchPath: '/community',
    symbol: '🌀',
    accent: 'green',
  },
];

function getCurrentHash() {
  if (typeof window === 'undefined') return '';

  return window.location.hash.replace('#', '');
}

export function TobyworldNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function syncHash() {
      setHash(getCurrentHash());
    }

    function syncScroll() {
      setIsScrolled(window.scrollY > 12);
    }

    syncHash();
    syncScroll();

    window.addEventListener('hashchange', syncHash);
    window.addEventListener('scroll', syncScroll, { passive: true });

    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('scroll', syncScroll);
    };
  }, []);

  const activeLabel = useMemo(() => {
    const active = navItems.find((item) => {
      if (item.matchPath !== pathname) return false;

      if (item.matchHash) {
        return hash === item.matchHash;
      }

      return pathname === item.matchPath && !hash;
    });

    return active?.label ?? (pathname === '/' ? 'Pond' : '');
  }, [hash, pathname]);

  return (
    <nav
      className={`toby-nav ${isScrolled ? 'is-scrolled' : ''}`}
      aria-label="Tobyworld navigation"
    >
      <div className="toby-nav-inner">
        <Link href="/" className="toby-nav-brand" aria-label="Tobyworld home">
          <span className="toby-nav-brand-mark">
            <img src="/miniapp/tobyworld-app-icon.png" alt="" aria-hidden="true" />
          </span>

          <span className="toby-nav-brand-copy">
            <strong>Tobyworld</strong>
            <small>{activeLabel ? `${activeLabel} · Living Pond` : 'Living Pond'}</small>
          </span>
        </Link>

        <div className="toby-nav-links" aria-label="Primary Tobyworld links">
          {navItems.map((item) => {
            const isHashItem = Boolean(item.matchHash);
            const isActive =
              item.matchPath === pathname &&
              (isHashItem ? hash === item.matchHash : !item.matchHash && !hash);

            const isPageActive =
              item.matchPath !== '/' && pathname === item.matchPath;

            const active = isActive || isPageActive;

            return (
              <Link
                href={item.href}
                className={`toby-nav-link accent-${item.accent} ${active ? 'is-active' : ''}`}
                key={item.href}
                aria-current={active ? 'page' : undefined}
              >
                <span className="toby-nav-symbol">{item.symbol}</span>
                <b>{item.label}</b>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
