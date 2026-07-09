import { getAddress, isAddress, verifyMessage } from 'viem';
import { getTodayUtcDate } from '@/lib/tobyworld-pond-passport';

export type WalletSupportPayload = {
  walletAddress: string;
  signature: `0x${string}`;
  message: string;
};

export function getRequestDomain(request: Request) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  if (host) return host;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://toby-atlas.vercel.app';
  return new URL(appUrl).host;
}

export function buildWalletSupportMessage({
  walletAddress,
  domain,
  date = getTodayUtcDate(),
}: {
  walletAddress: string;
  domain: string;
  date?: string;
}) {
  const wallet = getAddress(walletAddress);

  return [
    'Tobyworld Pond Passport',
    '',
    "I am supporting today's pond rite.",
    '',
    `Wallet: ${wallet}`,
    `Date: ${date}`,
    `Domain: ${domain}`,
    '',
    'No gas. No transaction. No token approval.',
  ].join('\n');
}

export async function verifyWalletSupportPayload({
  payload,
  domain,
}: {
  payload: WalletSupportPayload;
  domain: string;
}) {
  if (!isAddress(payload.walletAddress)) {
    return {
      ok: false as const,
      error: 'Invalid wallet address.',
    };
  }

  const walletAddress = getAddress(payload.walletAddress);
  const expectedMessage = buildWalletSupportMessage({
    walletAddress,
    domain,
  });

  if (payload.message !== expectedMessage) {
    return {
      ok: false as const,
      error: 'The signed message does not match today’s pond rite.',
    };
  }

  const valid = await verifyMessage({
    address: walletAddress,
    message: payload.message,
    signature: payload.signature,
  });

  if (!valid) {
    return {
      ok: false as const,
      error: 'Wallet signature could not be verified.',
    };
  }

  return {
    ok: true as const,
    walletAddress,
    message: payload.message,
    signature: payload.signature,
  };
}
