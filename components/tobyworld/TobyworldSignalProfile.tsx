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

const TOBYWORLD_LINE = 'Tobyworld';
const TOBYWORLD_PATH_LINE = '$Patience <> $toby <> $Taboshi';
const SHARE_CACHE_VERSION = 'v5';

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

function safeReadAtlasActivity() {
  try {
    return readAtlasActivity();
  } catch {
    return {
      stillWaterAwakened: false,
      gardenLeaves: 0,
      satoAwake: false,
      lorelandSeen: false,
    } satisfies TobyworldActivity;
  }
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

function cleanGeneratedShareText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\n?https?:\/\/\S+/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      const normalized = line.toLowerCase().replace(/\s+/g, ' ');

      if (!normalized) return false;
      if (normalized === TOBYWORLD_LINE.toLowerCase()) return false;

      const includesPath =
        normalized.includes('$patience') &&
        normalized.includes('$toby') &&
        normalized.includes('$taboshi');

      return !includesPath;
    })
    .join('\n')
    .trim();
}

function trimForShare(value: string, maxLength = 760) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildRoleTextFromProfile(profile: TobyworldGeneratedProfile, maxLength = 760) {
  const title = profile.title?.trim();
  const narrative = profile.narrative?.trim();

  const preferredText = [title, narrative].filter(Boolean).join('\n\n');

  const fallbackText =
    profile.castText?.trim() ||
    profile.tweetText?.trim() ||
    preferredText;

  const cleaned = cleanGeneratedShareText(preferredText || fallbackText);

  return trimForShare(cleaned || fallbackText || 'The pond remembers.', maxLength);
}

function buildCastQuote(profile: TobyworldGeneratedProfile) {
  return [
    buildRoleTextFromProfile(profile, 760),
    '',
    TOBYWORLD_LINE,
    TOBYWORLD_PATH_LINE,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildXQuote(profile: TobyworldGeneratedProfile) {
  return [
    buildRoleTextFromProfile(profile, 185),
    '',
    TOBYWORLD_LINE,
    TOBYWORLD_PATH_LINE,
  ]
    .filter(Boolean)
    .join('\n');
}

function getShareUrl() {
  const url = new URL(window.location.origin);

  url.searchParams.set('pond', 'tobyworld');
  url.searchParams.set('share', SHARE_CACHE_VERSION);

  return url.toString();
}

export function TobyworldSignalProfile() {
  const miniApp = useMiniAppRuntime();

  const { address, isConnected, status: accountStatus } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();

  const [activity, setActivity] = useState<TobyworldActivity>(() => safeReadAtlasActivity());
  const [generated, setGenerated] = useState<TobyworldGeneratedProfile | null>(null);
  const [source, setSource] = useState<'gemini' | 'fallback' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [castQuote, setCastQuote] = useState<string | null>(null);
  const [xQuote, setXQuote] = useState<string | null>(null);

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
  const hasRevealedRole = Boolean(castQuote);

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
    setActivity(safeReadAtlasActivity());
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
    setCastQuote(null);
    setXQuote(null);

    try {
      const response = await fetch('/api/tobyworld/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileInput),
      });

      let data: ProfileApiResponse | null = null;

      try {
        data = (await response.json()) as ProfileApiResponse;
      } catch {
        throw new Error(`Profile API returned ${response.status} without valid JSON.`);
      }

      if (!response.ok || !data.profile) {
        throw new Error(data.error || `Profile API failed with ${response.status}.`);
      }

      const nextProfile = data.profile;
      const nextCastQuote = buildCastQuote(nextProfile);
      const nextXQuote = buildXQuote(nextProfile);

      setGenerated(nextProfile);
      setSource(data.source);
      setCastQuote(nextCastQuote);
      setXQuote(nextXQuote);

      setNotice(
        data.source === 'gemini'
          ? 'The pond answered. Your generated quote is ready to cast.'
          : 'The lore engine rested, so the pond shaped a fallback role from your path.',
      );
    } catch (error) {
      console.error('Tobyworld profile generation failed:', error);

      const nextCastQuote = buildCastQuote(fallbackProfile);
      const nextXQuote = buildXQuote(fallbackProfile);

      setGenerated(fallbackProfile);
      setSource('fallback');
      setCastQuote(nextCastQuote);
      setXQuote(nextXQuote);

      setNotice(
        error instanceof Error
          ? `The pond used a fallback role: ${error.message}`
          : 'The pond used a fallback role because the lore engine failed here.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function shareToFarcaster() {
    if (!castQuote) {
      setNotice('Reveal your pond role first so the cast uses your generated quote.');
      return;
    }

    const appUrl = getShareUrl();
    const shareText = `${castQuote}\n\n${appUrl}`;

    try {
      if (miniApp.isMiniApp && miniApp.supportsComposeCast) {
        const result = await sdk.actions.composeCast({
          text: castQuote,
          embeds: [appUrl],
        });

        if (result?.cast) {
          setNotice('Cast posted with your generated quote.');
        } else {
          setNotice('Cast composer opened. You can edit before posting.');
        }

        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'My Tobyworld Pond Role',
          text: shareText,
          url: appUrl,
        });

        setNotice('Share sheet opened with your generated quote.');
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setNotice('Generated cast text copied. It does not include token amounts.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setNotice('Sharing paused. Your generated quote is still ready.');
      }
    }
  }

  async function copyQuote() {
    if (!castQuote) {
      setNotice('Reveal your pond role first, then copy the generated quote.');
      return;
    }

    await navigator.clipboard.writeText(`${castQuote}\n\n${getShareUrl()}`);
    setNotice('Generated quote copied.');
  }

  function shareToX() {
    if (!xQuote) {
      setNotice('Reveal your pond role first so the post uses your generated quote.');
      return;
    }

    const appUrl = getShareUrl();
    const text = `${xQuote}\n\n${appUrl}`;
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

  const castPreview =
    castQuote ??
    [
      'Reveal your pond role to prepare a generated cast.',
      '',
      TOBYWORLD_LINE,
      TOBYWORLD_PATH_LINE,
    ].join('\n');

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

      <div className="pond-rune-trail" aria-label="Tobyworld rune path">
        <span>△</span>
        <i />
        <span>🐸</span>
        <i />
        <span>🍃</span>
        <i />
        <span>🌀</span>
        <i />
        <span>✦</span>
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
            {source === 'gemini'
              ? 'Lore shaped by Gemini from your private pond path.'
              : 'Atlas fallback role.'}
          </small>
        )}
      </article>

      <article className="pond-cast-preview" aria-label="Cast preview">
        <div>
          <p className="signal-kicker">CAST PREVIEW</p>
          <h3>{castQuote ? 'The generated quote the pond will send' : 'Reveal first, then cast'}</h3>
        </div>

        <pre>{castPreview}</pre>
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

        <button
          type="button"
          className="signal-share-button"
          onClick={shareToFarcaster}
          disabled={!castQuote}
        >
          Cast Quote
        </button>

        <button
          type="button"
          className="signal-share-button"
          onClick={copyQuote}
          disabled={!castQuote}
        >
          Copy Quote
        </button>

        <button
          type="button"
          className="signal-share-button"
          onClick={shareToX}
          disabled={!xQuote}
        >
          Post Quote
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
