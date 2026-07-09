'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type NavAccent =
  | 'pond'
  | 'red'
  | 'green'
  | 'blue'
  | 'gold'
  | 'relic'
  | 'swap'
  | 'passport';

type NavItem = {
  label: string;
  href: string;
  symbol: string;
  matchPath: string;
  matchHash?: string;
  accent: NavAccent;
};

const navGroups: NavItem[][] = [
  [
    {
      label: 'Pond',
      href: '/',
      matchPath: '/',
      symbol: '🐸',
      accent: 'pond',
    },
    {
      label: 'Swap',
      href: '/#swap-gateway',
      matchPath: '/',
      matchHash: 'swap-gateway',
      symbol: '⇄',
      accent: 'swap',
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
      label: 'Passport',
      href: '/#pond-passport',
      matchPath: '/',
      matchHash: 'pond-passport',
      symbol: '🪪',
      accent: 'passport',
    },
  ],
  [
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
  ],
];

const navItems = navGroups.flat();

function getCurrentHash() {
  if (typeof window === 'undefined') return '';

  return window.location.hash.replace('#', '');
}

function isItemActive(item: NavItem, pathname: string, hash: string) {
  const isHashItem = Boolean(item.matchHash);

  const isHashActive =
    item.matchPath === pathname &&
    isHashItem &&
    hash === item.matchHash;

  const isRootActive =
    item.matchPath === '/' &&
    item.href === '/' &&
    pathname === '/' &&
    !hash;

  const isPageActive =
    item.matchPath !== '/' &&
    pathname === item.matchPath;

  return isHashActive || isRootActive || isPageActive;
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
    window.addEventListener('popstate', syncHash);
    window.addEventListener('scroll', syncScroll, { passive: true });

    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('popstate', syncHash);
      window.removeEventListener('scroll', syncScroll);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHash(getCurrentHash());
    }, 40);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  const activeLabel = useMemo(() => {
    const active = navItems.find((item) => isItemActive(item, pathname, hash));

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
          {navGroups.map((group, groupIndex) => (
            <div className="toby-nav-link-row" key={`nav-row-${groupIndex}`}>
              {group.map((item) => {
                const active = isItemActive(item, pathname, hash);

                return (
                  <Link
                    href={item.href}
                    className={`toby-nav-link accent-${item.accent} ${
                      active ? 'is-active' : ''
                    }`}
                    key={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      window.setTimeout(() => {
                        setHash(getCurrentHash());
                      }, 40);
                    }}
                  >
                    <span className="toby-nav-symbol">{item.symbol}</span>
                    <b>{item.label}</b>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
