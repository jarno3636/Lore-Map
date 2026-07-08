'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniAppRuntime } from './MiniAppBoot';
import './community-shrine.css';

type ShrineEvent = {
  id: string;
  fid: number;
  username: string | null;
  displayName: string;
  pfpUrl: string | null;
  riteDate: string;
  riteKey: string;
  riteTitle: string;
  riteIcon: string;
  mark: string;
  streak: number;
  totalCompletions: number;
  completedAt: string;
};

type ShrineResponse = {
  today: string;
  totalEchoes: number;
  todayEchoes: number;
  events: ShrineEvent[];
  error?: string;
};

const SHARE_VERSION = 'shrine-v1';

function getShareUrl() {
  const url = new URL(window.location.origin);

  url.searchParams.set('shrine', 'community');
  url.searchParams.set('share', SHARE_VERSION);

  return url.toString();
}

function getRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) return 'recently';

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';

  return `${days}d ago`;
}

function getShrineInviteText() {
  return [
    'The Tobyworld Community Shrine is waking.',
    '',
    'Complete the Daily Pond Rite.',
    'Build your streak.',
    'Leave an echo in the pond.',
    '',
    'Tobyworld',
    '$Patience <> $toby <> $Taboshi',
  ].join('\n');
}

export function CommunityShrine() {
  const miniApp = useMiniAppRuntime();

  const [data, setData] = useState<ShrineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const events = data?.events ?? [];

  const topEvent = useMemo(() => {
    return events.find((event) => event.streak >= 3) ?? events[0] ?? null;
  }, [events]);

  const fetchShrine = useCallback(async () => {
    setIsLoading(true);
    setNotice(null);

    try {
      const response = await fetch('/api/tobyworld/community-shrine', {
        cache: 'no-store',
      });

      const nextData = (await response.json()) as ShrineResponse;

      if (!response.ok) {
        throw new Error(nextData.error || 'Unable to read the Community Shrine.');
      }

      setData(nextData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The shrine is quiet right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchShrine();

    const interval = window.setInterval(() => {
      void fetchShrine();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [fetchShrine]);

  async function inviteToShrine() {
    const shareText = getShrineInviteText();
    const appUrl = getShareUrl();

    try {
      if (miniApp.isMiniApp) {
        await sdk.actions.composeCast({
          text: shareText,
          embeds: [appUrl],
        });

        setNotice('Farcaster composer opened. Invite the pond.');
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Tobyworld Community Shrine',
          text: shareText,
          url: appUrl,
        });

        setNotice('Share sheet opened.');
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n\n${appUrl}`);
      setNotice('Invite copied.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setNotice('Invite paused. The shrine still waits.');
      }
    }
  }

  return (
    <section className="community-shrine" aria-label="Tobyworld Community Shrine">
      <div className="community-shrine-glow" aria-hidden="true" />

      <header className="community-shrine-header">
        <div>
          <p>COMMUNITY SHRINE</p>
          <h2>The pond is not empty.</h2>
          <span>
            Recent rites completed by the community. Every echo comes from a saved Farcaster FID.
          </span>
        </div>

        <button type="button" onClick={inviteToShrine}>
          Invite a frog ↗
        </button>
      </header>

      <div className="community-shrine-stats">
        <div>
          <strong>{data?.todayEchoes ?? 0}</strong>
          <span>today</span>
        </div>
        <div>
          <strong>{data?.totalEchoes ?? 0}</strong>
          <span>all echoes</span>
        </div>
        <div>
          <strong>{events.length}</strong>
          <span>showing</span>
        </div>
      </div>

      {topEvent && (
        <article className="community-shrine-feature">
          <span>{topEvent.riteIcon}</span>
          <div>
            <p>RECENT ECHO</p>
            <h3>{topEvent.displayName}</h3>
            <small>
              completed {topEvent.riteTitle} · {topEvent.streak} day streak · {topEvent.mark}
            </small>
          </div>
        </article>
      )}

      <div className="community-shrine-list">
        {events.length > 0 ? (
          events.map((event) => (
            <article className="community-shrine-event" key={event.id}>
              <div className="community-shrine-pfp">
                {event.pfpUrl ? (
                  <img src={event.pfpUrl} alt="" aria-hidden="true" />
                ) : (
                  <span>{event.riteIcon}</span>
                )}
              </div>

              <div className="community-shrine-copy">
                <div>
                  <strong>{event.displayName}</strong>
                  <small>
                    {event.username ? `@${event.username}` : `FID ${event.fid}`} ·{' '}
                    {getRelativeTime(event.completedAt)}
                  </small>
                </div>

                <p>
                  {event.riteIcon} Completed <b>{event.riteTitle}</b>
                </p>

                <footer>
                  <span>{event.mark}</span>
                  <span>{event.streak} day streak</span>
                </footer>
              </div>
            </article>
          ))
        ) : (
          <div className="community-shrine-empty">
            <strong>{isLoading ? 'Reading the shrine…' : 'No echoes yet.'}</strong>
            <span>Complete the Daily Rite to become one of the first names in the pond.</span>
          </div>
        )}
      </div>

      <div className="community-shrine-actions">
        <button type="button" onClick={fetchShrine} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh Shrine ↻'}
        </button>

        <a href="#daily-rite">Complete Daily Rite ✦</a>
      </div>

      {notice && (
        <p className="community-shrine-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
