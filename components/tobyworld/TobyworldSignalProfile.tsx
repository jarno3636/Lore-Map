'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { erc20Abi, zeroAddress } from 'viem';
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

const ASSET_IDS: TobyworldAssetId[] = ['toby', 'patience', 'taboshi'];

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

  const assetSignals = useMemo<Record<TobyworldAssetId, AssetPresence>>(() => {
    const result: Record<TobyworldAssetId, AssetPresence> = {
      toby: 'not_detected',
      patience: 'not_detected',
      taboshi: 'not_detected',
    };

    TOBYWORLD_ASSETS.forEach((asset, index) => {
      const balance = balances.data?.[index]?.result;
      result[asset.id] = typeof balance === 'bigint' && balance > 0n ? 'held' : 'not_detected';
    });

    return result;
  }, [balances.data]);

  const profileInput = useMemo<TobyworldProfileInput>(
    () => ({
      displayName: miniApp.displayName,
      handle: miniApp.handle,
      assets: assetSignals,
      activity,
    }),
    [activity, assetSignals, miniApp.displayName, miniApp.handle],
  );

  const fallbackProfile = useMemo(() => createFallbackProfile(profileInput), [profileInput]);
  const profile = generated ?? fallbackProfile;

  const preferredConnector = useMemo(() => {
    const match = (needle: string) =>
      connectors.find((connector) =>
        `${connector.id} ${connector.name}`.toLowerCase().includes(needle),
      );

    if (miniApp.isMiniApp) return match('farcaster') ?? connectors[0];
    return match('base') ?? match('injected') ?? connectors[0];
  }, [connectors, miniApp.isMiniApp]);

  const refreshActivity = useCallback(() => {
    setActivity(readAtlasActivity());
  }, []);

  useEffect(() => {
    refreshActivity();
    window.addEventListener('tobyworld:atlas-updated', refreshActivity);
    return () => window.removeEventListener('tobyworld:atlas-updated', refreshActivity);
  }, [refreshActivity]);

  useEffect(() => {
    if (!miniApp.isMiniApp || isConnected || autoConnectAttempted.current || !preferredConnector) {
      return;
    }

    autoConnectAttempted.current = true;

    // In a Farcaster Mini App, the connector reuses the wallet already linked
    // to the host. If the host has no wallet available, the regular button remains.
    void connectAsync({ connector: preferredConnector }).catch(() => undefined);
  }, [connectAsync, isConnected, miniApp.isMiniApp, preferredConnector]);

  async function connectWallet() {
    if (!preferredConnector) {
      setNotice('No compatible wallet connector is available in this browser.');
      return;
    }

    try {
      await connectAsync({ connector: preferredConnector });
      setNotice('Wallet signal connected. Reading only the Tobyworld asset signals.');
    } catch {
      setNotice('Wallet connection was cancelled or unavailable.');
    }
  }

  async function generateProfile() {
    if (!isConnected || !address) {
      setNotice('Connect a wallet first so the atlas can read your asset signals.');
      return;
    }

    setIsGenerating(true);
    setNotice(null);

    try {
      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileInput),
      };

      const response = miniApp.isMiniApp
        ? await sdk.quickAuth.fetch('/api/tobyworld/profile', init)
        : await fetch('/api/tobyworld/profile', init);

      const data = (await response.json()) as ProfileApiResponse;
      if (!response.ok || !data.profile) throw new Error(data.error || 'Unable to generate profile');

      setGenerated(data.profile);
      setSource(data.source);
      setNotice(
        data.source === 'gemini'
          ? 'Your Tobyworld signal is ready. It contains no token amounts.'
          : 'The lore engine is resting, so the atlas shaped a profile from your local signals.',
      );
    } catch {
      setGenerated(fallbackProfile);
      setSource('fallback');
      setNotice('The lore engine is resting, so the atlas shaped a profile from your local signals.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function shareToFarcaster() {
    const appUrl = `${window.location.origin}/?signal=tobyworld`;

    try {
      if (miniApp.isMiniApp && miniApp.supportsComposeCast) {
        await sdk.actions.composeCast({
          text: profile.castText,
          embeds: [appUrl],
        });
        setNotice('Cast composer opened. You can edit before posting.');
        return;
      }

      const shareText = `${profile.castText}\n${appUrl}`;
      if (navigator.share) {
        await navigator.share({ title: 'My Tobyworld Signal', text: shareText, url: appUrl });
        setNotice('Share sheet opened.');
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setNotice('Cast-ready text copied. Paste it into Farcaster.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setNotice('Sharing paused. Your profile is still ready to copy.');
      }
    }
  }

  function shareToX() {
    const appUrl = `${window.location.origin}/?signal=tobyworld`;
    const text = `${profile.tweetText}\n${appUrl}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intent, '_blank', 'noopener,noreferrer');
  }

  const assetStatus = (assetId: TobyworldAssetId) => {
    if (!isConnected) return 'connect to read';
    if (balances.isLoading || balances.isFetching) return 'reading signal';
    return assetSignals[assetId] === 'held' ? 'signal present' : 'not detected';
  };

  return (
    <section className="signal-profile" aria-label="Your Tobyworld signal">
      <div className="signal-profile-glow" aria-hidden="true" />

      <header className="signal-profile-header">
        <div>
          <p className="signal-kicker">YOUR TOBYWORLD SIGNAL</p>
          <h2>Read the pond. Keep the numbers private.</h2>
          <p>
            The atlas reads onchain presence locally, combines it with the rituals you have discovered,
            then turns the result into a shareable lore identity.
          </p>
        </div>

        <div className={`signal-host-pill ${miniApp.isMiniApp ? 'is-miniapp' : ''}`}>
          <span>{miniApp.isMiniApp ? '◉' : '◌'}</span>
          {miniApp.isMiniApp ? 'Farcaster linked' : 'Web explorer'}
        </div>
      </header>

      <div className="signal-wallet-row">
        <div>
          <span className="signal-wallet-label">WALLET</span>
          <strong>
            {isConnected && address
              ? `${address.slice(0, 6)}…${address.slice(-4)}`
              : accountStatus === 'reconnecting'
                ? 'Reconnecting to pond…'
                : 'Not connected'}
          </strong>
          <small>
            {miniApp.isMiniApp
              ? 'Farcaster attempts to reuse the wallet already linked to the host.'
              : 'Use Base Account or an installed wallet. Read-only by default.'}
          </small>
        </div>

        <button
          type="button"
          className="signal-connect-button"
          onClick={connectWallet}
          disabled={isConnected || isConnecting}
        >
          {isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      </div>

      <div className="signal-asset-grid">
        {TOBYWORLD_ASSETS.map((asset) => (
          <article className={`signal-asset-card accent-${asset.accent}`} key={asset.id}>
            <img src={asset.imageSrc} alt="" aria-hidden="true" />
            <div className="signal-asset-copy">
              <span>{asset.symbol}</span>
              <strong>{asset.name}</strong>
              <small>{assetStatus(asset.id)}</small>
            </div>
            <details>
              <summary>How it fits</summary>
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

      <div className="signal-activity-panel">
        <div>
          <p className="signal-kicker">ATLAS ACTIVITY</p>
          <h3>What your world remembers</h3>
        </div>
        <button type="button" className="signal-refresh" onClick={refreshActivity}>
          Refresh signals ↻
        </button>

        <div className="signal-activity-chips">
          <ActivityChip active={activity.stillWaterAwakened} label="Still Water" icon="△" />
          <ActivityChip active={activity.gardenLeaves > 0} label={`${activity.gardenLeaves}/3 leaves`} icon="🍃" />
          <ActivityChip active={activity.satoAwake} label="Sato return" icon="🌀" />
          <ActivityChip active={activity.lorelandSeen} label="Loreland" icon="✦" />
        </div>
      </div>

      <article className={`signal-profile-result accent-${profile.accent}`}>
        <span className="signal-result-orb" aria-hidden="true">✦</span>
        <p className="signal-kicker">{profile.archetype}</p>
        <h3>{profile.title}</h3>
        <p>{profile.narrative}</p>
        {source && <small className="signal-source-note">{source === 'gemini' ? 'Lore shaped from your private signals.' : 'Atlas fallback profile.'}</small>}
      </article>

      <div className="signal-actions">
        <button
          type="button"
          className="signal-generate-button"
          onClick={generateProfile}
          disabled={!isConnected || isGenerating}
        >
          {isGenerating ? 'Reading the pond…' : 'Generate my lore signal ✦'}
        </button>
        <button type="button" className="signal-share-button" onClick={shareToFarcaster}>
          Cast
        </button>
        <button type="button" className="signal-share-button" onClick={shareToX}>
          Post to X
        </button>
      </div>

      {notice && <p className="signal-notice" role="status">{notice}</p>}

      <p className="signal-privacy-note">
        Token balances are read only in the browser to decide whether an asset signal is present. The profile request sends only
        <strong> present / not detected </strong>
        states and Atlas activity—never raw balances, token amounts, wallet value, or your wallet address.
      </p>
    </section>
  );
}

function ActivityChip({ active, icon, label }: { active: boolean; icon: string; label: string }) {
  return (
    <span className={`signal-activity-chip ${active ? 'is-active' : ''}`}>
      <b>{icon}</b>
      {label}
    </span>
  );
}
