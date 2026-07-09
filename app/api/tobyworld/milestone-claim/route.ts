import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getMilestoneByTokenId, getMilestoneProgress } from '@/lib/tobyworld-milestones';
import {
  MILESTONE_CHAIN_ID,
  MILESTONE_EIP712_NAME,
  MILESTONE_EIP712_VERSION,
  MILESTONE_RELICS_ADDRESS,
} from '@/lib/tobyworld-milestone-contract';

export const dynamic = 'force-dynamic';

type ClaimBody = {
  tokenId?: number;
  walletAddress?: string;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown server error.';
}

function getClaimSigner() {
  const privateKey = process.env.MILESTONE_CLAIM_SIGNER_PRIVATE_KEY?.trim();

  if (!privateKey?.startsWith('0x')) {
    throw new Error('Missing MILESTONE_CLAIM_SIGNER_PRIVATE_KEY.');
  }

  return privateKeyToAccount(privateKey as `0x${string}`);
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as ClaimBody;
  } catch {
    return {};
  }
}

async function getTotalEchoes() {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from('tobyworld_rite_events')
    .select('id', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Milestone count failed: ${error.message}`);
  }

  return count ?? 0;
}

async function getUserRiteCount(fid: number) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_daily_rites')
    .select('total_completions')
    .eq('fid', fid)
    .maybeSingle<{ total_completions: number | null }>();

  if (error) {
    throw new Error(`Daily rite profile failed: ${error.message}`);
  }

  return data?.total_completions ?? 0;
}

export async function POST(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json({ error: auth.error }, auth.status);
    }

    if (!MILESTONE_RELICS_ADDRESS) {
      return json({ error: 'Missing NEXT_PUBLIC_MILESTONE_RELICS_ADDRESS.' }, 500);
    }

    const body = await readBody(request);
    const tokenId = Number(body.tokenId);
    const walletAddress = body.walletAddress;

    if (!Number.isFinite(tokenId)) {
      return json({ error: 'Invalid tokenId.' }, 400);
    }

    if (!walletAddress || !isAddress(walletAddress)) {
      return json({ error: 'Invalid wallet address.' }, 400);
    }

    const milestone = getMilestoneByTokenId(tokenId);

    if (!milestone) {
      return json({ error: 'Unknown milestone relic.' }, 404);
    }

    const [totalEchoes, userRiteCount] = await Promise.all([
      getTotalEchoes(),
      getUserRiteCount(auth.fid),
    ]);

    const progress = getMilestoneProgress(totalEchoes, milestone.threshold);

    if (!progress.unlocked) {
      return json(
        {
          error: 'This relic is still locked.',
          totalEchoes,
          requiredEchoes: milestone.threshold,
          remaining: progress.remaining,
        },
        403,
      );
    }

    if (userRiteCount <= 0) {
      return json(
        {
          error: 'Complete at least one Daily Rite before claiming a relic.',
        },
        403,
      );
    }

    const signer = getClaimSigner();
    const to = getAddress(walletAddress);

    const nonce = BigInt(Date.now());
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);

    const signature = await signer.signTypedData({
      domain: {
        name: MILESTONE_EIP712_NAME,
        version: MILESTONE_EIP712_VERSION,
        chainId: MILESTONE_CHAIN_ID,
        verifyingContract: MILESTONE_RELICS_ADDRESS,
      },
      types: {
        Claim: [
          { name: 'to', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'fid', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Claim',
      message: {
        to,
        tokenId: BigInt(tokenId),
        fid: BigInt(auth.fid),
        nonce,
        deadline,
      },
    });

    return json({
      fid: auth.fid,
      to,
      tokenId,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
      contractAddress: MILESTONE_RELICS_ADDRESS,
      chainId: MILESTONE_CHAIN_ID,
    });
  } catch (error) {
    console.error('Milestone claim API failed:', error);

    return json({ error: getErrorMessage(error) }, 500);
  }
}
