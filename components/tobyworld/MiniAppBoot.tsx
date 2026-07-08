'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

type MiniAppIdentity = {
  isMiniApp: boolean;
  supportsComposeCast: boolean;
  displayName?: string;
  handle?: string;
  fid?: number;
};

type MiniAppBootProps = {
  onReady?: (identity: MiniAppIdentity) => void;
};

export function MiniAppBoot({ onReady }: MiniAppBootProps) {
  useEffect(() => {
    let cancelled = false;

    async function bootMiniApp() {
      try {
        const isMiniApp = await sdk.isInMiniApp();

        if (!isMiniApp) {
          if (!cancelled) {
            onReady?.({
              isMiniApp: false,
              supportsComposeCast: false,
            });
          }

          return;
        }

        const [context, capabilities] = await Promise.all([
          sdk.context,
          sdk.getCapabilities(),
        ]);

        if (cancelled) return;

        onReady?.({
          isMiniApp: true,
          supportsComposeCast: capabilities.includes('actions.composeCast'),
          displayName: context.user?.displayName,
          handle: context.user?.username,
          fid: context.user?.fid,
        });

        await sdk.actions.ready();
      } catch (error) {
        console.error('Unable to initialize Farcaster Mini App context:', error);

        if (!cancelled) {
          onReady?.({
            isMiniApp: false,
            supportsComposeCast: false,
          });
        }
      }
    }

    void bootMiniApp();

    return () => {
      cancelled = true;
    };
  }, [onReady]);

  return null;
}
