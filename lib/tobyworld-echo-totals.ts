import type { SupabaseClient } from '@supabase/supabase-js';

type EchoTotalsRpcRow = {
  total_echoes: number | string | null;
  total_rites: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

export async function getTobyworldEchoTotals(supabase: SupabaseClient) {
  const rpcResult = await supabase.rpc('get_tobyworld_echo_totals').maybeSingle();

  if (!rpcResult.error && rpcResult.data) {
    const row = rpcResult.data as EchoTotalsRpcRow;

    return {
      totalEchoes: toNumber(row.total_echoes),
      totalRites: toNumber(row.total_rites),
    };
  }

  console.warn('Echo totals RPC unavailable, using fallback:', rpcResult.error?.message);

  const { data, error } = await supabase.from('tobyworld_rite_events').select('echo_power');

  if (error) {
    throw new Error(`Echo totals fallback failed: ${error.message}`);
  }

  const rows = (data ?? []) as { echo_power: number | null }[];

  return {
    totalEchoes: rows.reduce((sum, row) => sum + Math.max(1, row.echo_power ?? 1), 0),
    totalRites: rows.length,
  };
}
