import { NextResponse } from 'next/server';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTobyworldEchoTotals } from '@/lib/tobyworld-echo-totals';
import { getRiteEchoMultiplier } from '@/lib/tobyworld-milestones';

export const dynamic = 'force-dynamic';

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

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return RITES[hash % RITES.length];
}

function buildShareText(mark: string, streak: number, echoPower: number) {
  return [
    `I completed today’s Tobyworld Daily Rite.`,
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
      'fid, streak_count, best_streak, total_completions, last_completed_on, current_mark, username, display_name, pfp_url, current_echo_power, highest_echo_power',
    )
    .eq('fid', fid)
    .maybeSingle<DailyRiteRow>();

  if (error) {
    throw new Error(`Daily rite read failed: ${error.message}`);
  }

  return data;
}

export async function GET(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json({ error: auth.error }, auth.status);
    }

    const supabase = getSupabaseAdmin();
    const today = getTodayUtc();
    const profile = await getDailyProfile(auth.fid);
    const rite = pickRite(auth.fid, today);

    const { data: todayEvent, error: eventError } = await supabase
      .from('tobyworld_rite_events')
      .select(
        'id, fid, rite_date, rite_key, mark, share_text, completed_at, streak_count, total_completions, echo_power, multiplier_cap',
      )
      .eq('fid', auth.fid)
      .eq('rite_date', today)
      .maybeSingle<RiteEventRow>();

    if (eventError) {
      throw new Error(`Daily rite event read failed: ${eventError.message}`);
    }

    const { totalEchoes, totalRites } = await getTobyworldEchoTotals(supabase);
    const previewStreak =
      profile?.last_completed_on === today
        ? profile.streak_count ?? 1
        : profile?.last_completed_on === getYesterdayUtc()
          ? (profile.streak_count ?? 0) + 1
          : 1;

    const multiplier = getRiteEchoMultiplier(previewStreak, totalEchoes);

    return json({
      fid: auth.fid,
      today,
      rite,
      completedToday: Boolean(todayEvent),
      profile,
      todayEvent,
      totalEchoes,
      totalRites,
      multiplier,
    });
  } catch (error) {
    console.error('Daily rite GET failed:', error);

    return json({ error: getErrorMessage(error) }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json({ error: auth.error }, auth.status);
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

    const existingProfile = await getDailyProfile(auth.fid);

    const { data: existingEvent, error: existingEventError } = await supabase
      .from('tobyworld_rite_events')
      .select(
        'id, fid, rite_date, rite_key, mark, share_text, completed_at, streak_count, total_completions, echo_power, multiplier_cap',
      )
      .eq('fid', auth.fid)
      .eq('rite_date', today)
      .maybeSingle<RiteEventRow>();

    if (existingEventError) {
      throw new Error(`Daily rite event check failed: ${existingEventError.message}`);
    }

    if (existingEvent) {
      const updateProfile = {
        username: username ?? existingProfile?.username ?? null,
        display_name: displayName ?? existingProfile?.display_name ?? null,
        pfp_url: pfpUrl ?? existingProfile?.pfp_url ?? null,
        updated_at: new Date().toISOString(),
      };

      await supabase.from('tobyworld_daily_rites').update(updateProfile).eq('fid', auth.fid);

      const { totalEchoes, totalRites } = await getTobyworldEchoTotals(supabase);

      return json({
        fid: auth.fid,
        today,
        rite,
        completedToday: true,
        alreadyCompleted: true,
        event: existingEvent,
        profile: {
          ...existingProfile,
          ...updateProfile,
        },
        totalEchoes,
        totalRites,
        multiplier: getRiteEchoMultiplier(existingEvent.streak_count ?? 1, totalEchoes),
      });
    }

    const previousStreak = existingProfile?.streak_count ?? 0;
    const nextStreak =
      existingProfile?.last_completed_on === yesterday ? previousStreak + 1 : 1;

    const nextTotalCompletions = (existingProfile?.total_completions ?? 0) + 1;
    const nextBestStreak = Math.max(existingProfile?.best_streak ?? 0, nextStreak);
    const mark = getMark(nextStreak);

    const { totalEchoes: totalEchoesBefore } = await getTobyworldEchoTotals(supabase);
    const multiplier = getRiteEchoMultiplier(nextStreak, totalEchoesBefore);
    const echoPower = multiplier.echoPower;
    const shareText = buildShareText(mark, nextStreak, echoPower);

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
      highest_echo_power: Math.max(existingProfile?.highest_echo_power ?? 1, echoPower),
      updated_at: new Date().toISOString(),
    };

    const { data: savedProfile, error: profileError } = await supabase
      .from('tobyworld_daily_rites')
      .upsert(dailyProfilePayload, { onConflict: 'fid' })
      .select(
        'fid, streak_count, best_streak, total_completions, last_completed_on, current_mark, username, display_name, pfp_url, current_echo_power, highest_echo_power',
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
        'id, fid, rite_date, rite_key, mark, share_text, completed_at, streak_count, total_completions, echo_power, multiplier_cap',
      )
      .single<RiteEventRow>();

    if (eventError) {
      throw new Error(`Daily rite event save failed: ${eventError.message}`);
    }

    const { totalEchoes, totalRites } = await getTobyworldEchoTotals(supabase);

    return json({
      fid: auth.fid,
      today,
      rite,
      completedToday: true,
      alreadyCompleted: false,
      event,
      profile: savedProfile,
      shareText,
      totalEchoes,
      totalRites,
      multiplier,
    });
  } catch (error) {
    console.error('Daily rite POST failed:', error);

    return json({ error: getErrorMessage(error) }, 500);
  }
}
