'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniAppRuntime } from './MiniAppBoot';
import './daily-pond-rite.css';

type DailyRite = {
  key: string;
  icon: string;
  title: string;
  instruction: string;
  completedLine: string;
};

type DailyRiteResponse = {
  fid: number;
  today: string;
  rite: DailyRite;
  completedToday: boolean;
  streak: number;
  bestStreak: number;
  totalCompletions: number;
  mark: string;
  shareText: string | null;
  error?: string;
};

type QuickAuthSdk = typeof sdk & {
  quickAuth?: {
    fetch: typeof fetch;
  };
};

const SHARE_VERSION = 'daily-v1';

function getShareUrl() {
  const url = new URL(window.location.origin);

  url.searchParams.set('daily', 'pond-rite');
  url.searchParams.set('share', SHARE_VERSION);

  return url.toString();
}

function getPlaceholderRite(): DailyRite {
  return {
    key: 'still-water',
    icon: '△',
    title: 'Plant Stillness',
    instruction: 'Open in Farcaster to complete today’s rite.',
    completedLine: '△ Stillness planted.',
  };
}

export function DailyPondRite() {
  const miniApp = useMiniAppRuntime();

  const [data, setData] = useState<DailyRiteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const quickAuthFetch = (sdk as QuickAuthSdk).quickAuth?.fetch;

  const rite = data?.rite ?? getPlaceholderRite();
  const canPersist = Boolean(miniApp.isMiniApp && quickAuthFetch);
  const shareText = data?.shareText ?? null;

  const statusCopy = useMemo(() => {
    if (!canPersist) {
      return 'Open this inside Farcaster to save streaks by FID.';
    }

    if (!data) {
      return 'Reading the pond…';
    }

    if (data.completedToday) {
      return 'Today’s rite is complete. The pond remembers.';
    }

    return 'Complete today’s rite to extend your streak.';
  }, [canPersist, data]);

  const fetchDailyRite = useCallback(async () => {
    if (!quickAuthFetch || !miniApp.isMiniApp) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      const response = await quickAuthFetch('/api/tobyworld/daily-rite');

      const nextData = (await response.json()) as DailyRiteResponse;

      if (!response.ok) {
        throw new Error(nextData.error || 'Unable to read today’s rite.');
      }

      setData(nextData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The pond could not read today’s rite.');
    } finally {
      setIsLoading(false);
    }
  }, [miniApp.isMiniApp, quickAuthFetch]);

  useEffect(() => {
    void fetchDailyRite();
  }, [fetchDailyRite]);

  async function completeRite() {
    if (!quickAuthFetch || !miniApp.isMiniApp) {
      setNotice('Open this inside Farcaster to complete the persistent daily rite.');
      return;
    }

    setIsCompleting(true);
    setNotice(null);

    try {
      const response = await quickAuthFetch('/api/tobyworld/daily-rite', {
        method: 'POST',
      });

      const nextData = (await response.json()) as DailyRiteResponse;

      if (!response.ok) {
        throw new Error(nextData.error || 'Unable to complete today’s rite.');
      }

      setData(nextData);
      setNotice('Rite complete. Your pond streak was saved.');
      window.navigator.vibrate?.([12, 28, 18]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The rite paused. Try again.');
    } finally {
      setIsCompleting(false);
    }
  }

  async function shareToFarcaster() {
    if (!shareText) {
      setNotice('Complete today’s rite first, then cast it.');
      return;
    }

    const appUrl = getShareUrl();

    try {
      await sdk.actions.composeCast({
        text: shareText,
        embeds: [appUrl],
      });

      setNotice('Cast composer opened. Let the ripple travel.');
    } catch {
      await navigator.clipboard.writeText(`${shareText}\n\n${appUrl}`);
      setNotice('Cast text copied. Paste it into Farcaster.');
    }
  }

  function shareToX() {
    if (!shareText) {
      setNotice('Complete today’s rite first, then post it.');
      return;
    }

    const appUrl = getShareUrl();
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `${shareText}\n\n${appUrl}`,
    )}`;

    window.open(intent, '_blank', 'noopener,noreferrer');
  }

  async function copyRite() {
    if (!shareText) {
      setNotice('Complete today’s rite first, then copy it.');
      return;
    }

    await navigator.clipboard.writeText(`${shareText}\n\n${getShareUrl()}`);
    setNotice('Rite copied.');
  }

  return (
    <section className="daily-pond" aria-label="Daily Tobyworld Pond Rite">
      <div className="daily-pond-glow" aria-hidden="true" />

      <header className="daily-pond-header">
        <div>
          <p>DAILY POND RITE</p>
          <h2>One small ritual. One shared ripple.</h2>
          <span>{statusCopy}</span>
        </div>

        <div className="daily-pond-date">
          <strong>{data?.today ?? 'Today'}</strong>
          <small>{canPersist ? 'FID saved' : 'Farcaster needed'}</small>
        </div>
      </header>

      <div className="daily-pond-card">
        <div className="daily-pond-symbol">
          <span>{rite.icon}</span>
        </div>

        <div className="daily-pond-copy">
          <p>TODAY’S RITE</p>
          <h3>{rite.title}</h3>
          <span>{rite.instruction}</span>
        </div>
      </div>

      <div className="daily-pond-stats">
        <div>
          <strong>{data?.streak ?? 0}</strong>
          <span>streak</span>
        </div>
        <div>
          <strong>{data?.bestStreak ?? 0}</strong>
          <span>best</span>
        </div>
        <div>
          <strong>{data?.totalCompletions ?? 0}</strong>
          <span>rites</span>
        </div>
      </div>

      <div className="daily-pond-mark">
        <span>CURRENT MARK</span>
        <strong>{data?.mark ?? 'Pond Visitor'}</strong>
      </div>

      <div className="daily-pond-actions">
        <button
          type="button"
          className="daily-pond-primary"
          onClick={completeRite}
          disabled={!canPersist || isLoading || isCompleting || data?.completedToday}
        >
          {isCompleting
            ? 'Saving rite…'
            : data?.completedToday
              ? 'Rite Complete'
              : 'Complete Today’s Rite ✦'}
        </button>

        <button type="button" onClick={shareToFarcaster} disabled={!shareText}>
          Cast
        </button>

        <button type="button" onClick={shareToX} disabled={!shareText}>
          Post to X
        </button>

        <button type="button" onClick={copyRite} disabled={!shareText}>
          Copy
        </button>
      </div>

      {shareText && (
        <pre className="daily-pond-preview" aria-label="Daily rite share preview">
          {shareText}
        </pre>
      )}

      {notice && (
        <p className="daily-pond-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
