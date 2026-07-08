'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { erc20Abi, formatUnits, zeroAddress } from 'viem';
import { useAccount, useConnect, useReadContracts } from 'wagmi';
import {
  createFallbackProfile,
  readAtlasActivity,
  type AssetPresence,
  type TobyworldActivity,
  type TobyworldGeneratedProfile,
  type TobyworldProfileInput,
} from '@/lib/tobyworld-profile';
import { TOBYWORLD_ASSETS, type TobyworldAssetId } from '@/lib/tobyworld-assets';
import { useMiniAppRuntime } from './MiniAppBoot';
import './tobyworld-signal-profile.css';

type ProfileApiResponse = {
  profile: TobyworldGeneratedProfile;
  source: 'gemini' | 'fallback';
  error?: string;
};

type QuickAuthSdk = typeof sdk & {
  quickAuth?: {
    fetch: typeof fetch;
  };
};

const TOKEN_DECIMALS: Record<TobyworldAssetId, number> = {
  toby: 18,
  patience: 18,
  taboshi: 18,
};

const POND_LORE_LINES = [
  'we move not by leaps. we move by stillness.',
  'plant patience. let the ripple sleep. watch what rises.',
  'the pond does not chase the current. the current returns to the pond.',
  'kindness, stillness, honor in the wait.',
  'let rivers flow, not be forced.',
];

function hasPositiveTokenAmount(balance: unknown) {
  return typeof balance === 'bigint' && balance.toString() !== '0';
}

function formatTokenAmount(balance: unknown, assetId: TobyworldAssetId) {
  if (typeof balance !== 'bigint') return '0';
  if (balance.toString() === '0') return '0';

  const formatted = formatUnits(balance, TOKEN_DECIMALS[assetId]);
  const numeric = Number(formatted);

  if (!Number.isFinite(numeric)) {
    return formatted.split('.')[0] ?? formatted;
  }

  if (numeric >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(numeric);
  }

  if (numeric >= 1) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 4,
    }).format(numeric);
  }

  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 4,
  }).format(numeric);
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function countAtlasRituals(activity: TobyworldActivity) {
  let count = 0;

  if (activity.stillWaterAwakened) count += 1;
  if (activity.gardenLeaves > 0) count += 1;
  if (activity.satoAwake) count += 1;
  if (activity.lorelandSeen) count += 1;

  return count;
}

function getPondRank(heldCount: number, ritualCount: number) {
  const score = heldCount + ritualCount;

  if (score >= 6) return 'Bedrock Keeper';
  if (score >= 4) return 'Koi Current Walker';
  if (score >= 2) return 'Still-Water Tender';

  return 'Pond Visitor';
}

export function TobyworldSignalProfile() {
  const miniApp = useMiniAppRuntime();

  const { address, isConnected, status: accountStatus } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();

  const [activity, setActivity] = useState<TobyworldActivity>(() => readAtlasActivity());
  const [generated, setGenerated] = useState<TobyworldGeneratedProfile | null>(null);
  const [source, setSource] = useState<'gemini' | 'fallback' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const autoConnectAttempted = useRef(false);

  const contracts = useMemo(
    () =>
      TOBYWORLD_ASSETS.map((asset) => ({
        abi: erc20Abi,
        address: asset.address,
        functionName: 'balanceOf' as const,
        args: [address ?? zeroAddress] as const,
      })),
    [address],
  );

  const balances = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(address),
      staleTime: 20_000,
      refetchOnWindowFocus: false,
    },
  });

  const assetStates = useMemo<Record<TobyworldAssetId, AssetPresence>>(() => {
    const result: Record<TobyworldAssetId, AssetPresence> = {
      toby: 'not_detected',
      patience: 'not_detected',
      taboshi: 'not_detected',
    };

    TOBYWORLD_ASSETS.forEach((asset, index) => {
      const balance = balances.data?.[index]?.result;
      result[asset.id] = hasPositiveTokenAmount(balance) ? 'held' : 'not_detected';
    });

    return result;
  }, [balances.data]);

  const assetAmounts = useMemo<Record<TobyworldAssetId, string>>(() => {
    const result: Record<TobyworldAssetId, string> = {
      toby: '0',
      patience: '0',
      taboshi: '0',
    };

    TOBYWORLD_ASSETS.forEach((asset, index) => {
      const balance = balances.data?.[index]?.result;
      result[asset.id] = formatTokenAmount(balance, asset.id);
    });

    return result;
  }, [balances.data]);

  const heldCount = useMemo(
    () => Object.values(assetStates).filter((value) => value === 'held').length,
    [assetStates],
  );

  const ritualCount = useMemo(() => countAtlasRituals(activity), [activity]);
  const pondRank = useMemo(() => getPondRank(heldCount, ritualCount), [heldCount, ritualCount]);

  const activeLoreLine = useMemo(() => {
    const index = Math.min(POND_LORE_LINES.length - 1, heldCount + ritualCount);
    return POND_LORE_LINES[index];
  }, [heldCount, ritualCount]);

  const profileInput = useMemo<TobyworldProfileInput>(
    () => ({
      displayName: miniApp.displayName,
      handle: miniApp.handle,
      assets: assetStates,
      activity,
    }),
    [activity, assetStates, miniApp.displayName, miniApp.handle],
  );

  const fallbackProfile = useMemo(() => createFallbackProfile(profileInput), [profileInput]);
  const profile = generated ?? fallbackProfile;

  const preferredConnector = useMemo(() => {
    const match = (needle: string) =>
      connectors.find((connector) =>
        `${connector.id} ${connector.name}`.toLowerCase().includes(needle),
      );

    if (miniApp.isMiniApp) {
      return match('farcaster') ?? connectors[0];
    }

    return match('base') ?? match('injected') ?? connectors[0];
  }, [connectors, miniApp.isMiniApp]);

  const refreshActivity = useCallback(() => {
    setActivity(readAtlasActivity());
  }, []);

  useEffect(() => {
    refreshActivity();

    window.addEventListener('tobyworld:atlas-updated', refreshActivity);

    return () => {
      window.removeEventListener('tobyworld:atlas-updated', refreshActivity);
    };
  }, [refreshActivity]);

  useEffect(() => {
    if (!miniApp.isMiniApp || isConnected || autoConnectAttempted.current || !preferredConnector) {
      return;
    }

    autoConnectAttempted.current = true;

    void connectAsync({ connector: preferredConnector }).catch(() => undefined);
  }, [connectAsync, isConnected, miniApp.isMiniApp, preferredConnector]);

  function buildShareQuote() {
    const quote = activeLoreLine.replace(/^["“]|["”]$/g, '');

    return [
      `“${quote}”`,
      '',
      'Tobyworld',
      '$Patience <> $toby <> $Taboshi',
      '',
      profile.title,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async function connectWallet() {
    if (!preferredConnector) {
      setNotice('No compatible wallet was found in this browser.');
      return;
    }

    try {
      await connectAsync({ connector: preferredConnector });
      setNotice('Wallet connected. Your pond inventory is being read locally.');
    } catch {
      setNotice('Wallet connection was cancelled or unavailable.');
    }
  }

  async function generateProfile() {
    if (!isConnected || !address) {
      setNotice('Connect a wallet first so the pond can read your Tobyworld symbols.');
      return;
    }

    setIsGenerating(true);
    setNotice(null);

    try {
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        /*
          This sends only held / not_detected states and Atlas activity.
          It does not send raw balances, token amounts, wallet value, or wallet address.
        */
        body: JSON.stringify(profileInput),
      };

      const quickAuthFetch = (sdk as QuickAuthSdk).quickAuth?.fetch;

      const response =
        miniApp.isMiniApp && quickAuthFetch
          ? await quickAuthFetch('/api/tobyworld/profile', init)
          : await fetch('/api/tobyworld/profile', init);

      const data = (await response.json()) as ProfileApiResponse;

      if (!response.ok || !data.profile) {
        throw new Error(data.error || 'Unable to generate profile');
      }

      setGenerated(data.profile);
      setSource(data.source);

      setNotice(
        data.source === 'gemini'
          ? 'Your pond role is ready. Shared text does not include token amounts.'
          : 'The lore engine is resting, so the pond shaped a role from your local path.',
      );
    } catch {
      setGenerated(fallbackProfile);
      setSource('fallback');
      setNotice('The lore engine is resting, so the pond shaped a role from your local path.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function shareToFarcaster() {
    const appUrl = `${window.location.origin}/?pond=tobyworld`;
    const castText = buildShareQuote();
    const shareText = `${castText}\n\n${appUrl}`;

    try {
      if (miniApp.isMiniApp && miniApp.supportsComposeCast) {
        await sdk.actions.composeCast({
          text: castText,
          embeds: [appUrl],
        });

        setNotice('Cast composer opened. You can edit before posting.');
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'My Tobyworld Pond Role',
          text: shareText,
          url: appUrl,
        });

        setNotice('Share sheet opened.');
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setNotice('Cast-ready text copied. It does not include token amounts.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setNotice('Sharing paused. Your pond role is still ready.');
      }
    }
  }

  function shareToX() {
    const appUrl = `${window.location.origin}/?pond=tobyworld`;
    const text = `${buildShareQuote()}\n\n${appUrl}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

    window.open(intent, '_blank', 'noopener,noreferrer');
  }

  function assetStatus(assetId: TobyworldAssetId) {
    if (!isConnected) return 'unread';
    if (balances.isLoading || balances.isFetching) return 'reading pond';

    return assetStates[assetId] === 'held' ? 'in your pond' : 'not detected';
  }

  function assetAmount(assetId: TobyworldAssetId) {
    if (!isConnected) return 'connect';
    if (balances.isLoading || balances.isFetching) return 'reading…';

    return assetAmounts[assetId];
  }

  return (
    <section className="signal-profile pond-profile" aria-label="Your Tobyworld pond role">
      <div className="signal-profile-glow" aria-hidden="true" />
      <div className="pond-orbit pond-orbit-one" aria-hidden="true" />
      <div className="pond-orbit pond-orbit-two" aria-hidden="true" />

      <header className="signal-profile-header pond-profile-header">
        <div>
          <p className="signal-kicker">YOUR TOBYWORLD POND</p>
          <h2>Find your role in the still water.</h2>
          <p>
            Connect your wallet to reveal your private pond inventory. The Atlas can see what
            symbols are present, but shared lore never includes your token amounts.
          </p>
        </div>

        <div className={`signal-host-pill ${miniApp.isMiniApp ? 'is-miniapp' : ''}`}>
          <span>{miniApp.isMiniApp ? '◉' : '◌'}</span>
          {miniApp.isMiniApp ? 'Farcaster pond' : 'Web pond'}
        </div>
      </header>

      <div className="pond-hero-card">
        <div className="pond-hero-frog">
          <img src="/images/atlas/toby-pond-guardian.png" alt="" aria-hidden="true" />
        </div>

        <div className="pond-hero-copy">
          <span>POND RANK</span>
          <strong>{pondRank}</strong>
          <p>{activeLoreLine}</p>
        </div>

        <div className="pond-score">
          <b>{heldCount}</b>
          <small>symbols</small>
          <b>{ritualCount}</b>
          <small>rituals</small>
        </div>
      </div>

      <div className="signal-wallet-row pond-wallet-row">
        <div>
          <span className="signal-wallet-label">WALLET</span>
          <strong>
            {isConnected && address
              ? shortAddress(address)
              : accountStatus === 'reconnecting'
                ? 'Reconnecting to pond…'
                : 'Not connected'}
          </strong>
          <small>
            {miniApp.isMiniApp
              ? 'Farcaster can reuse the wallet already linked to the host.'
              : 'Use Base Account or an installed wallet. This is read-only.'}
          </small>
        </div>

        <button
          type="button"
          className="signal-connect-button"
          onClick={connectWallet}
          disabled={isConnected || isConnecting}
        >
          {isConnected ? 'Pond connected' : isConnecting ? 'Opening pond…' : 'Connect wallet'}
        </button>
      </div>

      <div className="pond-section-title">
        <p className="signal-kicker">POND INVENTORY</p>
        <h3>Your Tobyworld symbols</h3>
        <span>Amounts are shown only here. They are not sent to the lore engine or shared.</span>
      </div>

      <div className="signal-asset-grid pond-asset-grid">
        {TOBYWORLD_ASSETS.map((asset) => (
          <article
            className={`signal-asset-card pond-asset-card accent-${asset.accent}`}
            key={asset.id}
          >
            <div className="pond-asset-topline">
              <img src={asset.imageSrc} alt="" aria-hidden="true" />

              <div className="signal-asset-copy">
                <span>{asset.symbol}</span>
                <strong>{asset.name}</strong>
                <small>{assetStatus(asset.id)}</small>
              </div>
            </div>

            <div className="pond-amount-pill">
              <span>PRIVATE AMOUNT</span>
              <strong>{assetAmount(asset.id)}</strong>
            </div>

            <details>
              <summary>How it fits the pond</summary>
              <p>{asset.howItFits}</p>

              <div className="signal-asset-links">
                {asset.links.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                    {link.label} ↗
                  </a>
                ))}
              </div>
            </details>
          </article>
        ))}
      </div>

      <div className="signal-activity-panel pond-activity-panel">
        <div>
          <p className="signal-kicker">ATLAS MEMORY</p>
          <h3>What your pond remembers</h3>
        </div>

        <button type="button" className="signal-refresh" onClick={refreshActivity}>
          Refresh memory ↻
        </button>

        <div className="signal-activity-chips">
          <ActivityChip active={activity.stillWaterAwakened} label="Still Water" icon="△" />
          <ActivityChip
            active={activity.gardenLeaves > 0}
            label={`${activity.gardenLeaves}/3 leaves`}
            icon="🍃"
          />
          <ActivityChip active={activity.satoAwake} label="Sato return" icon="🌀" />
          <ActivityChip active={activity.lorelandSeen} label="Loreland" icon="✦" />
        </div>
      </div>

      <article className={`signal-profile-result pond-role-card accent-${profile.accent}`}>
        <span className="signal-result-orb" aria-hidden="true">
          ✦
        </span>

        <p className="signal-kicker">{profile.archetype}</p>
        <h3>{profile.title}</h3>
        <p>{profile.narrative}</p>

        {source && (
          <small className="signal-source-note">
            {source === 'gemini' ? 'Lore shaped from your private pond path.' : 'Atlas fallback role.'}
          </small>
        )}
      </article>

      <div className="signal-actions pond-actions">
        <button
          type="button"
          className="signal-generate-button"
          onClick={generateProfile}
          disabled={!isConnected || isGenerating}
        >
          {isGenerating ? 'Reading the pond…' : 'Reveal my pond role ✦'}
        </button>

        <button type="button" className="signal-share-button" onClick={shareToFarcaster}>
          Cast
        </button>

        <button type="button" className="signal-share-button" onClick={shareToX}>
          Post to X
        </button>
      </div>

      {notice && (
        <p className="signal-notice" role="status">
          {notice}
        </p>
      )}

      <p className="signal-privacy-note pond-privacy-note">
        Your token amounts are displayed locally for you. The profile request sends only{' '}
        <strong>held / not detected</strong> states and Atlas activity. Shared messages never
        include raw balances, token amounts, wallet value, or your wallet address.
      </p>
    </section>
  );
}

function ActivityChip({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: string;
  label: string;
}) {
  return (
    <span className={`signal-activity-chip ${active ? 'is-active' : ''}`}>
      <b>{icon}</b>
      {label}
    </span>
  );
}
