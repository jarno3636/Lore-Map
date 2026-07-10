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

function getConnectors() {
  const connectors = [
    /*
     * Farcaster Mini App wallet.
     */
    farcasterMiniApp(),

    /*
     * Base Account / smart-wallet connection.
     */
    baseAccount({
      appName: APP_NAME,
      appLogoUrl: APP_ICON_URL,
    }),

    /*
     * Injected wallet providers such as MetaMask,
     * Coinbase Wallet, Base App, Rabby, and Rainbow.
     */
    injected({
      shimDisconnect: true,
    }),
  ];

  /*
   * WalletConnect is optional.
   * It is only added when a project ID exists.
   */
  if (WALLETCONNECT_PROJECT_ID) {
    connectors.push(
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
    );
  }

  return connectors;
}

export function getWagmiConfig() {
  return createConfig({
    chains: [base],

    ssr: true,

    multiInjectedProviderDiscovery: true,

    storage: createStorage({
      storage: cookieStorage,
      key: 'tobyworld-wagmi',
    }),

    connectors: getConnectors(),

    transports: {
      [base.id]: http(BASE_RPC_URL),
    },
  });
}

export const wagmiConfig = getWagmiConfig();

export const config = wagmiConfig;

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
