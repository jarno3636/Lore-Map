import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  verifyMessage,
  type Address,
} from 'viem';
import { base } from 'viem/chains';
import { TOBYWORLD_SWAP_TOKENS } from '@/lib/tobyworld-swap-tokens';
import { getTodayUtcDate } from '@/lib/tobyworld-pond-passport';

export type WalletSupportPayload = {
  walletAddress: string;
  signature: `0x${string}`;
  message: string;
};

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const REQUIRED_ASSET_COUNT = 2;

const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

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

async function getHeldTobyworldAssets(walletAddress: Address) {
  const results = await Promise.allSettled(
    TOBYWORLD_SWAP_TOKENS.map(async (token) => {
      const balance = await baseClient.readContract({
        address: token.address,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      return {
        id: token.id,
        symbol: token.symbol,
        balance,
      };
    }),
  );

  return results
    .map((result) => {
      if (result.status !== 'fulfilled') return null;
      if (result.value.balance <= BigInt(0)) return null;

      return {
        id: result.value.id,
        symbol: result.value.symbol,
      };
    })
    .filter((asset): asset is { id: string; symbol: string } => Boolean(asset));
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

  const heldAssets = await getHeldTobyworldAssets(walletAddress);

  if (heldAssets.length < REQUIRED_ASSET_COUNT) {
    return {
      ok: false as const,
      error: `This wallet holds ${heldAssets.length}/${REQUIRED_ASSET_COUNT} required Tobyworld assets.`,
      heldAssets,
    };
  }

  return {
    ok: true as const,
    walletAddress,
    message: payload.message,
    signature: payload.signature,
    heldAssets,
  };
}
