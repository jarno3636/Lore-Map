'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContracts,
  useSignMessage,
} from 'wagmi';
import { TOBYWORLD_SWAP_TOKENS } from '@/lib/tobyworld-swap-tokens';
import './tobyworld-pond-passport.css';

type PondPersona = {
  title: string;
  characteristic: string;
  strangeHabit: string;
  pondWarning: string;
  stamp: string;
  shareText: string;
};

type PassportSnapshot = {
  fid: number;
  username: string | null;
  displayName: string | null;
  currentMark: string;
  streakCount: number;
  bestStreak: number;
  totalCompletions: number;
  currentEchoPower: number;
  highestEchoPower: number;
  totalEchoes: number;
  totalRites: number;
};

type PassportResponse = {
  ok?: boolean;
  error?: string;
  fid?: number;
  persona?: PondPersona;
  snapshot?: PassportSnapshot;
  source?: string;
  generatedOn?: string;
  limits?: {
    rerollsRemaining: number;
    cooldownSeconds: number;
  };
};

type MiniAppUserContext = {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
};

type MiniAppContext = {
  user?: MiniAppUserContext;
};

type QuickAuthFetch = typeof fetch;

type PassportSdk = typeof sdk & {
  context?: MiniAppContext | Promise<MiniAppContext>;
  quickAuth?: {
    fetch?: QuickAuthFetch;
  };
  actions?: {
    composeCast?: (params: { text: string; embeds?: string[] }) => Promise<void> | void;
    openUrl?: (url: string) => Promise<void> | void;
  };
};

type WalletSupportResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  alreadySupportedToday?: boolean;
};

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const BASE_CHAIN_ID = 8453;
const REQUIRED_ASSET_COUNT = 2;

const PASSPORT_FROG_BACKUPS = [
  '/images/passport/frog-lily-agent.png',
  '/images/passport/frog-red-grain-cloak.png',
  '/images/passport/frog-leaf-scout.png',
  '/images/passport/frog-gate-guard.png',
  '/images/passport/frog-moon-ranger.png',
];

function getOrigin() {
  if (typeof window === 'undefined') return 'https://toby-atlas.vercel.app';
  return window.location.origin;
}

function getBoundQuickAuthFetch() {
  const quickAuth = (sdk as PassportSdk).quickAuth;

  if (!quickAuth?.fetch) return null;

  return quickAuth.fetch.bind(quickAuth);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getDisplayName(
  snapshot?: PassportSnapshot,
  contextUser?: MiniAppUserContext | null,
  address?: string,
) {
  if (contextUser?.displayName) return contextUser.displayName;
  if (snapshot?.displayName) return snapshot.displayName;
  if (contextUser?.username) return contextUser.username;
  if (snapshot?.username) return snapshot.username;
  if (snapshot?.fid) return `FID ${snapshot.fid}`;
  if (address) return shortenAddress(address);

  return 'Unstamped Frog';
}

function getHandle(
  snapshot?: PassportSnapshot,
  contextUser?: MiniAppUserContext | null,
  address?: string,
) {
  const username = contextUser?.username || snapshot?.username;

  if (username) return `@${username}`;
  if (address) return 'Wallet supporter';

  return 'Tobyworld traveler';
}

function getIssuedDate(value?: string) {
  if (!value) return 'Pending';

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function getSourceLabel(source?: string) {
  if (!source) return 'Not loaded';
  if (source === 'gemini') return 'AI stamp';
  if (source.startsWith('fallback')) return 'Local stamp';

  return 'Pond stamp';
}

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildWalletSupportMessage(address: string) {
  return [
    'Tobyworld Pond Passport',
    '',
    "I am supporting today's pond rite.",
    '',
    `Wallet: ${address}`,
    `Date: ${getTodayUtcDate()}`,
    `Domain: ${window.location.host}`,
    '',
    'No gas. No transaction. No token approval.',
  ].join('\n');
}

function getPassportStateLabel({
  isLoading,
  isRerolling,
  data,
  hasEnoughAssets,
  assetCount,
}: {
  isLoading: boolean;
  isRerolling: boolean;
  data: PassportResponse | null;
  hasEnoughAssets: boolean;
  assetCount: number;
}) {
  if (isLoading) return 'Loading passport…';
  if (isRerolling) return 'Rerolling stamp…';

  if (!hasEnoughAssets) {
    return `${assetCount}/${REQUIRED_ASSET_COUNT} assets detected`;
  }

  if (data?.persona) {
    const rerolls = data.limits?.rerollsRemaining ?? 0;
    return `Loaded · ${rerolls} reroll${rerolls === 1 ? '' : 's'} left`;
  }

  return 'Ready for pond stamp';
}

function toBigIntBalance(value: unknown) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.floor(value));
  if (typeof value === 'string' && value.trim()) return BigInt(value);

  return BigInt(0);
}

function pickBackupFrogImage(seed: string | number | undefined) {
  const value = String(seed ?? 'pond');

  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return PASSPORT_FROG_BACKUPS[Math.abs(hash) % PASSPORT_FROG_BACKUPS.length];
}

async function copyText(value: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

async function openExternalUrl(url: string) {
  const openUrl = (sdk as PassportSdk).actions?.openUrl;

  if (openUrl) {
    await Promise.resolve(openUrl(url));
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export function TobyworldPondPassport() {
  const [data, setData] = useState<PassportResponse | null>(null);
  const [contextUser, setContextUser] = useState<MiniAppUserContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [isSupporting, setIsSupporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [freshInkKey, setFreshInkKey] = useState(0);
  const [pfpFailed, setPfpFailed] = useState(false);
  const [frogImageFailed, setFrogImageFailed] = useState(false);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  const persona = data?.persona;
  const snapshot = data?.snapshot;

  const fallbackFrogImage = pickBackupFrogImage(snapshot?.fid ?? address);
  const pfpUrl = !pfpFailed ? contextUser?.pfpUrl : undefined;
  const photoSrc = pfpUrl || (!frogImageFailed ? fallbackFrogImage : undefined);

  const assetReadContracts = useMemo(() => {
    if (!isConnected || !address) return [];

    return TOBYWORLD_SWAP_TOKENS.map((token) => ({
      address: token.address,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf' as const,
      args: [address] as const,
      chainId: BASE_CHAIN_ID,
    }));
  }, [address, isConnected]);

  const { data: assetReads, isFetching: isCheckingAssets } = useReadContracts({
    contracts: assetReadContracts,
    query: {
      enabled: Boolean(isConnected && address && assetReadContracts.length > 0),
      refetchInterval: Boolean(isConnected && address) ? 30_000 : false,
    },
  });

  const heldAssets = useMemo(() => {
    if (!Array.isArray(assetReads)) return [];

    return assetReads
      .map((read, index) => {
        const token = TOBYWORLD_SWAP_TOKENS[index];

        if (!token || !read || read.status !== 'success') return null;

        const balance = toBigIntBalance(read.result);

        if (balance <= BigInt(0)) return null;

        return token;
      })
      .filter((token): token is (typeof TOBYWORLD_SWAP_TOKENS)[number] => Boolean(token));
  }, [assetReads]);

  const assetCount = heldAssets.length;
  const hasEnoughAssets = assetCount >= REQUIRED_ASSET_COUNT;
  const canUsePassport = Boolean(isConnected && address && hasEnoughAssets);

  const stats = useMemo(
    () => [
      {
        label: 'Streak',
        value: `${formatNumber(snapshot?.streakCount)}d`,
      },
      {
        label: 'Best',
        value: `${formatNumber(snapshot?.bestStreak)}d`,
      },
      {
        label: 'Rites',
        value: formatNumber(snapshot?.totalCompletions),
      },
      {
        label: 'Power',
        value: `${formatNumber(snapshot?.currentEchoPower)}x`,
      },
    ],
    [snapshot],
  );

  const statusLabel = getPassportStateLabel({
    isLoading,
    isRerolling,
    data,
    hasEnoughAssets,
    assetCount,
  });

  const loadMiniAppContext = useCallback(async () => {
    try {
      const context = await Promise.resolve((sdk as PassportSdk).context);

      if (context?.user) {
        setContextUser(context.user);
      }
    } catch {
      setContextUser(null);
    }
  }, []);

  const connectWallet = useCallback(() => {
    setNotice(null);

    const preferredConnector =
      connectors.find((connector) => /farcaster/i.test(connector.name)) ??
      connectors.find((connector) => /base|coinbase/i.test(connector.name)) ??
      connectors.find((connector) => /injected|metamask/i.test(connector.name)) ??
      connectors[0];

    if (!preferredConnector) {
      setNotice('No wallet connector found. Open this in Farcaster or a wallet browser.');
      return;
    }

    connect({ connector: preferredConnector });
  }, [connect, connectors]);

  const fetchPassport = useCallback(
    async (reroll = false) => {
      const authFetch = getBoundQuickAuthFetch();

      if (!isConnected || !address) {
        setNotice('Connect a wallet that holds at least two Tobyworld assets to stamp a passport.');
        connectWallet();
        return;
      }

      if (!hasEnoughAssets) {
        setNotice(
          `Passport locked. This wallet currently holds ${assetCount}/${REQUIRED_ASSET_COUNT} required Tobyworld assets.`,
        );
        return;
      }

      if (!authFetch) {
        setNotice(
          'Wallet gate passed. To generate the full Farcaster passport, open in Farcaster. Web supporter passport support can use the Support Rite button.',
        );
        return;
      }

      const previousTitle = data?.persona?.title;

      setNotice(null);

      if (reroll) {
        setIsRerolling(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await authFetch(`${getOrigin()}/api/tobyworld/pond-passport`, {
          method: reroll ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const nextData = (await response.json()) as PassportResponse;

        if (!response.ok) {
          throw new Error(nextData.error || 'The pond refused to stamp the passport.');
        }

        setData(nextData);
        setFreshInkKey((value) => value + 1);

        if (reroll) {
          const nextTitle = nextData.persona?.title;

          setNotice(
            nextTitle && nextTitle !== previousTitle
              ? `New stamp loaded: ${nextTitle}.`
              : 'Passport rerolled. The pond may have kept one detail because it liked it.',
          );
        } else {
          setNotice(nextData.persona ? 'Passport loaded.' : null);
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'The passport ink ran.');
      } finally {
        setIsLoading(false);
        setIsRerolling(false);
      }
    },
    [address, assetCount, connectWallet, data?.persona?.title, hasEnoughAssets, isConnected],
  );

  useEffect(() => {
    void loadMiniAppContext();
  }, [loadMiniAppContext]);

  useEffect(() => {
    if (!canUsePassport || data?.persona) return;

    void fetchPassport(false);
  }, [canUsePassport, data?.persona, fetchPassport]);

  async function supportRiteWithWallet() {
    if (!address) {
      connectWallet();
      return;
    }

    if (!hasEnoughAssets) {
      setNotice(
        `Supporter passport locked. This wallet currently holds ${assetCount}/${REQUIRED_ASSET_COUNT} required Tobyworld assets.`,
      );
      return;
    }

    try {
      setIsSupporting(true);
      setNotice(null);

      const message = buildWalletSupportMessage(address);
      const signature = await signMessageAsync({ message });

      const response = await fetch('/api/tobyworld/wallet-support-rite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature,
        }),
      });

      const result = (await response.json()) as WalletSupportResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Unable to support today’s rite.');
      }

      setNotice(
        result.message ||
          'The wallet has supported today’s pond rite. The pond stamped the ledger.',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The wallet stamp failed.');
    } finally {
      setIsSupporting(false);
    }
  }

  async function sharePassport() {
    if (!persona) return;

    const text = persona.shareText;
    const composeCast = (sdk as PassportSdk).actions?.composeCast;

    try {
      if (composeCast) {
        await Promise.resolve(
          composeCast({
            text,
            embeds: [getOrigin()],
          }),
        );

        setNotice('Passport cast opened.');
        return;
      }

      const copied = await copyText(text);
      setNotice(copied ? 'Passport share text copied.' : text);
    } catch {
      const copied = await copyText(text);
      setNotice(copied ? 'Passport share text copied.' : text);
    }
  }

  async function shareToX() {
    if (!persona) return;

    const url = new URL('https://twitter.com/intent/tweet');
    url.searchParams.set('text', persona.shareText);
    url.searchParams.set('url', getOrigin());

    await openExternalUrl(url.toString());
  }

  async function copyPassport() {
    if (!persona) return;

    const copied = await copyText(persona.shareText);
    setNotice(copied ? 'Passport share text copied.' : persona.shareText);
  }

  return (
    <section className="pond-passport" aria-label="Tobyworld Pond Passport">
      <div className="pond-passport-glow" aria-hidden="true" />

      <div className="pond-passport-toolbar">
        <div>
          <p>POND PASSPORT</p>
          <span>{statusLabel}</span>
        </div>

        <div className="pond-passport-toolbar-chip">
          <strong>{getSourceLabel(data?.source)}</strong>
          <small>{getIssuedDate(data?.generatedOn)}</small>
        </div>
      </div>

      {!isConnected && (
        <div className="pond-passport-gate">
          <strong>The passport desk is open.</strong>
          <p>
            Connect a wallet that holds at least two Tobyworld assets to reveal your
            Pond Passport. In Farcaster, your passport uses your profile, PFP, and
            Daily Rite activity. On web, you can support today’s rite and share to X.
          </p>

          <button type="button" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? 'Opening wallet…' : 'Connect Wallet'}
          </button>
        </div>
      )}

      {isConnected && !hasEnoughAssets && (
        <div className="pond-passport-gate">
          <strong>Two-asset gate.</strong>
          <p>
            This wallet currently holds {assetCount}/{REQUIRED_ASSET_COUNT} required
            Tobyworld assets. Hold any two of Toby, Taboshi, and Patience to stamp a
            passport.
          </p>

          <div className="pond-passport-asset-pills">
            {TOBYWORLD_SWAP_TOKENS.map((token) => {
              const held = heldAssets.some((heldToken) => heldToken.id === token.id);

              return (
                <span className={held ? 'is-held' : ''} key={token.id}>
                  {held ? '✓ ' : ''}
                  {token.symbol}
                </span>
              );
            })}
          </div>

          <button type="button" onClick={() => disconnect()} className="ghost">
            Disconnect
          </button>
        </div>
      )}

      <article
        className={`pond-passport-card ${persona ? 'is-ready' : 'is-pending'} ${
          !hasEnoughAssets ? 'is-locked' : ''
        }`}
        key={freshInkKey}
      >
        <div className="pond-passport-watermark" aria-hidden="true">
          POND
        </div>

        <div className="pond-passport-card-head">
          <div className="pond-passport-photo">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt=""
                aria-hidden="true"
                onError={() => {
                  if (pfpUrl) {
                    setPfpFailed(true);
                    return;
                  }

                  setFrogImageFailed(true);
                }}
              />
            ) : (
              <span>🐸</span>
            )}
          </div>

          <div className="pond-passport-identity">
            <small>ISSUED TO</small>
            <h3>{getDisplayName(snapshot, contextUser, address)}</h3>
            <p>
              {getHandle(snapshot, contextUser, address)}
              {snapshot?.fid ? ` · FID ${snapshot.fid}` : ''}
            </p>
          </div>

          <div className="pond-passport-mini-stamp" aria-hidden="true">
            △🐸🍃
          </div>
        </div>

        <div className="pond-passport-title-block">
          <small>POND TITLE</small>
          <h2>
            {persona?.title ??
              (hasEnoughAssets ? 'Awaiting pond stamp…' : 'Passport locked')}
          </h2>
          <p>
            {persona?.characteristic ??
              (hasEnoughAssets
                ? 'The frog at the desk is still checking the file.'
                : 'Hold at least two Tobyworld assets in this wallet to reveal your stamp.')}
          </p>
        </div>

        <div className="pond-passport-trait-grid">
          <div>
            <small>HABIT</small>
            <p>{persona?.strangeHabit ?? 'Pending.'}</p>
          </div>

          <div>
            <small>WARNING</small>
            <p>{persona?.pondWarning ?? 'Pending.'}</p>
          </div>
        </div>

        <div className="pond-passport-stat-row">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="pond-passport-bottom-row">
          <div>
            <small>MARK</small>
            <strong>{snapshot?.currentMark ?? 'Unstamped Frog'}</strong>
          </div>

          <div className="pond-passport-approved">
            <span>{persona?.stamp ?? '△ · 🐸 · 🍃'}</span>
            <b>{hasEnoughAssets ? 'APPROVED' : 'LOCKED'}</b>
          </div>
        </div>
      </article>

      <div className="pond-passport-actions">
        {!isConnected ? (
          <button type="button" className="primary" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? 'Opening…' : 'Connect'}
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={() => void fetchPassport(true)}
            disabled={
              isRerolling ||
              isLoading ||
              !hasEnoughAssets ||
              !persona ||
              (data?.limits?.rerollsRemaining ?? 0) <= 0
            }
          >
            {isRerolling ? 'Rerolling…' : 'Reroll'}
          </button>
        )}

        <button
          type="button"
          onClick={() => void supportRiteWithWallet()}
          disabled={!isConnected || !hasEnoughAssets || isSupporting || isSigning}
        >
          {isSupporting || isSigning ? 'Signing…' : 'Support Rite'}
        </button>

        <button type="button" onClick={() => void sharePassport()} disabled={!persona}>
          Cast
        </button>

        <button type="button" onClick={() => void shareToX()} disabled={!persona}>
          X
        </button>

        <button type="button" onClick={() => void copyPassport()} disabled={!persona}>
          Copy
        </button>

        <button
          type="button"
          className="ghost"
          onClick={() => void fetchPassport(false)}
          disabled={isLoading || isRerolling || !hasEnoughAssets}
        >
          {isLoading ? 'Loading…' : 'Reload'}
        </button>
      </div>

      {notice && (
        <p className="pond-passport-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
