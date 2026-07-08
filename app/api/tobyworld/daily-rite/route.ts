import { NextResponse } from 'next/server';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type DailyRiteRow = {
  fid: number;
  streak_count: number;
  best_streak: number;
  total_completions: number;
  last_completed_on: string | null;
  current_mark: string;
  username?: string | null;
  display_name?: string | null;
  pfp_url?: string | null;
};

type ClientProfile = {
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
};

const DAILY_RITES = [
  {
    key: 'still-water',
    icon: '△',
    title: 'Plant Stillness',
    instruction: 'Hold the red grain. No leap. No rush. Let the ripple sleep.',
    completedLine: '△ Stillness planted.',
  },
  {
    key: 'leaf-binding',
    icon: '🍃',
    title: 'Bind a Leaf',
    instruction: 'Add one quiet leaf to the pond-root.',
    completedLine: '🍃 A leaf was bound to the pond-root.',
  },
  {
    key: 'blue-return',
    icon: '🌀',
    title: 'Wake the Current',
    instruction: 'Send the blue current back toward Toby.',
    completedLine: '🌀 The blue current returned.',
  },
  {
    key: 'pond-visit',
    icon: '🐸',
    title: 'Visit the Pond',
    instruction: 'Return to the center. Toby waits.',
    completedLine: '🐸 The pond was visited.',
  },
  {
    key: 'fragment-fire',
    icon: '✦',
    title: 'Release a Fragment',
    instruction: 'Carry one line from the pond beyond the gate.',
    completedLine: '✦ A fragment left the pond.',
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

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;

  const cleaned = value.trim();

  if (!cleaned) return null;

  return cleaned.slice(0, maxLength);
}

async function readClientProfile(request: Request): Promise<ClientProfile> {
  try {
    const body = (await request.json()) as { profile?: ClientProfile };

    return {
      username: cleanText(body.profile?.username, 40),
      displayName: cleanText(body.profile?.displayName, 80),
      pfpUrl: cleanText(body.profile?.pfpUrl, 500),
    };
  } catch {
    return {};
  }
}

function getTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayUtc(today: string) {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getRiteForDate(date: string) {
  const seed = date
    .replaceAll('-', '')
    .split('')
    .reduce((sum, char) => sum + Number(char), 0);

  return DAILY_RITES[seed % DAILY_RITES.length];
}

function getMark(streak: number, total: number) {
  if (streak >= 30) return 'Gate Watcher';
  if (streak >= 14) return 'Bedrock Keeper';
  if (streak >= 7) return 'Rootbed Seeker';
  if (streak >= 5) return 'Current Walker';
  if (streak >= 3) return 'Leaf Binder';
  if (streak >= 1 || total > 0) return 'Still-Water Tender';

  return 'Pond Visitor';
}

function buildShareText({
  rite,
  streak,
  mark,
}: {
  rite: (typeof DAILY_RITES)[number];
  streak: number;
  mark: string;
}) {
  return [
    'I completed today’s Tobyworld Rite.',
    '',
    rite.completedLine,
    `Pond Streak: ${streak}`,
    `Mark: ${mark}`,
    '',
    'Tobyworld',
    '$Patience <> $toby <> $Taboshi',
  ].join('\n');
}

async function getProfile(fid: number) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_daily_rites')
    .select('*')
    .eq('fid', fid)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase profile read failed: ${error.message}`);
  }

  return data as DailyRiteRow | null;
}

export async function GET(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json({ error: auth.error }, auth.status);
    }

    const today = getTodayUtc();
    const rite = getRiteForDate(today);
    const profile = await getProfile(auth.fid);

    const completedToday = profile?.last_completed_on === today;
    const streak = profile?.streak_count ?? 0;
    const total = profile?.total_completions ?? 0;
    const mark = profile?.current_mark ?? getMark(streak, total);

    return json({
      fid: auth.fid,
      today,
      rite,
      completedToday,
      streak,
      bestStreak: profile?.best_streak ?? 0,
      totalCompletions: total,
      mark,
      shareText: completedToday ? buildShareText({ rite, streak, mark }) : null,
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

    const clientProfile = await readClientProfile(request);
    const supabase = getSupabaseAdmin();

    const today = getTodayUtc();
    const yesterday = getYesterdayUtc(today);
    const rite = getRiteForDate(today);

    const profile = await getProfile(auth.fid);

    if (profile?.last_completed_on === today) {
      const shareText = buildShareText({
        rite,
        streak: profile.streak_count,
        mark: profile.current_mark,
      });

      return json({
        fid: auth.fid,
        today,
        rite,
        completedToday: true,
        streak: profile.streak_count,
        bestStreak: profile.best_streak,
        totalCompletions: profile.total_completions,
        mark: profile.current_mark,
        shareText,
      });
    }

    const previousStreak = profile?.streak_count ?? 0;
    const previousTotal = profile?.total_completions ?? 0;
    const nextStreak = profile?.last_completed_on === yesterday ? previousStreak + 1 : 1;
    const nextTotal = previousTotal + 1;
    const nextBestStreak = Math.max(profile?.best_streak ?? 0, nextStreak);
    const nextMark = getMark(nextStreak, nextTotal);

    const shareText = buildShareText({
      rite,
      streak: nextStreak,
      mark: nextMark,
    });

    const displayName = clientProfile.displayName ?? profile?.display_name ?? null;
    const username = clientProfile.username ?? profile?.username ?? null;
    const pfpUrl = clientProfile.pfpUrl ?? profile?.pfp_url ?? null;

    const { error: eventError } = await supabase.from('tobyworld_rite_events').insert({
      fid: auth.fid,
      rite_date: today,
      rite_key: rite.key,
      mark: nextMark,
      share_text: shareText,
      username,
      display_name: displayName,
      pfp_url: pfpUrl,
      streak_count: nextStreak,
      total_completions: nextTotal,
    });

    if (eventError && eventError.code !== '23505') {
      throw new Error(`Supabase event insert failed: ${eventError.message}`);
    }

    const { error: profileError } = await supabase.from('tobyworld_daily_rites').upsert(
      {
        fid: auth.fid,
        streak_count: nextStreak,
        best_streak: nextBestStreak,
        total_completions: nextTotal,
        last_completed_on: today,
        current_mark: nextMark,
        username,
        display_name: displayName,
        pfp_url: pfpUrl,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'fid',
      },
    );

    if (profileError) {
      throw new Error(`Supabase profile upsert failed: ${profileError.message}`);
    }

    return json({
      fid: auth.fid,
      today,
      rite,
      completedToday: true,
      streak: nextStreak,
      bestStreak: nextBestStreak,
      totalCompletions: nextTotal,
      mark: nextMark,
      shareText,
    });
  } catch (error) {
    console.error('Daily rite POST failed:', error);

    return json({ error: getErrorMessage(error) }, 500);
  }
}
