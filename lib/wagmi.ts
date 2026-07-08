'use client';

import { createConfig, createStorage, cookieStorage, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount, injected } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const appName = 'Tobyworld Atlas';
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const appIconUrl = `${appUrl}/miniapp/tobyworld-app-icon.png`;

export const wagmiConfig = createConfig({
  chains: [base],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  connectors: [
    farcasterMiniApp(),
    baseAccount({
      appName,
      appLogoUrl: appIconUrl,
    }),
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});

export const config = wagmiConfig;

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
