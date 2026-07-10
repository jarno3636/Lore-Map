import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from 'viem';
import { base } from 'viem/chains';
import { TOBYWORLD_SWAP_TOKENS } from '@/lib/tobyworld-swap-tokens';
import { getTodayUtcDate } from '@/lib/tobyworld-pond-passport';

export type WalletSupportPayload = {
  walletAddress: string;
  signature: Hex;
  message: string;
};

type TobyworldSupportAsset = (typeof TOBYWORLD_SWAP_TOKENS)[number];

export type HeldTobyworldSupportAsset = {
  id: TobyworldSupportAsset['id'];
  symbol: TobyworldSupportAsset['symbol'];
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
  transport: http(
    process.env.BASE_RPC_URL ||
      process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      'https://mainnet.base.org',
  ),
});

export function getRequestDomain(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');

  if (host) {
    return host.split(',')[0]?.trim() || host;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://toby-atlas.vercel.app';

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

async function getHeldTobyworldAssets(
  walletAddress: Address,
): Promise<HeldTobyworldSupportAsset[]> {
  const results = await Promise.allSettled(
    TOBYWORLD_SWAP_TOKENS.map(async (token) => {
      const balance = await baseClient.readContract({
        address: token.address,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      return {
        token,
        balance,
      };
    }),
  );

  return results
    .map((result): HeldTobyworldSupportAsset | null => {
      if (result.status !== 'fulfilled') {
        return null;
      }

      if (result.value.balance <= 0n) {
        return null;
      }

      return {
        id: result.value.token.id,
        symbol: result.value.token.symbol,
      };
    })
    .filter(
      (
        asset,
      ): asset is HeldTobyworldSupportAsset => asset !== null,
    );
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
      heldAssets: [] as HeldTobyworldSupportAsset[],
    };
  }

  if (
    typeof payload.message !== 'string' ||
    !payload.message.trim()
  ) {
    return {
      ok: false as const,
      error: 'The signed message is missing.',
      heldAssets: [] as HeldTobyworldSupportAsset[],
    };
  }

  if (
    typeof payload.signature !== 'string' ||
    !isHex(payload.signature) ||
    payload.signature.length <= 2
  ) {
    return {
      ok: false as const,
      error: 'The wallet returned an invalid signature.',
      heldAssets: [] as HeldTobyworldSupportAsset[],
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
      error:
        'The signed message does not match today’s pond rite.',
      heldAssets: [] as HeldTobyworldSupportAsset[],
    };
  }

  let valid = false;

  try {
    /*
     * PublicClient verification supports both ordinary EOAs and smart
     * contract accounts such as Base Account.
     */
    valid = await baseClient.verifyMessage({
      address: walletAddress,
      message: payload.message,
      signature: payload.signature,
    });
  } catch (error) {
    console.error(
      'Wallet support signature verification failed:',
      error,
    );

    return {
      ok: false as const,
      error:
        'Wallet signature verification failed. Reconnect the wallet and sign again.',
      heldAssets: [] as HeldTobyworldSupportAsset[],
    };
  }

  if (!valid) {
    return {
      ok: false as const,
      error: 'Wallet signature could not be verified.',
      heldAssets: [] as HeldTobyworldSupportAsset[],
    };
  }

  const heldAssets =
    await getHeldTobyworldAssets(walletAddress);

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
