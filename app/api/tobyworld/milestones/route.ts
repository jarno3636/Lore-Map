import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  TOBYWORLD_MILESTONES,
  getMilestoneProgress,
  getNextMilestone,
} from '@/lib/tobyworld-milestones';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { count, error } = await supabase
      .from('tobyworld_rite_events')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Milestone count failed: ${error.message}`);
    }

    const totalEchoes = count ?? 0;
    const nextMilestone = getNextMilestone(totalEchoes);

    const milestones = TOBYWORLD_MILESTONES.map((milestone) => {
      const progress = getMilestoneProgress(totalEchoes, milestone.threshold);

      return {
        ...milestone,
        progress,
      };
    });

    return json({
      totalEchoes,
      nextMilestone,
      milestones,
    });
  } catch (error) {
    console.error('Milestones API failed:', error);

    return json(
      {
        error: getErrorMessage(error),
        totalEchoes: 0,
        nextMilestone: TOBYWORLD_MILESTONES[0],
        milestones: TOBYWORLD_MILESTONES.map((milestone) => ({
          ...milestone,
          progress: getMilestoneProgress(0, milestone.threshold),
        })),
      },
      500,
    );
  }
}
