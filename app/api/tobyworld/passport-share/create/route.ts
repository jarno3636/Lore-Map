import { NextResponse } from 'next/server';
import {
  cleanPassportSharePayload,
  createPassportShare,
} from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getOrigin(request: Request) {
  const url = new URL(request.url);
  return url.origin;
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const payload = cleanPassportSharePayload(body);
    const id = await createPassportShare(payload);
    const origin = getOrigin(request);

    return NextResponse.json(
      {
        ok: true,
        id,
        shareUrl: `${origin}/api/tobyworld/passport-share/${id}`,
        imageUrl: `${origin}/api/tobyworld/passport-image/${id}`,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('Passport share create failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to create passport share.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
