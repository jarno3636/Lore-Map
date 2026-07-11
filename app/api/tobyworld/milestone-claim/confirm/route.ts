import { NextResponse } from 'next/server';
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isHash,
} from 'viem';
import { base } from 'viem/chains';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import {
  awardTrustedPatchEventsSafely,
} from '@/lib/tobyworld-patch-awards-server';
import {
  MILESTONE_CHAIN_ID,
  MILESTONE_RELICS_ABI,
  MILESTONE_RELICS_ADDRESS,
} from '@/lib/tobyworld-milestone-contract';
import {
  TOBYWORLD_MILESTONES,
} from '@/lib/tobyworld-milestones';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConfirmBody = {
  walletAddress?: unknown;
  tokenId?: unknown;
  transactionHash?: unknown;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function getRpcUrl() {
  return (
    process.env.BASE_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ||
    'https://mainnet.base.org'
  );
}

const publicClient = createPublicClient({
  chain: base,
  transport: http(getRpcUrl()),
});

export async function POST(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json(
        {
          ok: false,
          error: auth.error,
        },
        auth.status,
      );
    }

    if (MILESTONE_CHAIN_ID !== base.id) {
      return json(
        {
          ok: false,
          error:
            'The configured milestone contract is not on Base mainnet.',
        },
        500,
      );
    }

    if (!MILESTONE_RELICS_ADDRESS) {
      return json(
        {
          ok: false,
          error: 'Milestone relic contract address is missing.',
        },
        500,
      );
    }

    const body = (await request.json()) as ConfirmBody;

    const walletAddress =
      typeof body.walletAddress === 'string'
        ? body.walletAddress
        : '';

    const transactionHash =
      typeof body.transactionHash === 'string'
        ? body.transactionHash
        : '';

    const tokenId = Number(body.tokenId);

    if (!isAddress(walletAddress)) {
      return json(
        {
          ok: false,
          error: 'Invalid wallet address.',
        },
        400,
      );
    }

    if (!isHash(transactionHash)) {
      return json(
        {
          ok: false,
          error: 'Invalid transaction hash.',
        },
        400,
      );
    }

    if (
      !Number.isSafeInteger(tokenId) ||
      tokenId <= 0
    ) {
      return json(
        {
          ok: false,
          error: 'Invalid relic token ID.',
        },
        400,
      );
    }

    const milestone = TOBYWORLD_MILESTONES.find(
      (item) => item.tokenId === tokenId,
    );

    if (!milestone) {
      return json(
        {
          ok: false,
          error: 'Unknown Tobyworld relic.',
        },
        404,
      );
    }

    const normalizedWallet = getAddress(walletAddress);

    const receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash,
    });

    if (receipt.status !== 'success') {
      return json(
        {
          ok: false,
          error: 'Relic claim transaction did not succeed.',
        },
        409,
      );
    }

    const balance = await publicClient.readContract({
      address: MILESTONE_RELICS_ADDRESS,
      abi: MILESTONE_RELICS_ABI,
      functionName: 'balanceOf',
      args: [
        normalizedWallet,
        BigInt(tokenId),
      ],
    });

    if (BigInt(balance) <= BigInt(0)) {
      return json(
        {
          ok: false,
          error:
            'The connected wallet does not hold this relic yet.',
        },
        409,
      );
    }

    const patchAwards =
      await awardTrustedPatchEventsSafely(
        auth.fid,
        [
          {
            eventKey: 'relic_claimed',
            value: 1,
            uniqueKey: String(tokenId),
            idempotencyKey:
              `relic-claim:${auth.fid}:${tokenId}`,
            occurredAt:
              new Date(
                Number(receipt.blockNumber) > 0
                  ? Date.now()
                  : Date.now(),
              ).toISOString(),
            context: {
              tokenId,
              milestoneId: milestone.id,
              title: milestone.title,
              threshold: milestone.threshold,
              walletAddress: normalizedWallet,
              transactionHash,
              blockNumber:
                receipt.blockNumber.toString(),
            },
          },
        ],
      );

    return json({
      ok: true,
      confirmed: true,
      fid: auth.fid,
      walletAddress: normalizedWallet,
      tokenId,
      transactionHash,
      unlockedPatchIds:
        patchAwards.unlockedPatchIds,
      unlockedPatches:
        patchAwards.unlockedPatches,
    });
  } catch (error) {
    console.error(
      'Milestone claim confirmation failed:',
      error,
    );

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to confirm relic claim.',
      },
      500,
    );
  }
}
