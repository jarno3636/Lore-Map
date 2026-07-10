import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local')
  ) {
    return true;
  }

  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get('url')?.trim();

    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing image URL.' }, { status: 400 });
    }

    const imageUrl = new URL(rawUrl);

    if (imageUrl.protocol !== 'https:' || isBlockedHost(imageUrl.hostname)) {
      return NextResponse.json({ error: 'Unsupported image URL.' }, { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
        'User-Agent': 'Tobyworld-Atlas-Passport/1.0',
      },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Image request failed with ${response.status}.` },
        { status: 502 },
      );
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Remote URL did not return an image.' }, { status: 415 });
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Remote image is too large.' }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Length': String(buffer.byteLength),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Passport photo proxy failed:', error);

    return NextResponse.json(
      { error: 'Unable to load passport photo.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
