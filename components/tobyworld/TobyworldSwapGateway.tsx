'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { MouseEvent, useEffect, useMemo, useState } from 'react';
import {
  BASE_NATIVE_TOKEN_CAIP19,
  TOBYWORLD_SWAP_TOKENS,
  getSushiSwapUrl,
  type TobyworldSwapToken,
} from '@/lib/tobyworld-swap-tokens';
import './tobyworld-swap-gateway.css';

type SwapTokenResult =
  | {
      success: true;
      swap: {
        transactions: `0x${string}`[];
      };
    }
  | {
      success: false;
      reason: 'rejected_by_user' | 'swap_failed' | string;
      error?: {
        error: string;
        message?: string;
      };
    };

type FarcasterSdk = typeof sdk & {
  isInMiniApp?: (options?: unknown) => Promise<boolean>;
  actions?: {
    swapToken?: (params: {
      sellToken?: string;
      buyToken?: string;
      sellAmount?: string;
    }) => Promise<SwapTokenResult>;
    viewToken?: (params: { token: string }) => Promise<void>;
    openUrl?: (url: string) => void | Promise<void>;
  };
};

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getTokenIcon(token: TobyworldSwapToken) {
  if (token.id === 'toby') return '🐸';
  if (token.id === 'taboshi') return '🍃';
  return '△';
}

function getFarcasterSdk() {
  return sdk as FarcasterSdk;
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
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [activeTokenId, setActiveTokenId] = useState<TobyworldSwapToken['id'] | null>(null);

  const featuredToken = useMemo(() => TOBYWORLD_SWAP_TOKENS[0], []);

  useEffect(() => {
    let mounted = true;

    async function detectMiniApp() {
      try {
        const farcasterSdk = getFarcasterSdk();
        const detected = await farcasterSdk.isInMiniApp?.({ timeoutMs: 200 });

        if (mounted) {
          setIsMiniApp(Boolean(detected));
        }
      } catch {
        if (mounted) {
          setIsMiniApp(false);
        }
      }
    }

    void detectMiniApp();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSwapClick(
    event: MouseEvent<HTMLAnchorElement>,
    token: TobyworldSwapToken,
  ) {
    const farcasterSdk = getFarcasterSdk();
    const nativeSwap = farcasterSdk.actions?.swapToken;

    if (!isMiniApp || !nativeSwap) {
      return;
    }

    event.preventDefault();

    setStatus(`Opening native Farcaster swap for ${token.symbol}…`);
    setActiveTokenId(token.id);

    try {
      const result = await nativeSwap({
        sellToken: BASE_NATIVE_TOKEN_CAIP19,
        buyToken: token.caip19Id,
      });

      if (result.success) {
        const txCount = result.swap.transactions.length;

        setStatus(
          txCount > 0
            ? `${token.symbol} swap submitted in Farcaster.`
            : `${token.symbol} swap opened in Farcaster.`,
        );
        return;
      }

      if (result.reason === 'rejected_by_user') {
        setStatus('Swap cancelled.');
        return;
      }

      setStatus(result.error?.message ?? 'Native swap failed. Use the Sushi fallback link.');
    } catch {
      setStatus('Native Farcaster swap was unavailable. Use the Sushi fallback link.');
    } finally {
      window.setTimeout(() => {
        setActiveTokenId(null);
      }, 900);
    }
  }

  async function handleTokenDetailsClick(
    event: MouseEvent<HTMLAnchorElement>,
    token: TobyworldSwapToken,
  ) {
    const farcasterSdk = getFarcasterSdk();
    const nativeViewToken = farcasterSdk.actions?.viewToken;

    if (!isMiniApp || !nativeViewToken) {
      return;
    }

    event.preventDefault();

    setStatus(`Opening ${token.symbol} in Farcaster…`);

    try {
      await nativeViewToken({
        token: token.caip19Id,
      });

      setStatus(`${token.symbol} token view opened.`);
    } catch {
      setStatus('Native token view was unavailable. Use the Basescan fallback link.');
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
            In Farcaster, swaps open through the native Farcaster swap flow. On the
            normal web, the same buttons fall back to Sushi on Base.
          </span>
        </div>

        <div className="toby-swap-feature">
          <img src={featuredToken.imageSrc} alt="" aria-hidden="true" />
          <div>
            <small>{isMiniApp ? 'FARCASTER PATH' : 'WEB PATH'}</small>
            <strong>{isMiniApp ? 'Native swap' : 'Sushi fallback'}</strong>
            <span>Always verify token address, price impact, and slippage.</span>
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
                <span>{getTokenIcon(token)}</span>
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
                <a
                  href={swapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`toby-swap-button primary ${isActive ? 'is-loading' : ''}`}
                  onClick={(event) => void handleSwapClick(event, token)}
                >
                  {isActive
                    ? 'Opening…'
                    : isMiniApp
                      ? `Native Swap ${token.symbol}`
                      : `Swap ${token.symbol} on Sushi`}
                </a>

                <a
                  href={token.tokenDetailsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="toby-swap-button"
                  onClick={(event) => void handleTokenDetailsClick(event, token)}
                >
                  {isMiniApp ? 'Farcaster Token Info' : 'Token Info'}
                </a>
              </div>

              <a className="toby-swap-hidden-link" href={swapUrl} target="_blank" rel="noreferrer">
                Sushi fallback ↗
              </a>
            </article>
          );
        })}
      </div>

      <footer className="toby-swap-footer">
        <p>
          This is only a gateway. You choose the token, review the quote, and confirm
          through your wallet or Farcaster swap screen.
        </p>

        {status && <span role="status">{status}</span>}
      </footer>
    </section>
  );
}
