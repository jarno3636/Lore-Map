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

type MiniAppContextSafe = {
  user?: {
    displayName?: string;
    username?: string;
    fid?: number;
  };
};

type MiniAppBootProps = {
  onReady?: (runtime: MiniAppRuntime) => void;
};

const EMPTY_RUNTIME: MiniAppRuntime = {
  isMiniApp: false,
  supportsComposeCast: false,
};


export function useMiniAppRuntime(): MiniAppRuntime {
  const [runtime, setRuntime] = useState<MiniAppRuntime>(EMPTY_RUNTIME);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const isMiniApp = await sdk.isInMiniApp();

        if (!isMiniApp) {
          if (!cancelled) setRuntime(EMPTY_RUNTIME);
          return;
        }

        const [contextResult, capabilitiesResult] = await Promise.all([
          sdk.context,
          sdk.getCapabilities(),
        ]);

        const context = contextResult as MiniAppContextSafe;
        const capabilities = capabilitiesResult as string[];

        if (cancelled) return;

        const nextRuntime: MiniAppRuntime = {
          isMiniApp: true,
          supportsComposeCast: capabilities.includes('actions.composeCast'),
          displayName: context.user?.displayName,
          handle: context.user?.username,
          fid: context.user?.fid,
        };

        setRuntime(nextRuntime);

        await sdk.actions.ready();
      } catch (error) {
        console.error('Unable to initialize Farcaster Mini App runtime:', error);

        if (!cancelled) {
          setRuntime(EMPTY_RUNTIME);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return runtime;
}

export function MiniAppBoot({ onReady }: MiniAppBootProps) {
  const runtime = useMiniAppRuntime();

  useEffect(() => {
    onReady?.(runtime);
  }, [onReady, runtime]);

  return null;
}
