'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import type { OwnedPatch } from '@/lib/tobyworld-patches';

type QuickAuthSdk = typeof sdk & {
  quickAuth?: {
    fetch?: (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
  };
};

type PatchEventResponse = {
  ok?: boolean;
  error?: string;
  unlockedPatches?: OwnedPatch[];
};

function getQuickAuthFetch() {
  const quickAuth = (sdk as QuickAuthSdk).quickAuth;

  return quickAuth?.fetch
    ? quickAuth.fetch.bind(quickAuth)
    : null;
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getShareIdentity(shareUrl: string) {
  try {
    const parsed = new URL(shareUrl);

    const pathIdentity = parsed.pathname
      .split('/')
      .filter(Boolean)
      .slice(-2)
      .join(':');

    return pathIdentity || hashText(shareUrl);
  } catch {
    return hashText(shareUrl);
  }
}

export function revealPassportPatchUnlocks(
  patches: OwnedPatch[] | undefined,
) {
  if (
    typeof window === 'undefined' ||
    !Array.isArray(patches) ||
    patches.length === 0
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('tobyworld:patch-unlocked', {
      detail: patches,
    }),
  );
}

export async function recordPassportSharePatch(
  shareUrl: string,
) {
  const authFetch = getQuickAuthFetch();

  if (!authFetch) {
    return {
      ok: false,
      unlockedPatches: [] as OwnedPatch[],
    };
  }

  const shareIdentity = getShareIdentity(shareUrl);

  try {
    const response = await authFetch(
      '/api/tobyworld/traveler-pack',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'record_event',
          event: {
            eventKey: 'passport_shared',
            value: 1,

            // Short and stable. Reusing the same generated share
            // will not count more than once.
            uniqueKey: shareIdentity,

            // Guaranteed to remain well under the 180-character limit.
            idempotencyKey: `passport-share:${shareIdentity}`,

            context: {
              shareIdentity,
              shareUrl,
              path: window.location.pathname,
            },

            occurredAt: new Date().toISOString(),
          },
        }),
      },
    );

    const result =
      (await response.json()) as PatchEventResponse;

    if (!response.ok || !result.ok) {
      console.error(
        'Passport share patch event rejected:',
        result.error ?? response.statusText,
      );

      return {
        ok: false,
        unlockedPatches: [] as OwnedPatch[],
      };
    }

    revealPassportPatchUnlocks(
      result.unlockedPatches,
    );

    return {
      ok: true,
      unlockedPatches:
        result.unlockedPatches ?? [],
    };
  } catch (error) {
    console.error(
      'Passport share patch event failed:',
      error,
    );

    return {
      ok: false,
      unlockedPatches: [] as OwnedPatch[],
    };
  }
}
