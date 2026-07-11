'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import type { OwnedPatch } from '@/lib/tobyworld-patches';
import { useMiniAppRuntime } from './MiniAppBoot';
import './daily-pond-rite.css';

type DailyRite = {
  key: string;
  icon: string;
  title: string;
  action?: string;
  instruction?: string;
  completedLine?: string;
};

type DailyRiteProfileRow = {
  fid?: number;
  streak_count?: number | null;
  best_streak?: number | null;
  total_completions?: number | null;
  last_completed_on?: string | null;
  current_mark?: string | null;
  username?: string | null;
  display_name?: string | null;
  pfp_url?: string | null;
  current_echo_power?: number | null;
  highest_echo_power?: number | null;
};

type DailyRiteSnapshot = {
  fid?: number;
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
  currentMark?: string;
  streakCount?: number;
  bestStreak?: number;
  totalCompletions?: number;
  lastCompletedOn?: string | null;
  currentEchoPower?: number;
  highestEchoPower?: number;
};

type DailyRiteEvent = {
  id?: string;
  fid?: number;
  rite_date?: string;
  rite_key?: string;
  mark?: string;
  share_text?: string;
  completed_at?: string;
  streak_count?: number | null;
  total_completions?: number | null;
  echo_power?: number | null;
  multiplier_cap?: number | null;
};

type RiteMultiplier = {
  echoPower?: number;
  cap?: number;
  multiplier?: number;
};

type DailyRiteApiResponse = {
  ok?: boolean;
  fid?: number;
  today?: string;
  rite?: DailyRite;
  completedToday?: boolean;
  alreadyCompleted?: boolean;
  profile?: DailyRiteProfileRow | null;
  snapshot?: DailyRiteSnapshot | null;
  todayEvent?: DailyRiteEvent | null;
  event?: DailyRiteEvent | null;
  streak?: number;
  streakCount?: number;
  bestStreak?: number;
  totalCompletions?: number;
  mark?: string;
  currentMark?: string;
  currentEchoPower?: number;
  highestEchoPower?: number;
  shareText?: string | null;
  totalEchoes?: number;
  totalRites?: number;
  multiplier?: RiteMultiplier;
  unlockedPatchIds?: string[];
  unlockedPatches?: OwnedPatch[];
  error?: string;
};

type DailyRiteView = {
  fid: number;
  today: string;
  rite: DailyRite;
  completedToday: boolean;
  streak: number;
  bestStreak: number;
  totalCompletions: number;
  mark: string;
  currentEchoPower: number;
  highestEchoPower: number;
  totalEchoes: number;
  totalRites: number;
  shareText: string | null;
};

type QuickAuthSdk = typeof sdk & {
  quickAuth?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
};

type RuntimeProfileFields = {
  displayName?: string | null;
  handle?: string | null;
  pfpUrl?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  user?: {
    displayName?: string | null;
    username?: string | null;
    handle?: string | null;
    pfpUrl?: string | null;
    imageUrl?: string | null;
    avatarUrl?: string | null;
  } | null;
  context?: {
    user?: {
      displayName?: string | null;
      username?: string | null;
      handle?: string | null;
      pfpUrl?: string | null;
      imageUrl?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
};

const SHARE_VERSION = 'daily-v5';

function getOrigin() {
  if (typeof window === 'undefined') {
    return 'https://toby-atlas.vercel.app';
  }

  return window.location.origin;
}

function getApiUrl(path: string) {
  return `${getOrigin()}${path}`;
}

function getBoundQuickAuthFetch() {
  const quickAuth = (sdk as QuickAuthSdk).quickAuth;
  if (!quickAuth?.fetch) return null;
  return quickAuth.fetch.bind(quickAuth);
}

function getShareUrl() {
  const params = new URLSearchParams({
    daily: 'pond-rite',
    share: SHARE_VERSION,
  });

  return `${getOrigin()}/?${params.toString()}`;
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

function getMiniAppProfile(runtime: RuntimeProfileFields) {
  const user = runtime.user ?? runtime.context?.user ?? null;

  const displayName =
    runtime.displayName ??
    user?.displayName ??
    runtime.handle ??
    user?.username ??
    user?.handle ??
    'Pond Visitor';

  const handle =
    runtime.handle ??
    user?.username ??
    user?.handle ??
    null;

  const pfpUrl =
    runtime.pfpUrl ??
    runtime.imageUrl ??
    runtime.avatarUrl ??
    user?.pfpUrl ??
    user?.imageUrl ??
    user?.avatarUrl ??
    null;

  return { displayName, handle, pfpUrl };
}

function getRiteInstruction(rite: DailyRite) {
  return (
    rite.instruction ??
    rite.action ??
    'Return to the pond and complete one quiet action.'
  );
}

function getRiteSymbolClass(rite: DailyRite) {
  if (rite.key === 'still-water') return 'is-red-triangle';
  if (rite.icon === '△') return 'is-red-triangle';
  return '';
}

function getNextMark(streak: number) {
  if (streak < 1) {
    return { label: 'Still-Water Tender', remaining: 1 - streak };
  }

  if (streak < 3) {
    return { label: 'Leaf Binder', remaining: 3 - streak };
  }

  if (streak < 5) {
    return { label: 'Current Walker', remaining: 5 - streak };
  }

  if (streak < 7) {
    return { label: 'Rootbed Seeker', remaining: 7 - streak };
  }

  if (streak < 14) {
    return { label: 'Bedrock Keeper', remaining: 14 - streak };
  }

  if (streak < 30) {
    return { label: 'Gate Watcher', remaining: 30 - streak };
  }

  return {
    label: 'The pond only deepens from here.',
    remaining: 0,
  };
}

function numberOrFallback(
  ...values: Array<number | null | undefined>
) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function stringOrFallback(
  fallback: string,
  ...values: Array<string | null | undefined>
) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function normalizeDailyRiteResponse(
  response: DailyRiteApiResponse,
): DailyRiteView {
  const profile = response.profile;
  const snapshot = response.snapshot;
  const event = response.todayEvent ?? response.event ?? null;

  const streak = numberOrFallback(
    response.streak,
    response.streakCount,
    snapshot?.streakCount,
    profile?.streak_count,
    event?.streak_count,
  );

  const bestStreak = numberOrFallback(
    response.bestStreak,
    snapshot?.bestStreak,
    profile?.best_streak,
    streak,
  );

  const totalCompletions = numberOrFallback(
    response.totalCompletions,
    snapshot?.totalCompletions,
    profile?.total_completions,
    event?.total_completions,
  );

  const currentEchoPower = numberOrFallback(
    response.currentEchoPower,
    snapshot?.currentEchoPower,
    profile?.current_echo_power,
    event?.echo_power,
    response.multiplier?.echoPower,
    1,
  );

  const highestEchoPower = numberOrFallback(
    response.highestEchoPower,
    snapshot?.highestEchoPower,
    profile?.highest_echo_power,
    currentEchoPower,
  );

  const mark = stringOrFallback(
    'Pond Visitor',
    response.mark,
    response.currentMark,
    snapshot?.currentMark,
    profile?.current_mark,
    event?.mark,
  );

  const shareText = response.shareText ?? event?.share_text ?? null;

  return {
    fid: response.fid ?? snapshot?.fid ?? profile?.fid ?? 0,
    today: response.today ?? 'Today',
    rite: response.rite ?? getPlaceholderRite(),
    completedToday: Boolean(
      response.completedToday || response.todayEvent || response.event,
    ),
    streak,
    bestStreak,
    totalCompletions,
    mark,
    currentEchoPower,
    highestEchoPower,
    totalEchoes: numberOrFallback(response.totalEchoes),
    totalRites: numberOrFallback(response.totalRites),
    shareText,
  };
}

async function readJsonResponse(response: Response) {
  try {
    const raw = (await response.json()) as DailyRiteApiResponse;

    return {
      raw,
      normalized: normalizeDailyRiteResponse(raw),
    };
  } catch {
    const raw: DailyRiteApiResponse = {
      ok: false,
      error: `The pond returned ${response.status} without valid JSON.`,
    };

    return {
      raw,
      normalized: normalizeDailyRiteResponse(raw),
    };
  }
}

async function safeCopyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function revealUnlockedPatches(patches: OwnedPatch[] | undefined) {
  if (!Array.isArray(patches) || patches.length === 0) return;

  window.dispatchEvent(
    new CustomEvent('tobyworld:patch-unlocked', {
      detail: patches,
    }),
  );
}

export function DailyPondRite() {
  const miniApp = useMiniAppRuntime();

  const [data, setData] = useState<DailyRiteView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const quickAuthFetch = getBoundQuickAuthFetch();

  const profile = useMemo(
    () => getMiniAppProfile(miniApp as RuntimeProfileFields),
    [miniApp],
  );

  const rite = data?.rite ?? getPlaceholderRite();
  const canPersist = Boolean(miniApp.isMiniApp && quickAuthFetch);
  const shareText = data?.shareText ?? null;
  const streak = data?.streak ?? 0;
  const nextMark = getNextMark(streak);

  const statusCopy = useMemo(() => {
    if (!miniApp.isMiniApp) {
      return 'Open this inside Farcaster to save streaks by FID.';
    }

    if (!quickAuthFetch) {
      return 'Farcaster is open, but Quick Auth is not ready yet.';
    }

    if (isLoading) return 'Reading the pond…';
    if (!data) return 'Reading today’s pond record…';

    if (data.completedToday) {
      return 'Today’s rite is complete. The pond remembers.';
    }

    return 'Complete today’s rite to extend your streak.';
  }, [data, isLoading, miniApp.isMiniApp, quickAuthFetch]);

  const fetchDailyRite = useCallback(async () => {
    const authFetch = getBoundQuickAuthFetch();

    if (!authFetch || !miniApp.isMiniApp) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      const response = await authFetch(
        getApiUrl('/api/tobyworld/daily-rite'),
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      const { raw, normalized } = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(raw.error || 'Unable to read today’s rite.');
      }

      setData(normalized);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'The pond could not read today’s rite.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [miniApp.isMiniApp]);

  useEffect(() => {
    void fetchDailyRite();
  }, [fetchDailyRite]);

  async function completeRite() {
    const authFetch = getBoundQuickAuthFetch();

    if (!authFetch || !miniApp.isMiniApp) {
      setNotice(
        'Open this inside Farcaster to complete the persistent daily rite.',
      );
      return;
    }

    setIsCompleting(true);
    setNotice(null);

    try {
      const response = await authFetch(
        getApiUrl('/api/tobyworld/daily-rite'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            profile: {
              username: profile.handle,
              displayName: profile.displayName,
              pfpUrl: profile.pfpUrl,
            },
          }),
        },
      );

      const { raw, normalized } = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(raw.error || 'Unable to complete today’s rite.');
      }

      setData(normalized);
      revealUnlockedPatches(raw.unlockedPatches);

      setNotice(
        raw.alreadyCompleted
          ? 'Today’s rite was already saved. The pond remembers.'
          : raw.unlockedPatches?.length
            ? `Rite complete. ${raw.unlockedPatches.length} new patch${
                raw.unlockedPatches.length === 1 ? '' : 'es'
              } stitched.`
            : 'Rite complete. Your pond streak was saved.',
      );

      window.navigator.vibrate?.(
        raw.unlockedPatches?.length
          ? [18, 35, 22, 45, 18]
          : [12, 28, 18],
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'The rite paused. Try again.',
      );
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
      const copied = await safeCopyText(`${shareText}\n\n${appUrl}`);

      setNotice(
        copied
          ? 'Cast text copied. Paste it into Farcaster.'
          : 'Unable to open the cast composer.',
      );
    }
  }

  function shareToX() {
    if (!shareText) {
      setNotice('Complete today’s rite first, then post it.');
      return;
    }

    const appUrl = getShareUrl();
    const intent = new URL('https://twitter.com/intent/tweet');

    intent.searchParams.set('text', `${shareText}\n\n${appUrl}`);

    window.open(
      intent.toString(),
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function copyRite() {
    if (!shareText) {
      setNotice('Complete today’s rite first, then copy it.');
      return;
    }

    const copied = await safeCopyText(
      `${shareText}\n\n${getShareUrl()}`,
    );

    setNotice(copied ? 'Rite copied.' : 'Unable to copy the rite.');
  }

  return (
    <section
      className={`daily-pond ${
        data?.completedToday ? 'is-complete' : 'needs-rite'
      }`}
      aria-label="Daily Tobyworld Pond Rite"
    >
      <div className="daily-pond-glow" aria-hidden="true" />
      <div
        className="daily-pond-ripple daily-pond-ripple-one"
        aria-hidden="true"
      />
      <div
        className="daily-pond-ripple daily-pond-ripple-two"
        aria-hidden="true"
      />

      <header className="daily-pond-header">
        <div>
          <p>DAILY POND RITE</p>
          <h2>One small ritual. One shared ripple.</h2>
          <span>{statusCopy}</span>
        </div>

        <div className="daily-pond-user-card">
          <div className="daily-pond-pfp">
            {profile.pfpUrl ? (
              <img src={profile.pfpUrl} alt="" aria-hidden="true" />
            ) : (
              <span>🐸</span>
            )}
          </div>

          <div>
            <strong>{profile.displayName}</strong>

            <small>
              {profile.handle
                ? `@${profile.handle}`
                : canPersist
                  ? data?.fid
                    ? `FID ${data.fid}`
                    : 'FID saved'
                  : 'Farcaster needed'}
            </small>
          </div>
        </div>
      </header>

      <div className="daily-pond-card">
        <div
          className={`daily-pond-symbol ${getRiteSymbolClass(rite)}`}
        >
          <span>{rite.icon}</span>
        </div>

        <div className="daily-pond-copy">
          <p>TODAY’S RITE</p>
          <h3>{rite.title}</h3>
          <span>{getRiteInstruction(rite)}</span>
        </div>
      </div>

      <div className="daily-pond-status-strip">
        <span className={data?.completedToday ? 'is-lit' : ''}>△</span>
        <i />
        <span className={streak >= 1 ? 'is-lit' : ''}>🐸</span>
        <i />
        <span className={streak >= 3 ? 'is-lit' : ''}>🍃</span>
        <i />
        <span className={streak >= 5 ? 'is-lit' : ''}>🌀</span>
        <i />
        <span className={streak >= 7 ? 'is-lit' : ''}>✦</span>
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

        <div>
          <strong>{data?.currentEchoPower ?? 1}x</strong>
          <span>power</span>
        </div>
      </div>

      <div className="daily-pond-mark-grid">
        <div className="daily-pond-mark">
          <span>CURRENT MARK</span>
          <strong>{data?.mark ?? 'Pond Visitor'}</strong>
        </div>

        <div className="daily-pond-next-mark">
          <span>NEXT MARK</span>
          <strong>{nextMark.label}</strong>

          <small>
            {nextMark.remaining > 0
              ? `${nextMark.remaining} more rite${
                  nextMark.remaining === 1 ? '' : 's'
                }`
              : 'Keep the pond alive.'}
          </small>
        </div>
      </div>

      <div className="daily-pond-actions">
        <button
          type="button"
          className="daily-pond-primary"
          onClick={() => void completeRite()}
          disabled={
            !canPersist ||
            isLoading ||
            isCompleting ||
            data?.completedToday
          }
        >
          {isCompleting
            ? 'Saving rite…'
            : data?.completedToday
              ? 'Rite Complete'
              : 'Complete Today’s Rite △'}
        </button>

        <button
          type="button"
          onClick={() => void shareToFarcaster()}
          disabled={!shareText}
        >
          Cast
        </button>

        <button
          type="button"
          onClick={shareToX}
          disabled={!shareText}
        >
          Post to X
        </button>

        <button
          type="button"
          onClick={() => void copyRite()}
          disabled={!shareText}
        >
          Copy
        </button>
      </div>

      {shareText && (
        <pre
          className="daily-pond-preview"
          aria-label="Daily rite share preview"
        >
          {shareText}
        </pre>
      )}

      <div className="daily-pond-attention">
        <span>{data?.completedToday ? '✓' : '!'}</span>

        <p>
          {data?.completedToday
            ? 'Your echo was saved. Visit the Community Shrine to see the pond answer back.'
            : canPersist
              ? 'Needs attention: today’s rite is still waiting.'
              : 'Needs attention: open inside Farcaster so the rite can save to your FID.'}
        </p>
      </div>

      {notice && (
        <p className="daily-pond-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
