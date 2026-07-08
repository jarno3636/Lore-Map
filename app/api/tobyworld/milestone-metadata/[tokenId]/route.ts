import { NextResponse } from 'next/server';
import { getMilestoneByTokenId } from '@/lib/tobyworld-milestones';

type RouteParams = {
  params: Promise<{
    tokenId: string;
  }>;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://toby-atlas.vercel.app').replace(/\/+$/, '');
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { tokenId } = await params;
  const numericTokenId = Number(tokenId);
  const milestone = getMilestoneByTokenId(numericTokenId);

  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  }

  const appUrl = getAppUrl();

  return NextResponse.json(
    {
      name: `Tobyworld Relic: ${milestone.title}`,
      description: milestone.description,
      image: `${appUrl}${milestone.imageSrc}`,
      external_url: `${appUrl}/milestones`,
      attributes: [
        {
          trait_type: 'World',
          value: 'Tobyworld',
        },
        {
          trait_type: 'Relic',
          value: milestone.title,
        },
        {
          trait_type: 'Milestone',
          value: milestone.threshold,
        },
        {
          trait_type: 'Symbol',
          value: milestone.symbol,
        },
        {
          trait_type: 'Accent',
          value: milestone.accent,
        },
      ],
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    },
  );
}
