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

    const events = ((recentResult.data ?? []) as ShrineEventRow[]).map((event) => {
      const rite = RITE_DETAILS[event.rite_key] ?? {
        icon: '✦',
        title: 'Unknown Rite',
      };

      return {
        id: event.id,
        fid: event.fid,
        username: event.username,
        displayName: event.display_name ?? event.username ?? `FID ${event.fid}`,
        pfpUrl: event.pfp_url,
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
    });
  } catch (error) {
    console.error('Community shrine failed:', error);

    return json({ error: getErrorMessage(error), events: [] }, 500);
  }
}
