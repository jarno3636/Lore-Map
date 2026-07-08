import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ShrineEventRow = {
  id: string;
  fid: number;
  rite_date: string;
  rite_key: string;
  mark: string;
  share_text: string;
  completed_at: string;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
  streak_count: number | null;
  total_completions: number | null;
};

type DailyProfileRow = {
  fid: number;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
};

type NeynarUser = {
  fid: number;
  username?: string | null;
  display_name?: string | null;
  pfp_url?: string | null;
};

type NeynarBulkResponse = {
  users?: NeynarUser[];
};

const RITE_DETAILS: Record<string, { icon: string; title: string }> = {
  'still-water': {
    icon: '△',
    title: 'Plant Stillness',
  },
  'leaf-binding': {
    icon: '🍃',
    title: 'Bind a Leaf',
  },
  'blue-return': {
    icon: '🌀',
    title: 'Wake the Current',
  },
  'pond-visit': {
    icon: '🐸',
    title: 'Visit the Pond',
  },
  'fragment-fire': {
    icon: '✦',
    title: 'Release a Fragment',
  },
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function getTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown server error.';
}

function cleanText(value: string | null | undefined) {
  const cleaned = value?.trim();

  if (!cleaned) return null;
  if (/^fid\s+\d+$/i.test(cleaned)) return null;

  return cleaned;
}

async function fetchFarcasterProfilesByFid(fids: number[]) {
  const apiKey = process.env.NEYNAR_API_KEY?.trim();
  const profileMap = new Map<number, NeynarUser>();

  if (!apiKey || fids.length === 0) {
    return profileMap;
  }

  /*
    Neynar accepts a comma-separated list of FIDs.
    Docs currently cap this endpoint at 100 FIDs per request.
  */
  const uniqueFids = Array.from(new Set(fids)).slice(0, 100);

  const url = new URL('https://api.neynar.com/v2/farcaster/user/bulk/');
  url.searchParams.set('fids', uniqueFids.join(','));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn('Neynar profile hydration failed:', response.status, await response.text());
    return profileMap;
  }

  const data = (await response.json()) as NeynarBulkResponse;

  for (const user of data.users ?? []) {
    if (typeof user.fid === 'number') {
      profileMap.set(user.fid, user);
    }
  }

  return profileMap;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const today = getTodayUtc();

    const recentQuery = supabase
      .from('tobyworld_rite_events')
      .select(
        'id, fid, rite_date, rite_key, mark, share_text, completed_at, username, display_name, pfp_url, streak_count, total_completions',
      )
      .order('completed_at', { ascending: false })
      .limit(24);

    const totalQuery = supabase
      .from('tobyworld_rite_events')
      .select('id', { count: 'exact', head: true });

    const todayQuery = supabase
      .from('tobyworld_rite_events')
      .select('id', { count: 'exact', head: true })
      .eq('rite_date', today);

    const [recentResult, totalResult, todayResult] = await Promise.all([
      recentQuery,
      totalQuery,
      todayQuery,
    ]);

    if (recentResult.error) {
      throw new Error(`Shrine read failed: ${recentResult.error.message}`);
    }

    if (totalResult.error) {
      throw new Error(`Shrine count failed: ${totalResult.error.message}`);
    }

    if (todayResult.error) {
      throw new Error(`Shrine today count failed: ${todayResult.error.message}`);
    }

    const rows = (recentResult.data ?? []) as ShrineEventRow[];
    const fids = Array.from(new Set(rows.map((row) => row.fid)));

    const [savedProfileResult, farcasterProfileMap] = await Promise.all([
      fids.length > 0
        ? supabase
            .from('tobyworld_daily_rites')
            .select('fid, username, display_name, pfp_url')
            .in('fid', fids)
        : Promise.resolve({ data: [], error: null }),
      fetchFarcasterProfilesByFid(fids),
    ]);

    if (savedProfileResult.error) {
      throw new Error(`Shrine profile read failed: ${savedProfileResult.error.message}`);
    }

    const savedProfileMap = new Map<number, DailyProfileRow>();

    ((savedProfileResult.data ?? []) as DailyProfileRow[]).forEach((profile) => {
      savedProfileMap.set(profile.fid, profile);
    });

    const events = rows.map((event) => {
      const rite = RITE_DETAILS[event.rite_key] ?? {
        icon: '✦',
        title: 'Unknown Rite',
      };

      const savedProfile = savedProfileMap.get(event.fid);
      const farcasterProfile = farcasterProfileMap.get(event.fid);

      const username =
        cleanText(farcasterProfile?.username) ??
        cleanText(event.username) ??
        cleanText(savedProfile?.username);

      const displayName =
        cleanText(farcasterProfile?.display_name) ??
        cleanText(event.display_name) ??
        cleanText(savedProfile?.display_name) ??
        username ??
        'Pond Visitor';

      const pfpUrl =
        cleanText(farcasterProfile?.pfp_url) ??
        cleanText(event.pfp_url) ??
        cleanText(savedProfile?.pfp_url);

      return {
        id: event.id,
        fid: event.fid,
        username,
        displayName,
        pfpUrl,
        riteDate: event.rite_date,
        riteKey: event.rite_key,
        riteTitle: rite.title,
        riteIcon: rite.icon,
        mark: event.mark,
        streak: event.streak_count ?? 1,
        totalCompletions: event.total_completions ?? 1,
        completedAt: event.completed_at,
      };
    });

    return json({
      today,
      totalEchoes: totalResult.count ?? 0,
      todayEchoes: todayResult.count ?? 0,
      events,
      profileHydration: process.env.NEYNAR_API_KEY ? 'neynar' : 'saved-only',
    });
  } catch (error) {
    console.error('Community shrine failed:', error);

    return json({ error: getErrorMessage(error), events: [] }, 500);
  }
}
