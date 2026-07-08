'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export type MiniAppRuntime = {
  isMiniApp: boolean;
  supportsComposeCast: boolean;
  displayName?: string;
  handle?: string;
  fid?: number;
};

const EMPTY_RUNTIME: MiniAppRuntime = {
  isMiniApp: false,
  supportsComposeCast: false,
};

/**
 * Detects Farcaster only on the client, exposes safe display context for UI,
 * and hides the host splash screen once the app is ready.
 *
 * The returned profile display context must never be used as authentication.
 * Use Quick Auth on the server for authenticated requests.
 */
export function useMiniAppRuntime(): MiniAppRuntime {
  const [runtime, setRuntime] = useState<MiniAppRuntime>(EMPTY_RUNTIME);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (cancelled || !isMiniApp) return;

        const context = sdk.context;
        const capabilities = await sdk.getCapabilities();

        await sdk.actions.ready();

        if (cancelled) return;

        setRuntime({
          isMiniApp: true,
          supportsComposeCast: capabilities.includes('actions.composeCast'),
          displayName: context.user?.displayName,
          handle: context.user?.username,
          fid: context.user?.fid,
        });
      } catch {
        // Regular browser / Base App path: standard wallet connection remains available.
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return runtime;
}
