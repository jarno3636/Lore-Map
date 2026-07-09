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

function getDisplayName(snapshot?: PassportSnapshot, contextUser?: MiniAppUserContext | null) {
  if (contextUser?.displayName) return contextUser.displayName;
  if (snapshot?.displayName) return snapshot.displayName;
  if (contextUser?.username) return contextUser.username;
  if (snapshot?.username) return snapshot.username;
  if (snapshot?.fid) return `FID ${snapshot.fid}`;

  return 'Unstamped Frog';
}

function getHandle(snapshot?: PassportSnapshot, contextUser?: MiniAppUserContext | null) {
  const username = contextUser?.username || snapshot?.username;

  if (!username) return 'Tobyworld traveler';

  return `@${username}`;
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

function getPassportStateLabel({
  isLoading,
  isRerolling,
  data,
}: {
  isLoading: boolean;
  isRerolling: boolean;
  data: PassportResponse | null;
}) {
  if (isLoading) return 'Loading passport…';
  if (isRerolling) return 'Rerolling stamp…';
  if (data?.persona) {
    const rerolls = data.limits?.rerollsRemaining ?? 0;
    return `Loaded · ${rerolls} reroll${rerolls === 1 ? '' : 's'} left`;
  }

  return 'Waiting for pond stamp';
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
  const [contextUser, setContextUser] = useState<MiniAppUserContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [freshInkKey, setFreshInkKey] = useState(0);
  const [pfpFailed, setPfpFailed] = useState(false);

  const persona = data?.persona;
  const snapshot = data?.snapshot;
  const pfpUrl = !pfpFailed ? contextUser?.pfpUrl : undefined;

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

  const fetchPassport = useCallback(
    async (reroll = false) => {
      const authFetch = getBoundQuickAuthFetch();

      if (!authFetch) {
        setNotice('Open in Farcaster to reveal your Pond Passport.');
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
    [data?.persona?.title],
  );

  useEffect(() => {
    void loadMiniAppContext();
    void fetchPassport(false);
  }, [fetchPassport, loadMiniAppContext]);

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

      <article
        className={`pond-passport-card ${persona ? 'is-ready' : 'is-pending'}`}
        key={freshInkKey}
      >
        <div className="pond-passport-watermark" aria-hidden="true">
          POND
        </div>

        <div className="pond-passport-card-head">
          <div className="pond-passport-photo">
            {pfpUrl ? (
              <img
                src={pfpUrl}
                alt=""
                aria-hidden="true"
                onError={() => setPfpFailed(true)}
              />
            ) : (
              <span>🐸</span>
            )}
          </div>

          <div className="pond-passport-identity">
            <small>ISSUED TO</small>
            <h3>{getDisplayName(snapshot, contextUser)}</h3>
            <p>
              {getHandle(snapshot, contextUser)}
              {snapshot?.fid ? ` · FID ${snapshot.fid}` : ''}
            </p>
          </div>

          <div className="pond-passport-mini-stamp" aria-hidden="true">
            △🐸🍃
          </div>
        </div>

        <div className="pond-passport-title-block">
          <small>POND TITLE</small>
          <h2>{persona?.title ?? 'Awaiting pond stamp…'}</h2>
          <p>{persona?.characteristic ?? 'The frog at the desk is still checking the file.'}</p>
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
            <b>APPROVED</b>
          </div>
        </div>
      </article>

      <div className="pond-passport-actions">
        <button
          type="button"
          className="primary"
          onClick={() => void fetchPassport(true)}
          disabled={isRerolling || isLoading || !persona || (data?.limits?.rerollsRemaining ?? 0) <= 0}
        >
          {isRerolling ? 'Rerolling…' : 'Reroll Stamp'}
        </button>

        <button type="button" onClick={() => void sharePassport()} disabled={!persona}>
          Cast
        </button>

        <button type="button" onClick={() => void copyPassport()} disabled={!persona}>
          Copy
        </button>

        <button
          type="button"
          className="ghost"
          onClick={() => void fetchPassport(false)}
          disabled={isLoading || isRerolling}
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
