'use client';

import {
  createConfig,
  createStorage,
  cookieStorage,
  http,
} from 'wagmi';
import { base } from 'wagmi/chains';
import {
  baseAccount,
  injected,
  walletConnect,
} from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const APP_NAME = 'Tobyworld Atlas';

const APP_DESCRIPTION =
  'Explore the Tobyworld pond, complete rites, stamp passports, and unlock relics.';

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'http://localhost:3000'
).replace(/\/+$/, '');

const APP_ICON_URL = `${APP_URL}/miniapp/tobyworld-app-icon.png`;

const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ||
  'https://mainnet.base.org';

const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

/**
 * Shared configuration values used by both connector branches.
 */
const storage = createStorage({
  storage: cookieStorage,
  key: 'tobyworld-wagmi',
});

const transports = {
  [base.id]: http(BASE_RPC_URL),
};

/**
 * Create each connector through a function so a fresh connector instance is
 * supplied whenever a Wagmi config is created.
 */
function createFarcasterConnector() {
  return farcasterMiniApp();
}

function createBaseAccountConnector() {
  return baseAccount({
    appName: APP_NAME,
    appLogoUrl: APP_ICON_URL,
  });
}

function createInjectedConnector() {
  return injected({
    shimDisconnect: true,
  });
}

/**
 * Two explicit createConfig branches avoid mutating a connector array whose
 * type was inferred too narrowly before WalletConnect was added.
 */
export function getWagmiConfig() {
  if (WALLETCONNECT_PROJECT_ID) {
    return createConfig({
      chains: [base],
      ssr: true,
      multiInjectedProviderDiscovery: true,

      storage,

      connectors: [
        createFarcasterConnector(),
        createBaseAccountConnector(),
        createInjectedConnector(),

        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          metadata: {
            name: APP_NAME,
            description: APP_DESCRIPTION,
            url: APP_URL,
            icons: [APP_ICON_URL],
          },
        }),
      ],

      transports,
    });
  }

  return createConfig({
    chains: [base],
    ssr: true,
    multiInjectedProviderDiscovery: true,

    storage,

    connectors: [
      createFarcasterConnector(),
      createBaseAccountConnector(),
      createInjectedConnector(),
    ],

    transports,
  });
}

export const wagmiConfig = getWagmiConfig();

export const config = wagmiConfig;

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
