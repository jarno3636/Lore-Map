'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type QuickAuthFetch = typeof fetch;

type PassportSdk = typeof sdk & {
  quickAuth?: {
    fetch?: QuickAuthFetch;
  };
  actions?: {
    composeCast?: (params: { text: string; embeds?: string[] }) => Promise<void> | void;
  };
};

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

function getDisplayName(snapshot?: PassportSnapshot) {
  if (!snapshot) return 'Unstamped Frog';
  return snapshot.displayName || snapshot.username || `FID ${snapshot.fid}`;
}

function getHandle(snapshot?: PassportSnapshot) {
  if (!snapshot?.username) return 'Tobyworld traveler';
  return `@${snapshot.username}`;
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

export function TobyworldPondPassport() {
  const [data, setData] = useState<PassportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const persona = data?.persona;
  const snapshot = data?.snapshot;

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
        label: 'Echo Power',
        value: `${formatNumber(snapshot?.currentEchoPower)}x`,
      },
    ],
    [snapshot],
  );

  const fetchPassport = useCallback(async (reroll = false) => {
    const authFetch = getBoundQuickAuthFetch();

    if (!authFetch) {
      setNotice('Open in Farcaster to reveal your Pond Passport.');
      return;
    }

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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The passport ink ran.');
    } finally {
      setIsLoading(false);
      setIsRerolling(false);
    }
  }, []);

  useEffect(() => {
    void fetchPassport(false);
  }, [fetchPassport]);

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

  async function copyPassport() {
    if (!persona) return;

    const copied = await copyText(persona.shareText);
    setNotice(copied ? 'Passport share text copied.' : persona.shareText);
  }

  return (
    <section className="pond-passport" aria-label="Tobyworld Pond Passport">
      <div className="pond-passport-glow" aria-hidden="true" />
      <div className="pond-passport-stamp-ring" aria-hidden="true" />

      <header className="pond-passport-header">
        <div>
          <p>POND PASSPORT</p>
          <h2>Your official unofficial frog paperwork.</h2>
          <span>
            A funny daily identity stamp generated from your Tobyworld activity.
            The pond uses stats. The pond also makes questionable judgments.
          </span>
        </div>

        <div className="pond-passport-limit">
          <small>REROLLS</small>
          <strong>{data?.limits?.rerollsRemaining ?? 2}</strong>
          <span>left today</span>
        </div>
      </header>

      <article className={`pond-passport-card ${persona ? 'is-ready' : 'is-loading'}`}>
        <div className="pond-passport-card-top">
          <div className="pond-passport-avatar">
            <span>🐸</span>
          </div>

          <div>
            <p>ISSUED TO</p>
            <h3>{getDisplayName(snapshot)}</h3>
            <small>{getHandle(snapshot)}</small>
          </div>

          <div className="pond-passport-fid">
            <small>FID</small>
            <strong>{snapshot?.fid ?? '—'}</strong>
          </div>
        </div>

        <div className="pond-passport-title-block">
          <small>POND TITLE</small>
          <h3>{persona?.title ?? 'Awaiting pond stamp…'}</h3>
          <p>{persona?.characteristic ?? 'The frog at the desk is still checking the file.'}</p>
        </div>

        <div className="pond-passport-traits">
          <div>
            <small>STRANGE HABIT</small>
            <p>{persona?.strangeHabit ?? 'Pending.'}</p>
          </div>

          <div>
            <small>POND WARNING</small>
            <p>{persona?.pondWarning ?? 'Pending.'}</p>
          </div>
        </div>

        <div className="pond-passport-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="pond-passport-footer-row">
          <div>
            <small>CURRENT MARK</small>
            <strong>{snapshot?.currentMark ?? 'Unstamped Frog'}</strong>
          </div>

          <div>
            <small>STAMP</small>
            <strong>{persona?.stamp ?? '△ · 🐸 · 🍃'}</strong>
          </div>
        </div>
      </article>

      <div className="pond-passport-actions">
        <button type="button" onClick={() => void fetchPassport(false)} disabled={isLoading}>
          {isLoading ? 'Stamping…' : persona ? 'Refresh Passport' : 'Reveal Passport'}
        </button>

        <button
          type="button"
          onClick={() => void fetchPassport(true)}
          disabled={isRerolling || !persona || (data?.limits?.rerollsRemaining ?? 0) <= 0}
        >
          {isRerolling ? 'Rerolling…' : 'Reroll Trait'}
        </button>

        <button type="button" onClick={() => void sharePassport()} disabled={!persona}>
          Cast Passport
        </button>

        <button type="button" onClick={() => void copyPassport()} disabled={!persona}>
          Copy Share Text
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
