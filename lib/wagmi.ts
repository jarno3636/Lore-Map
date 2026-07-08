import { base } from 'wagmi/chains';
import { createConfig, createStorage, cookieStorage, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { baseAccount } from '@base-org/account';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

/**
 * One config supports three places:
 * 1. Farcaster Mini App host: the Farcaster connector auto-attaches the host wallet.
 * 2. Base App / browser: Base Account is the preferred wallet path.
 * 3. Other browsers: injected wallets remain available as a fallback.
 */
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    baseAccount({ appName: 'Tobyworld Atlas' }),
    injected(),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
