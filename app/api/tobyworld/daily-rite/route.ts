import { NextResponse } from 'next/server';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTobyworldEchoTotals } from '@/lib/tobyworld-echo-totals';
import { getRiteEchoMultiplier } from '@/lib/tobyworld-milestones';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProfilePayload = {
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
};

type DailyRiteBody = {
  profile?: ProfilePayload;
};

type DailyRiteRow = {
  fid: number;
  streak_count: number | null;
  best_streak: number | null;
  total_completions: number | null;
  last_completed_on: string | null;
  current_mark: string | null;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
  current_echo_power: number | null;
  highest_echo_power: number | null;
};

type RiteEventRow = {
  id: string;
  fid: number;
  rite_date: string;
  rite_key: string;
  mark: string;
  share_text: string;
  completed_at: string;
  streak_count: number | null;
  total_completions: number | null;
  echo_power: number | null;
  multiplier_cap: number | null;
};

type RiteProfileSnapshot = {
  fid: number;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
  currentMark: string;
  streakCount: number;
  bestStreak: number;
  totalCompletions: number;
  lastCompletedOn: string | null;
  currentEchoPower: number;
  highestEchoPower: number;
};

const RITES = [
  {
    key: 'still-water',
    icon: '△',
    title: 'Plant Stillness',
    action: 'Hold the pond in stillness. Let the first ripple pass without chasing it.',
  },
  {
    key: 'leaf-binding',
    icon: '🍃',
    title: 'Bind a Leaf',
    action: 'Choose one small thing to grow today. No rush. Just root.',
  },
  {
    key: 'blue-return',
    icon: '🌀',
    title: 'Wake the Current',
    action: 'Return to something you left unfinished. Move it one quiet step forward.',
  },
  {
    key: 'pond-visit',
    icon: '🐸',
    title: 'Visit the Pond',
    action: 'Come back, breathe, and remember: stillness is also movement.',
  },
  {
    key: 'fragment-fire',
    icon: '✦',
    title: 'Release a Fragment',
    action: 'Share one useful piece of lore, patience, or belief back into the world.',
  },
] as const;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return 'Unknown server error.';
}

function getTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayUtc() {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
}

function cleanText(value: string | null | undefined, maxLength = 120) {
  const cleaned = value?.trim();

  if (!cleaned) return null;

  return cleaned.slice(0, maxLength);
}

function getMark(streak: number) {
  if (streak >= 30) return 'Gate Watcher';
  if (streak >= 14) return 'Bedrock Keeper';
  if (streak >= 7) return 'Rootbed Seeker';
  if (streak >= 5) return 'Current Walker';
  if (streak >= 3) return 'Leaf Binder';

  return 'Still-Water Tender';
}

function pickRite(fid: number, today: string) {
  const seed = `${fid}:${today}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return RITES[hash % RITES.length];
}

function buildShareText(mark: string, streak: number, echoPower: number) {
  return [
    'I completed today’s Tobyworld Daily Rite.',
    '',
    `Mark: ${mark}`,
    `Streak: ${streak}`,
    `Echo power: ${echoPower}x`,
    '',
    'We move not by leaps. We move by stillness.',
    '',
    '$Patience <> $toby <> $Taboshi',
  ].join('\n');
}

function normalizeProfile(
  profile: DailyRiteRow | null | undefined,
  fid: number,
): RiteProfileSnapshot {
  return {
    fid,
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    pfpUrl: profile?.pfp_url ?? null,
    currentMark: profile?.current_mark ?? 'Pond Visitor',
    streakCount: profile?.streak_count ?? 0,
    bestStreak: profile?.best_streak ?? 0,
    totalCompletions: profile?.total_completions ?? 0,
    lastCompletedOn: profile?.last_completed_on ?? null,
    currentEchoPower: profile?.current_echo_power ?? 1,
    highestEchoPower: profile?.highest_echo_power ?? 1,
  };
}

function buildResponseProfile(
  profile: DailyRiteRow | null | undefined,
  fid: number,
) {
  const snapshot = normalizeProfile(profile, fid);

  return {
    profile: profile ?? null,
    snapshot,

    streakCount: snapshot.streakCount,
    bestStreak: snapshot.bestStreak,
    totalCompletions: snapshot.totalCompletions,
    currentMark: snapshot.currentMark,
    currentEchoPower: snapshot.currentEchoPower,
    highestEchoPower: snapshot.highestEchoPower,
    lastCompletedOn: snapshot.lastCompletedOn,
  };
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as DailyRiteBody;
  } catch {
    return {};
  }
}

async function getDailyProfile(fid: number) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_daily_rites')
    .select(
      [
        'fid',
        'streak_count',
        'best_streak',
        'total_completions',
        'last_completed_on',
        'current_mark',
        'username',
        'display_name',
        'pfp_url',
        'current_echo_power',
        'highest_echo_power',
      ].join(', '),
    )
    .eq('fid', fid)
    .maybeSingle<DailyRiteRow>();

  if (error) {
    throw new Error(`Daily rite read failed: ${error.message}`);
  }

  return data;
}

async function getTodayEvent(fid: number, today: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_rite_events')
    .select(
      [
        'id',
        'fid',
        'rite_date',
        'rite_key',
        'mark',
        'share_text',
        'completed_at',
        'streak_count',
        'total_completions',
        'echo_power',
        'multiplier_cap',
      ].join(', '),
    )
    .eq('fid', fid)
    .eq('rite_date', today)
    .maybeSingle<RiteEventRow>();

  if (error) {
    throw new Error(`Daily rite event read failed: ${error.message}`);
  }

  return data;
}

export async function GET(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json(
        {
          ok: false,
          error: auth.error,
        },
        auth.status,
      );
    }

    const supabase = getSupabaseAdmin();
    const today = getTodayUtc();
    const yesterday = getYesterdayUtc();

    const [profile, todayEvent, totals] = await Promise.all([
      getDailyProfile(auth.fid),
      getTodayEvent(auth.fid, today),
      getTobyworldEchoTotals(supabase),
    ]);

    const rite = pickRite(auth.fid, today);

    const previewStreak =
      profile?.last_completed_on === today
        ? profile.streak_count ?? 1
        : profile?.last_completed_on === yesterday
          ? (profile.streak_count ?? 0) + 1
          : 1;

    const multiplier = getRiteEchoMultiplier(
      previewStreak,
      totals.totalEchoes,
    );

    return json({
      ok: true,
      fid: auth.fid,
      today,
      rite,
      completedToday: Boolean(todayEvent),
      todayEvent,
      event: todayEvent,
      totalEchoes: totals.totalEchoes,
      totalRites: totals.totalRites,
      multiplier,
      ...buildResponseProfile(profile, auth.fid),
    });
  } catch (error) {
    console.error('Daily rite GET failed:', error);

    return json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json(
        {
          ok: false,
          error: auth.error,
        },
        auth.status,
      );
    }

    const body = await readBody(request);
    const profilePayload = body.profile ?? {};

    const username = cleanText(profilePayload.username, 80);
    const displayName = cleanText(profilePayload.displayName, 120);
    const pfpUrl = cleanText(profilePayload.pfpUrl, 500);

    const supabase = getSupabaseAdmin();
    const today = getTodayUtc();
    const yesterday = getYesterdayUtc();
    const rite = pickRite(auth.fid, today);

    const [existingProfile, existingEvent] = await Promise.all([
      getDailyProfile(auth.fid),
      getTodayEvent(auth.fid, today),
    ]);

    if (existingEvent) {
      const updateProfile = {
        username: username ?? existingProfile?.username ?? null,
        display_name: displayName ?? existingProfile?.display_name ?? null,
        pfp_url: pfpUrl ?? existingProfile?.pfp_url ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: refreshedProfile, error: updateError } = await supabase
        .from('tobyworld_daily_rites')
        .update(updateProfile)
        .eq('fid', auth.fid)
        .select(
          [
            'fid',
            'streak_count',
            'best_streak',
            'total_completions',
            'last_completed_on',
            'current_mark',
            'username',
            'display_name',
            'pfp_url',
            'current_echo_power',
            'highest_echo_power',
          ].join(', '),
        )
        .single<DailyRiteRow>();

      if (updateError) {
        throw new Error(`Daily rite profile update failed: ${updateError.message}`);
      }

      const totals = await getTobyworldEchoTotals(supabase);
      const eventEchoPower =
        existingEvent.echo_power ??
        refreshedProfile.current_echo_power ??
        1;

      return json({
        ok: true,
        fid: auth.fid,
        today,
        rite,
        completedToday: true,
        alreadyCompleted: true,
        event: existingEvent,
        todayEvent: existingEvent,
        shareText: existingEvent.share_text,
        totalEchoes: totals.totalEchoes,
        totalRites: totals.totalRites,
        multiplier: getRiteEchoMultiplier(
          existingEvent.streak_count ??
            refreshedProfile.streak_count ??
            1,
          totals.totalEchoes,
        ),
        echoPower: eventEchoPower,
        ...buildResponseProfile(refreshedProfile, auth.fid),
      });
    }

    const previousStreak = existingProfile?.streak_count ?? 0;

    const nextStreak =
      existingProfile?.last_completed_on === yesterday
        ? previousStreak + 1
        : 1;

    const nextTotalCompletions =
      (existingProfile?.total_completions ?? 0) + 1;

    const nextBestStreak = Math.max(
      existingProfile?.best_streak ?? 0,
      nextStreak,
    );

    const mark = getMark(nextStreak);

    const totalsBefore = await getTobyworldEchoTotals(supabase);

    const multiplier = getRiteEchoMultiplier(
      nextStreak,
      totalsBefore.totalEchoes,
    );

    const echoPower = multiplier.echoPower;
    const shareText = buildShareText(mark, nextStreak, echoPower);
    const updatedAt = new Date().toISOString();

    const dailyProfilePayload = {
      fid: auth.fid,
      streak_count: nextStreak,
      best_streak: nextBestStreak,
      total_completions: nextTotalCompletions,
      last_completed_on: today,
      current_mark: mark,
      username: username ?? existingProfile?.username ?? null,
      display_name: displayName ?? existingProfile?.display_name ?? null,
      pfp_url: pfpUrl ?? existingProfile?.pfp_url ?? null,
      current_echo_power: echoPower,
      highest_echo_power: Math.max(
        existingProfile?.highest_echo_power ?? 1,
        echoPower,
      ),
      updated_at: updatedAt,
    };

    const { data: savedProfile, error: profileError } = await supabase
      .from('tobyworld_daily_rites')
      .upsert(dailyProfilePayload, {
        onConflict: 'fid',
      })
      .select(
        [
          'fid',
          'streak_count',
          'best_streak',
          'total_completions',
          'last_completed_on',
          'current_mark',
          'username',
          'display_name',
          'pfp_url',
          'current_echo_power',
          'highest_echo_power',
        ].join(', '),
      )
      .single<DailyRiteRow>();

    if (profileError) {
      throw new Error(`Daily rite profile save failed: ${profileError.message}`);
    }

    const { data: event, error: eventError } = await supabase
      .from('tobyworld_rite_events')
      .insert({
        fid: auth.fid,
        rite_date: today,
        rite_key: rite.key,
        mark,
        share_text: shareText,
        username: dailyProfilePayload.username,
        display_name: dailyProfilePayload.display_name,
        pfp_url: dailyProfilePayload.pfp_url,
        streak_count: nextStreak,
        total_completions: nextTotalCompletions,
        echo_power: echoPower,
        multiplier_cap: multiplier.cap,
      })
      .select(
        [
          'id',
          'fid',
          'rite_date',
          'rite_key',
          'mark',
          'share_text',
          'completed_at',
          'streak_count',
          'total_completions',
          'echo_power',
          'multiplier_cap',
        ].join(', '),
      )
      .single<RiteEventRow>();

    if (eventError) {
      /*
       * The profile was already saved. If another request created today's event
       * between the checks, return the authoritative database state rather than
       * showing zeroes or failing the UI.
       */
      if (eventError.code === '23505') {
        const [authoritativeProfile, authoritativeEvent, totals] =
          await Promise.all([
            getDailyProfile(auth.fid),
            getTodayEvent(auth.fid, today),
            getTobyworldEchoTotals(supabase),
          ]);

        if (!authoritativeEvent) {
          throw new Error(
            `Daily rite event save failed: ${eventError.message}`,
          );
        }

        return json({
          ok: true,
          fid: auth.fid,
          today,
          rite,
          completedToday: true,
          alreadyCompleted: true,
          event: authoritativeEvent,
          todayEvent: authoritativeEvent,
          shareText: authoritativeEvent.share_text,
          totalEchoes: totals.totalEchoes,
          totalRites: totals.totalRites,
          multiplier: getRiteEchoMultiplier(
            authoritativeProfile?.streak_count ?? nextStreak,
            totals.totalEchoes,
          ),
          echoPower:
            authoritativeEvent.echo_power ??
            authoritativeProfile?.current_echo_power ??
            echoPower,
          ...buildResponseProfile(authoritativeProfile, auth.fid),
        });
      }

      throw new Error(`Daily rite event save failed: ${eventError.message}`);
    }

    const totals = await getTobyworldEchoTotals(supabase);

    return json({
      ok: true,
      fid: auth.fid,
      today,
      rite,
      completedToday: true,
      alreadyCompleted: false,
      event,
      todayEvent: event,
      shareText,
      totalEchoes: totals.totalEchoes,
      totalRites: totals.totalRites,
      multiplier,
      echoPower,
      ...buildResponseProfile(savedProfile, auth.fid),
    });
  } catch (error) {
    console.error('Daily rite POST failed:', error);

    return json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      500,
    );
  }
}
