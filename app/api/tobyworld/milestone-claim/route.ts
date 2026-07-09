import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTobyworldEchoTotals } from '@/lib/tobyworld-echo-totals';
import { getMilestoneByTokenId, getMilestoneProgress } from '@/lib/tobyworld-milestones';
import {
  MILESTONE_CHAIN_ID,
  MILESTONE_EIP712_NAME,
  MILESTONE_EIP712_VERSION,
  MILESTONE_RELICS_ADDRESS,
} from '@/lib/tobyworld-milestone-contract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ClaimBody = {
  tokenId?: number | string;
  walletAddress?: string;
};

type DailyRiteClaimRow = {
  total_completions: number | null;
  current_echo_power: number | null;
  highest_echo_power: number | null;
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

function parseTokenId(value: ClaimBody['tokenId']) {
  const tokenId = Number(value);

  if (!Number.isSafeInteger(tokenId) || tokenId <= 0) {
    return null;
  }

  return tokenId;
}

function createNonce() {
  return BigInt(`0x${randomBytes(16).toString('hex')}`);
}

function getClaimSigner() {
  const privateKey = process.env.MILESTONE_CLAIM_SIGNER_PRIVATE_KEY?.trim();

  if (!privateKey?.startsWith('0x')) {
    throw new Error('Missing MILESTONE_CLAIM_SIGNER_PRIVATE_KEY.');
  }

  const signer = privateKeyToAccount(privateKey as `0x${string}`);
  const expectedSigner = process.env.MILESTONE_CLAIM_SIGNER_ADDRESS?.trim();

  if (expectedSigner && isAddress(expectedSigner)) {
    const expected = getAddress(expectedSigner);

    if (signer.address !== expected) {
      throw new Error(
        `Claim signer mismatch. Server key resolves to ${signer.address}, but expected ${expected}.`,
      );
    }
  }

  return signer;
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as ClaimBody;
  } catch {
    return {};
  }
}

async function getEchoTotals() {
  const supabase = getSupabaseAdmin();

  return getTobyworldEchoTotals(supabase);
}

async function getUserRiteProfile(fid: number) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_daily_rites')
    .select('total_completions, current_echo_power, highest_echo_power')
    .eq('fid', fid)
    .maybeSingle<DailyRiteClaimRow>();

  if (error) {
    throw new Error(`Daily rite profile failed: ${error.message}`);
  }

  return {
    totalCompletions: data?.total_completions ?? 0,
    currentEchoPower: data?.current_echo_power ?? 1,
    highestEchoPower: data?.highest_echo_power ?? 1,
  };
}

export async function POST(request: Request) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return json({ error: auth.error, code: 'auth_required' }, auth.status);
    }

    if (!MILESTONE_RELICS_ADDRESS) {
      return json(
        {
          error: 'Missing NEXT_PUBLIC_MILESTONE_RELICS_ADDRESS.',
          code: 'missing_contract',
        },
        500,
      );
    }

    const body = await readBody(request);
    const tokenId = parseTokenId(body.tokenId);
    const rawWalletAddress = body.walletAddress?.trim();

    if (!tokenId) {
      return json({ error: 'Invalid tokenId.', code: 'invalid_token_id' }, 400);
    }

    if (!rawWalletAddress || !isAddress(rawWalletAddress)) {
      return json({ error: 'Invalid wallet address.', code: 'invalid_wallet' }, 400);
    }

    const milestone = getMilestoneByTokenId(tokenId);

    if (!milestone) {
      return json({ error: 'Unknown milestone relic.', code: 'unknown_relic' }, 404);
    }

    const [{ totalEchoes, totalRites }, userProfile] = await Promise.all([
      getEchoTotals(),
      getUserRiteProfile(auth.fid),
    ]);

    const progress = getMilestoneProgress(totalEchoes, milestone.threshold);

    if (!progress.unlocked) {
      return json(
        {
          error: `${milestone.title} is still locked. ${progress.remaining.toLocaleString(
            'en-US',
          )} weighted echoes remain.`,
          code: 'relic_locked',
          totalEchoes,
          totalRites,
          requiredEchoes: milestone.threshold,
          remaining: progress.remaining,
          milestone,
        },
        403,
      );
    }

    if (userProfile.totalCompletions <= 0) {
      return json(
        {
          error: 'Complete at least one Daily Rite before claiming a relic.',
          code: 'daily_rite_required',
          totalEchoes,
          totalRites,
          milestone,
        },
        403,
      );
    }

    const signer = getClaimSigner();
    const to = getAddress(rawWalletAddress);

    const nonce = createNonce();
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
      ok: true,
      fid: auth.fid,
      to,
      tokenId,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
      contractAddress: MILESTONE_RELICS_ADDRESS,
      chainId: MILESTONE_CHAIN_ID,
      signerAddress: signer.address,
      expiresInSeconds: 900,

      totalEchoes,
      totalRites,
      userRiteCount: userProfile.totalCompletions,
      userEchoPower: userProfile.currentEchoPower,
      userHighestEchoPower: userProfile.highestEchoPower,

      milestone: {
        id: milestone.id,
        tokenId: milestone.tokenId,
        title: milestone.title,
        threshold: milestone.threshold,
        symbol: milestone.symbol,
        imageSrc: milestone.imageSrc,
      },
    });
  } catch (error) {
    console.error('Milestone claim API failed:', error);

    return json(
      {
        error: getErrorMessage(error),
        code: 'claim_signature_failed',
      },
      500,
    );
  }
}
