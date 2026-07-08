import { Errors, createClient } from '@farcaster/quick-auth';

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

    const fid = Number(payload.sub);

    if (!Number.isFinite(fid)) {
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
    if (error instanceof Errors.InvalidTokenError) {
      return {
        ok: false as const,
        status: 401,
        error: 'Invalid Farcaster auth token.',
      };
    }

    return {
      ok: false as const,
      status: 500,
      error: 'Unable to verify Farcaster auth token.',
    };
  }
}
