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
  isInMiniApp?: (options?: { timeoutMs?: number }) => Promise<boolean>;
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

async function openExternalUrl(url: string) {
  const farcasterSdk = getFarcasterSdk();
  const openUrl = farcasterSdk.actions?.openUrl;

  if (openUrl) {
    await Promise.resolve(openUrl(url));
    return;
  }

  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

  if (!openedWindow) {
    window.location.assign(url);
  }
}

export function TobyworldSwapGateway() {
  const [status, setStatus] = useState<string | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [activeTokenId, setActiveTokenId] =
    useState<TobyworldSwapToken['id'] | null>(null);

  const featuredToken = useMemo(() => TOBYWORLD_SWAP_TOKENS[0], []);

  useEffect(() => {
    let mounted = true;

    async function detectMiniApp() {
      try {
        const farcasterSdk = getFarcasterSdk();
        const detected = await farcasterSdk.isInMiniApp?.({
          timeoutMs: 500,
        });

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
    if (!isMiniApp) return;

    event.preventDefault();

    const farcasterSdk = getFarcasterSdk();
    const nativeSwap = farcasterSdk.actions?.swapToken;

    if (!nativeSwap) {
      setStatus('Opening the Sushi fallback…');
      await openExternalUrl(getSushiSwapUrl(token));
      return;
    }

    setActiveTokenId(token.id);
    setStatus(`Opening ${token.symbol} swap…`);

    try {
      const result = await nativeSwap({
        sellToken: BASE_NATIVE_TOKEN_CAIP19,
        buyToken: token.caip19Id,
      });

      if (result.success) {
        setStatus(
          result.swap.transactions.length > 0
            ? `${token.symbol} swap submitted.`
            : `${token.symbol} swap opened.`,
        );
        return;
      }

      if (result.reason === 'rejected_by_user') {
        setStatus('Swap cancelled.');
        return;
      }

      setStatus(
        result.error?.message ??
          `${token.symbol} could not open. Use the Sushi fallback.`,
      );
    } catch (error) {
      console.error('Native Farcaster swap failed:', {
        symbol: token.symbol,
        caip19Id: token.caip19Id,
        error,
      });

      setStatus(`${token.symbol} swap failed. Use the Sushi fallback.`);
    } finally {
      window.setTimeout(() => {
        setActiveTokenId(null);
      }, 700);
    }
  }

  async function handleTokenDetailsClick(
    event: MouseEvent<HTMLAnchorElement>,
    token: TobyworldSwapToken,
  ) {
    if (!isMiniApp) return;

    event.preventDefault();

    const farcasterSdk = getFarcasterSdk();
    const nativeViewToken = farcasterSdk.actions?.viewToken;

    if (!nativeViewToken) {
      await openExternalUrl(token.tokenDetailsUrl);
      return;
    }

    try {
      await nativeViewToken({
        token: token.caip19Id,
      });

      setStatus(`${token.symbol} token details opened.`);
    } catch (error) {
      console.error('Native token view failed:', error);
      await openExternalUrl(token.tokenDetailsUrl);
    }
  }

  async function copyAddress(token: TobyworldSwapToken) {
    const copied = await copyText(token.address);

    setStatus(
      copied
        ? `${token.symbol} address copied.`
        : `${token.symbol}: ${token.address}`,
    );
  }

  return (
    <section
      className="toby-swap-gateway"
      aria-label="Tobyworld swap gateway"
    >
      <div className="toby-swap-glow" aria-hidden="true" />

      <header className="toby-swap-header">
        <div>
          <p>TOBYWORLD SWAP GATE</p>
          <h2>Enter through the pond.</h2>
          <span>
            Choose a Tobyworld path. Farcaster uses its native swap screen,
            while the normal web opens Sushi on Base.
          </span>
        </div>

        <div className="toby-swap-feature">
          <img src={featuredToken.imageSrc} alt="" aria-hidden="true" />

          <div>
            <small>{isMiniApp ? 'FARCASTER PATH' : 'WEB PATH'}</small>
            <strong>{isMiniApp ? 'Native swap' : 'Sushi on Base'}</strong>
            <span>Review the quote before confirming.</span>
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
            <article
              className={`toby-swap-card accent-${token.accent}`}
              key={token.id}
            >
              <div className="toby-swap-card-top">
                <div className="toby-swap-card-image">
                  <img src={token.imageSrc} alt={token.name} />
                  <span>{getTokenIcon(token)}</span>
                </div>

                <div className="toby-swap-card-copy">
                  <p>{token.eyebrow}</p>
                  <h3>{token.symbol}</h3>
                  <strong>{token.loreName}</strong>
                </div>
              </div>

              <p className="toby-swap-description">
                {token.description}
              </p>

              <button
                type="button"
                className="toby-swap-address"
                onClick={() => void copyAddress(token)}
              >
                <span>{shortenAddress(token.address)}</span>
                <b>Copy</b>
              </button>

              <div className="toby-swap-actions">
                <a
                  href={swapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`toby-swap-button primary ${
                    isActive ? 'is-loading' : ''
                  }`}
                  onClick={(event) => void handleSwapClick(event, token)}
                >
                  {isActive
                    ? 'Opening…'
                    : isMiniApp
                      ? `Swap ${token.symbol}`
                      : 'Open Sushi'}
                </a>

                <a
                  href={token.tokenDetailsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="toby-swap-button"
                  onClick={(event) =>
                    void handleTokenDetailsClick(event, token)
                  }
                >
                  Token info
                </a>
              </div>
            </article>
          );
        })}

        <article className="toby-swap-card toby-swap-guide-card">
          <div className="toby-swap-guide-icon" aria-hidden="true">
            ✦
          </div>

          <div>
            <p>SAFE PASSAGE</p>
            <h3>Review first.</h3>
          </div>

          <div className="toby-swap-guide-list">
            <span>
              <b>1</b>
              Verify the Base token address.
            </span>

            <span>
              <b>2</b>
              Review price impact and slippage.
            </span>

            <span>
              <b>3</b>
              Confirm only inside your wallet.
            </span>
          </div>

          <small>
            Tobyworld never submits a swap without your approval.
          </small>
        </article>
      </div>

      <footer className="toby-swap-footer">
        <p>
          This page opens the swap path. Your wallet still shows the final
          quote and confirmation.
        </p>

        {status && <span role="status">{status}</span>}
      </footer>
    </section>
  );
}
