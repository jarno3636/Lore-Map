import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTobyworldEchoTotals } from '@/lib/tobyworld-echo-totals';
import {
  TOBYWORLD_MILESTONES,
  getCommunityMultiplierCap,
  getMilestoneProgress,
  getNextMilestone,
  getNextMultiplierCap,
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
    const { totalEchoes, totalRites } = await getTobyworldEchoTotals(supabase);
    const nextMilestone = getNextMilestone(totalEchoes);
    const multiplierCap = getCommunityMultiplierCap(totalEchoes);
    const nextCap = getNextMultiplierCap(totalEchoes);

    const milestones = TOBYWORLD_MILESTONES.map((milestone) => {
      const progress = getMilestoneProgress(totalEchoes, milestone.threshold);

      return {
        ...milestone,
        progress,
      };
    });

    return json({
      totalEchoes,
      totalRites,
      nextMilestone,
      milestones,
      multiplier: {
        cap: multiplierCap,
        nextCapAt: nextCap.nextCapAt,
        nextCap: nextCap.nextCap,
      },
    });
  } catch (error) {
    console.error('Milestones API failed:', error);

    return json(
      {
        error: getErrorMessage(error),
        totalEchoes: 0,
        totalRites: 0,
        nextMilestone: TOBYWORLD_MILESTONES[0],
        milestones: TOBYWORLD_MILESTONES.map((milestone) => ({
          ...milestone,
          progress: getMilestoneProgress(0, milestone.threshold),
        })),
        multiplier: {
          cap: 3,
          nextCapAt: 1017,
          nextCap: 6,
        },
      },
      500,
    );
  }
}
