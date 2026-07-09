'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useMemo, useState } from 'react';
import {
  TOBYWORLD_SWAP_TOKENS,
  getSushiSwapUrl,
  type TobyworldSwapToken,
} from '@/lib/tobyworld-swap-tokens';
import './tobyworld-swap-gateway.css';

type OpenUrlSdk = typeof sdk & {
  actions?: {
    openUrl?: (url: string) => void | Promise<void>;
  };
};

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getOpenUrlAction() {
  return (sdk as OpenUrlSdk).actions?.openUrl;
}

async function copyText(value: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function TobyworldSwapGateway() {
  const [status, setStatus] = useState<string | null>(null);
  const [activeTokenId, setActiveTokenId] = useState<TobyworldSwapToken['id'] | null>(null);

  const featuredToken = useMemo(() => TOBYWORLD_SWAP_TOKENS[0], []);

  async function openSwap(token: TobyworldSwapToken) {
    const swapUrl = getSushiSwapUrl(token);

    setStatus(`Opening ${token.symbol} swap on Base…`);
    setActiveTokenId(token.id);

    try {
      const openUrl = getOpenUrlAction();

      if (openUrl) {
        await Promise.resolve(openUrl(swapUrl));
        setStatus(`${token.symbol} swap opened.`);
        return;
      }

      const openedWindow = window.open(swapUrl, '_blank', 'noopener,noreferrer');

      if (!openedWindow) {
        window.location.assign(swapUrl);
      }

      setStatus(`${token.symbol} swap opened.`);
    } catch {
      window.location.assign(swapUrl);
    } finally {
      window.setTimeout(() => {
        setActiveTokenId(null);
      }, 900);
    }
  }

  async function openTokenDetails(token: TobyworldSwapToken) {
    setStatus(`Opening ${token.symbol} token details…`);

    try {
      const openUrl = getOpenUrlAction();

      if (openUrl) {
        await Promise.resolve(openUrl(token.tokenDetailsUrl));
        return;
      }

      const openedWindow = window.open(token.tokenDetailsUrl, '_blank', 'noopener,noreferrer');

      if (!openedWindow) {
        window.location.assign(token.tokenDetailsUrl);
      }
    } catch {
      window.location.assign(token.tokenDetailsUrl);
    }
  }

  async function copyAddress(token: TobyworldSwapToken) {
    const copied = await copyText(token.address);

    setStatus(
      copied
        ? `${token.symbol} address copied. Verify before swapping.`
        : `${token.symbol}: ${token.address}`,
    );
  }

  return (
    <section className="toby-swap-gateway" aria-label="Tobyworld swap gateway">
      <div className="toby-swap-glow" aria-hidden="true" />
      <div className="toby-swap-orbit toby-swap-orbit-one" aria-hidden="true" />
      <div className="toby-swap-orbit toby-swap-orbit-two" aria-hidden="true" />

      <header className="toby-swap-header">
        <div>
          <p>TOBYWORLD SWAP GATE</p>
          <h2>Enter through the pond.</h2>
          <span>
            Open a Base swap for Tobyworld assets. Farcaster opens the swap through the
            Mini App client; normal browsers open Sushi directly.
          </span>
        </div>

        <div className="toby-swap-feature">
          <img src={featuredToken.imageSrc} alt="" aria-hidden="true" />
          <div>
            <small>DEFAULT PATH</small>
            <strong>ETH → Tobyworld</strong>
            <span>Always verify the token before swapping.</span>
          </div>
        </div>
      </header>

      <div className="toby-swap-path" aria-label="Tobyworld token path">
        <span>△</span>
        <i />
        <span>🐸</span>
        <i />
        <span>🍃</span>
      </div>

      <div className="toby-swap-grid">
        {TOBYWORLD_SWAP_TOKENS.map((token) => {
          const isActive = activeTokenId === token.id;
          const swapUrl = getSushiSwapUrl(token);

          return (
            <article className={`toby-swap-card accent-${token.accent}`} key={token.id}>
              <div className="toby-swap-card-image">
                <img src={token.imageSrc} alt={token.name} />
                <span>{token.id === 'toby' ? '🐸' : token.id === 'taboshi' ? '🍃' : '△'}</span>
              </div>

              <div className="toby-swap-card-copy">
                <p>{token.eyebrow}</p>
                <h3>{token.symbol}</h3>
                <strong>{token.loreName}</strong>
                <span>{token.description}</span>
              </div>

              <div className="toby-swap-address-box">
                <small>BASE TOKEN</small>
                <button type="button" onClick={() => void copyAddress(token)}>
                  {shortenAddress(token.address)}
                  <b>Copy</b>
                </button>
              </div>

              <div className="toby-swap-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => void openSwap(token)}
                  disabled={isActive}
                >
                  {isActive ? 'Opening…' : `Swap for ${token.symbol}`}
                </button>

                <button type="button" onClick={() => void openTokenDetails(token)}>
                  Token Details
                </button>
              </div>

              <a className="toby-swap-hidden-link" href={swapUrl} target="_blank" rel="noreferrer">
                Open direct Sushi link
              </a>
            </article>
          );
        })}
      </div>

      <footer className="toby-swap-footer">
        <p>
          This opens third-party swap pages. Check token address, slippage, price impact,
          and wallet network before confirming.
        </p>

        {status && <span role="status">{status}</span>}
      </footer>
    </section>
  );
}
