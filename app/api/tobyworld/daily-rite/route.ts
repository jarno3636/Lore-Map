import { NextResponse } from 'next/server';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

type DailyRiteRow = {
  fid: number;
  streak_count: number;
  best_streak: number;
  total_completions: number;
  last_completed_on: string | null;
  current_mark: string;
  created_at?: string;
  updated_at?: string;
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
];

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
    .split('-')
    .join('')
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
  const { data, error } = await supabaseAdmin
    .from('tobyworld_daily_rites')
    .select('*')
    .eq('fid', fid)
    .maybeSingle<DailyRiteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function GET(request: Request) {
  const auth = await requireFarcasterFid(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const today = getTodayUtc();
  const rite = getRiteForDate(today);
  const profile = await getProfile(auth.fid);

  const completedToday = profile?.last_completed_on === today;
  const streak = profile?.streak_count ?? 0;
  const total = profile?.total_completions ?? 0;
  const mark = profile?.current_mark ?? getMark(streak, total);

  return NextResponse.json({
    fid: auth.fid,
    today,
    rite,
    completedToday,
    streak,
    bestStreak: profile?.best_streak ?? 0,
    totalCompletions: total,
    mark,
    shareText: completedToday
      ? buildShareText({
          rite,
          streak,
          mark,
        })
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireFarcasterFid(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

    return NextResponse.json({
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

  const { error: eventError } = await supabaseAdmin.from('tobyworld_rite_events').insert({
    fid: auth.fid,
    rite_date: today,
    rite_key: rite.key,
    mark: nextMark,
    share_text: shareText,
  });

  if (eventError && !eventError.message.toLowerCase().includes('duplicate')) {
    throw new Error(eventError.message);
  }

  const { error: profileError } = await supabaseAdmin.from('tobyworld_daily_rites').upsert(
    {
      fid: auth.fid,
      streak_count: nextStreak,
      best_streak: nextBestStreak,
      total_completions: nextTotal,
      last_completed_on: today,
      current_mark: nextMark,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'fid',
    },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  return NextResponse.json({
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
}
