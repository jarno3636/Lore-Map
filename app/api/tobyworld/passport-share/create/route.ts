import { NextResponse } from 'next/server';
import {
  cleanPassportSharePayload,
  createPassportShare,
  getPassportShare,
} from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(
  data: unknown,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
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

    /*
     * Final route-level read check. Do not give the client a broken URL.
     */
    const storedPayload = await getPassportShare(id);

    if (!storedPayload) {
      throw new Error(
        'Passport share was created but could not be retrieved.',
      );
    }

    const origin = getPublicOrigin(request);

    const shareUrl =
      `${origin}/api/tobyworld/passport-share/${id}`;

    const imageUrl =
      `${origin}/api/tobyworld/passport-image/${id}`;

    const downloadUrl =
      `${imageUrl}?download=1`;

    return json({
      ok: true,
      id,
      shareUrl,
      imageUrl,
      downloadUrl,
    });
  } catch (error) {
    console.error('Passport share create failed:', error);

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create passport share.',
      },
      500,
    );
  }
}
