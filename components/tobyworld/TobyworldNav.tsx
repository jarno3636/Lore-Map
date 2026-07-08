'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Pond',
    href: '/',
    match: '/',
    symbol: '🐸',
  },
  {
    label: 'Daily',
    href: '/#daily-rite',
    match: '/',
    symbol: '△',
  },
  {
    label: 'Atlas',
    href: '/#atlas',
    match: '/',
    symbol: '☷',
  },
  {
    label: 'Role',
    href: '/#pond-role',
    match: '/',
    symbol: '✦',
  },
  {
    label: 'Shrine',
    href: '/community',
    match: '/community',
    symbol: '🌀',
  },
];

export function TobyworldNav() {
  const pathname = usePathname();

  return (
    <nav className="toby-nav" aria-label="Tobyworld navigation">
      <div className="toby-nav-inner">
        <Link href="/" className="toby-nav-brand" aria-label="Tobyworld home">
          <span className="toby-nav-brand-mark">
            <img src="/miniapp/tobyworld-app-icon.png" alt="" aria-hidden="true" />
          </span>

          <span>
            <strong>Tobyworld</strong>
            <small>Living Pond</small>
          </span>
        </Link>

        <div className="toby-nav-links">
          {navItems.map((item) => {
            const isActive =
              item.match === '/'
                ? pathname === '/' && item.href === '/'
                : pathname === item.match;

            return (
              <Link
                href={item.href}
                className={`toby-nav-link ${isActive ? 'is-active' : ''}`}
                key={item.href}
              >
                <span>{item.symbol}</span>
                <b>{item.label}</b>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
