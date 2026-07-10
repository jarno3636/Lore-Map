import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MilestoneMetadataDefinition = {
  name: string;
  description: string;
  threshold: number;
  symbol: string;
  accent: string;
  imagePath: string;
};

const MILESTONE_METADATA: Record<number, MilestoneMetadataDefinition> = {
  1: {
    name: 'Still-Water Echo',
    description:
      'The first Tobyworld community relic, awakened when the pond reaches 1,017 weighted echoes.',
    threshold: 1017,
    symbol: '△',
    accent: 'Red',
    imagePath: '/images/milestones/still-water-echo.png',
  },

  2: {
    name: 'Sevenfold Pond',
    description:
      'A Tobyworld community relic awakened when the pond reaches 7,777 weighted echoes.',
    threshold: 7777,
    symbol: '🐸',
    accent: 'Blue',
    imagePath: '/images/milestones/sevenfold-pond.png',
  },

  3: {
    name: 'Taboshi Bloom',
    description:
      'A Tobyworld community relic awakened when the pond reaches 185,964 weighted echoes.',
    threshold: 185964,
    symbol: '🍃',
    accent: 'Green',
    imagePath: '/images/milestones/taboshi-bloom.png',
  },

  4: {
    name: 'The Endless Gate',
    description:
      'The final Tobyworld community relic, awakened when the pond reaches 7,777,777 weighted echoes.',
    threshold: 7777777,
    symbol: '✦',
    accent: 'Gold',
    imagePath: '/images/milestones/endless-gate.png',
  },
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control':
        status === 200
          ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
          : 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function getPublicOrigin(request: Request) {
  const configuredOrigin = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ''
  )
    .trim()
    .replace(/\/+$/, '');

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();

  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();

  if (forwardedHost) {
    return `${forwardedProtocol || 'https'}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      tokenId: string;
    }>;
  },
) {
  try {
    const { tokenId } = await context.params;

    const normalizedTokenId = tokenId.trim();
    const numericTokenId = Number(normalizedTokenId);

    if (
      !Number.isSafeInteger(numericTokenId) ||
      numericTokenId < 1 ||
      numericTokenId > 4
    ) {
      return json(
        {
          error: 'Milestone not found.',
          tokenId: normalizedTokenId,
          supportedTokenIds: [1, 2, 3, 4],
        },
        404,
      );
    }

    const milestone = MILESTONE_METADATA[numericTokenId];

    if (!milestone) {
      return json(
        {
          error: 'Milestone not found.',
          tokenId: normalizedTokenId,
          supportedTokenIds: [1, 2, 3, 4],
        },
        404,
      );
    }

    const origin = getPublicOrigin(request);
    const imageUrl = `${origin}${milestone.imagePath}`;
    const externalUrl = `${origin}/milestones#milestone-${numericTokenId}`;

    return json({
      name: `Tobyworld Relic ${numericTokenId}: ${milestone.name}`,

      description: milestone.description,

      image: imageUrl,
      image_url: imageUrl,

      external_url: externalUrl,

      attributes: [
        {
          trait_type: 'Relic',
          value: milestone.name,
        },
        {
          trait_type: 'Milestone',
          value: numericTokenId,
          display_type: 'number',
        },
        {
          trait_type: 'Echo Threshold',
          value: milestone.threshold,
          display_type: 'number',
        },
        {
          trait_type: 'Symbol',
          value: milestone.symbol,
        },
        {
          trait_type: 'Accent',
          value: milestone.accent,
        },
        {
          trait_type: 'Network',
          value: 'Base',
        },
        {
          trait_type: 'Collection',
          value: 'Tobyworld Milestone Relics',
        },
      ],
    });
  } catch (error) {
    console.error('Milestone metadata route failed:', error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load milestone metadata.',
      },
      500,
    );
  }
}
