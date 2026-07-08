import { createClient } from '@farcaster/quick-auth';

const quickAuthClient = createClient();

function getAppDomain() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://toby-atlas.vercel.app';
  return new URL(appUrl).hostname;
}

export async function requireFarcasterFid(request: Request) {
  const authorization = request.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return {
      ok: false as const,
      status: 401,
      error: 'Missing Farcaster auth token.',
    };
  }

  const token = authorization.replace('Bearer ', '').trim();

  try {
    const payload = await quickAuthClient.verifyJwt({
      token,
      domain: getAppDomain(),
    });

    const rawFid = payload.sub;
    const fid = Number(rawFid);

    if (!Number.isFinite(fid) || fid <= 0) {
      return {
        ok: false as const,
        status: 401,
        error: 'Invalid Farcaster user.',
      };
    }

    return {
      ok: true as const,
      fid,
    };
  } catch (error) {
    console.error('Farcaster Quick Auth failed:', error);

    return {
      ok: false as const,
      status: 401,
      error: error instanceof Error ? error.message : 'Unable to verify Farcaster auth token.',
    };
  }
}
