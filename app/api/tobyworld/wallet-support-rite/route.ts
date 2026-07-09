import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTodayUtcDate } from '@/lib/tobyworld-pond-passport';
import {
  getRequestDomain,
  verifyWalletSupportPayload,
  type WalletSupportPayload,
} from '@/lib/tobyworld-wallet-support';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Partial<WalletSupportPayload>;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const domain = getRequestDomain(request);

    const verified = await verifyWalletSupportPayload({
      payload: {
        walletAddress: body.walletAddress ?? '',
        signature: body.signature as `0x${string}`,
        message: body.message ?? '',
      },
      domain,
    });

    if (!verified.ok) {
      return json(
        {
          ok: false,
          error: verified.error,
          code: 'wallet_signature_required',
          heldAssets: verified.heldAssets ?? [],
        },
        401,
      );
    }

    const supabase = getSupabaseAdmin();
    const today = getTodayUtcDate();

    const { error } = await supabase.from('tobyworld_wallet_rite_events').insert({
      wallet_address: verified.walletAddress,
      rite_date: today,
      echo_power: 1,
      signature: verified.signature,
      signed_message: verified.message,
      domain,
      held_assets: verified.heldAssets,
    });

    const alreadySupportedToday = error?.code === '23505';

    if (error && !alreadySupportedToday) {
      throw new Error(error.message);
    }

    return json({
      ok: true,
      walletAddress: verified.walletAddress,
      riteDate: today,
      alreadySupportedToday,
      echoPower: 1,
      heldAssets: verified.heldAssets,
      message: alreadySupportedToday
        ? 'This wallet already supported today’s rite. Passport still stamped.'
        : 'The wallet has supported today’s pond rite. Passport stamped.',
    });
  } catch (error) {
    console.error('Wallet support rite failed:', error);

    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to support today’s rite.',
        code: 'wallet_support_failed',
      },
      500,
    );
  }
}
