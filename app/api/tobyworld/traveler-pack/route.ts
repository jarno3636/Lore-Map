import { NextRequest, NextResponse } from 'next/server';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  buildDefaultLayout,
  getBackpackTier,
  type PatchPlacement,
  type TravelerEventInput,
} from '@/lib/tobyworld-patches';

export const dynamic = 'force-dynamic';

const supabaseAdmin = getSupabaseAdmin();

type PatchDefinitionRow = {
  id: string;
  name: string;
  short_description: string;
  lore: string;
  category: string;
  rarity: string;
  image_path: string;
  public_hint: string | null;
  is_hidden: boolean;
  sort_order: number;
  animation_key: string | null;
  unlock_type: string;
  event_key: string | null;
  requirement: Record<string, unknown>;
  starts_at: string | null;
  ends_at: string | null;
};

type OwnedPatchRow = {
  patch_id: string;
  earned_at: string;
  featured: boolean;
};

type ProgressRow = {
  patch_id: string;
  current_value: number;
  target_value: number;
  completed_at: string | null;
};

const EVENT_KEYS = new Set([
  'daily_rite_completed',
  'daily_rite_streak',
  'passport_opened',
  'passport_shared',
  'passport_rerolled',
  'atlas_opened',
  'atlas_node_visited',
  'relic_viewed',
  'community_echo_added',
  'page_visited',
  'toby_clicked',
  'floating_star_clicked',
  'session_duration_reached',
  'secret_sequence_completed',
]);

function safeDefinition(row: PatchDefinitionRow) {
  return {
    id: row.id,
    name: row.name,
    shortDescription: row.short_description,
    lore: row.lore,
    category: row.category,
    rarity: row.rarity,
    imagePath: row.image_path,
    publicHint: row.public_hint,
    isHidden: row.is_hidden,
    sortOrder: row.sort_order,
    animationKey: row.animation_key,
  };
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isWithinAvailability(row: PatchDefinitionRow, now = new Date()) {
  if (row.starts_at && new Date(row.starts_at) > now) return false;
  if (row.ends_at && new Date(row.ends_at) < now) return false;
  return true;
}

function numberRequirement(
  requirement: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const value = requirement[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArrayRequirement(
  requirement: Record<string, unknown>,
  key: string,
): string[] {
  const value = requirement[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

async function loadPack(fid: number) {
  const [
    definitionsResult,
    ownedResult,
    progressResult,
    layoutResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('tobyworld_patch_definitions')
      .select(
        'id,name,short_description,lore,category,rarity,image_path,public_hint,is_hidden,sort_order,animation_key,unlock_type,event_key,requirement,starts_at,ends_at',
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('tobyworld_owned_patches')
      .select('patch_id,earned_at,featured')
      .eq('fid', fid)
      .order('earned_at', { ascending: false }),
    supabaseAdmin
      .from('tobyworld_patch_progress')
      .select('patch_id,current_value,target_value,completed_at')
      .eq('fid', fid),
    supabaseAdmin
      .from('tobyworld_backpack_placements')
      .select('patch_id,x,y,rotation,scale,z_index')
      .eq('fid', fid),
  ]);

  const error =
    definitionsResult.error ??
    ownedResult.error ??
    progressResult.error ??
    layoutResult.error;

  if (error) throw error;

  const definitions = (definitionsResult.data ?? []) as PatchDefinitionRow[];
  const owned = (ownedResult.data ?? []) as OwnedPatchRow[];
  const progress = (progressResult.data ?? []) as ProgressRow[];

  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  const ownedIds = new Set(owned.map((item) => item.patch_id));

  const ownedPatches = owned.flatMap((ownership) => {
    const definition = definitionsById.get(ownership.patch_id);
    if (!definition) return [];

    return [
      {
        ...safeDefinition(definition),
        earnedAt: ownership.earned_at,
        featured: ownership.featured,
      },
    ];
  });

  const visibleProgress = progress.flatMap((item) => {
    const definition = definitionsById.get(item.patch_id);
    if (!definition || definition.is_hidden || ownedIds.has(definition.id)) {
      return [];
    }

    return [
      {
        ...safeDefinition(definition),
        currentValue: item.current_value,
        targetValue: item.target_value,
        completedAt: item.completed_at,
      },
    ];
  });

  const catalog = definitions
    .filter((definition) => !definition.is_hidden || ownedIds.has(definition.id))
    .map(safeDefinition);

  const layout = (layoutResult.data ?? []).map((item) => ({
    patchId: item.patch_id,
    x: Number(item.x),
    y: Number(item.y),
    rotation: Number(item.rotation),
    scale: Number(item.scale),
    zIndex: Number(item.z_index),
  }));

  const backpackLayout =
    layout.length > 0
      ? layout
      : buildDefaultLayout(ownedPatches.map((patch) => patch.id));

  const patchCount = ownedPatches.length;
  const secretCount = ownedPatches.filter(
    (patch) => patch.category === 'secret_discoveries',
  ).length;

  return {
    explorer: {
      fid,
      tier: getBackpackTier(patchCount),
      patchCount,
      secretCount,
      featuredPatchId:
        ownedPatches.find((patch) => patch.featured)?.id ?? null,
    },
    catalog,
    ownedPatches,
    visibleProgress,
    backpackLayout,
    recentUnlocks: ownedPatches.slice(0, 6),
  };
}

async function evaluateCounterPatch(
  fid: number,
  definition: PatchDefinitionRow,
  event: TravelerEventInput,
  eventId: string,
) {
  const target = numberRequirement(definition.requirement, 'target', 1);

  const { data: existing } = await supabaseAdmin
    .from('tobyworld_patch_progress')
    .select('current_value,target_value')
    .eq('fid', fid)
    .eq('patch_id', definition.id)
    .maybeSingle();

  let nextValue = existing?.current_value ?? 0;

  if (definition.unlock_type === 'unique_counter') {
    const uniqueField =
      typeof definition.requirement.uniqueField === 'string'
        ? definition.requirement.uniqueField
        : null;

    const uniqueKey =
      event.uniqueKey ??
      (uniqueField && typeof event.context?.[uniqueField] === 'string'
        ? String(event.context[uniqueField])
        : null);

    if (!uniqueKey) return null;

    const { count } = await supabaseAdmin
      .from('tobyworld_patch_events')
      .select('id', { head: true, count: 'exact' })
      .eq('fid', fid)
      .eq('event_key', event.eventKey)
      .not('unique_key', 'is', null);

    nextValue = count ?? 0;
  } else {
    nextValue += Math.max(1, Math.min(1000, event.value ?? 1));
  }

  const completed = nextValue >= target;

  await supabaseAdmin.from('tobyworld_patch_progress').upsert(
    {
      fid,
      patch_id: definition.id,
      current_value: nextValue,
      target_value: target,
      last_progress_at: new Date().toISOString(),
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: 'fid,patch_id' },
  );

  if (!completed) return null;

  const { data: granted, error } = await supabaseAdmin
    .from('tobyworld_owned_patches')
    .upsert(
      {
        fid,
        patch_id: definition.id,
        source: 'engine',
        event_id: eventId,
      },
      { onConflict: 'fid,patch_id', ignoreDuplicates: true },
    )
    .select('patch_id,earned_at,featured')
    .maybeSingle();

  if (error) throw error;
  return granted;
}

async function evaluateTimeWindowPatch(
  fid: number,
  definition: PatchDefinitionRow,
  event: TravelerEventInput,
  eventId: string,
) {
  const eventTime = event.occurredAt ? new Date(event.occurredAt) : new Date();
  const allowedHours = stringArrayRequirement(
    definition.requirement,
    'localHours',
  ).map(Number);

  const numericHours = Array.isArray(definition.requirement.localHours)
    ? definition.requirement.localHours.filter(
        (value): value is number => typeof value === 'number',
      )
    : allowedHours;

  const localHour =
    typeof event.context?.localHour === 'number'
      ? event.context.localHour
      : eventTime.getHours();

  if (!numericHours.includes(localHour)) return null;

  const { data, error } = await supabaseAdmin
    .from('tobyworld_owned_patches')
    .upsert(
      {
        fid,
        patch_id: definition.id,
        source: 'engine',
        event_id: eventId,
      },
      { onConflict: 'fid,patch_id', ignoreDuplicates: true },
    )
    .select('patch_id,earned_at,featured')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function recordEvent(fid: number, event: TravelerEventInput) {
  if (!EVENT_KEYS.has(event.eventKey)) {
    throw new Error('Unsupported traveler event');
  }

  if (
    !event.idempotencyKey ||
    event.idempotencyKey.length < 8 ||
    event.idempotencyKey.length > 180
  ) {
    throw new Error('Invalid idempotency key');
  }

  const value = Math.max(1, Math.min(1000, event.value ?? 1));
  const context = event.context ?? {};
  const uniqueKey =
    event.uniqueKey ??
    (typeof context.nodeId === 'string'
      ? context.nodeId
      : typeof context.relicId === 'string'
        ? context.relicId
        : typeof context.pageKey === 'string'
          ? context.pageKey
          : null);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('tobyworld_patch_events')
    .insert({
      fid,
      event_key: event.eventKey,
      event_value: value,
      unique_key: uniqueKey,
      idempotency_key: event.idempotencyKey,
      context,
      occurred_at: event.occurredAt ?? new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      return { duplicate: true, unlockedPatchIds: [] as string[] };
    }
    throw insertError;
  }

  const now = new Date();

  const { data: definitions, error: definitionsError } = await supabaseAdmin
    .from('tobyworld_patch_definitions')
    .select(
      'id,name,short_description,lore,category,rarity,image_path,public_hint,is_hidden,sort_order,animation_key,unlock_type,event_key,requirement,starts_at,ends_at',
    )
    .eq('is_active', true)
    .eq('event_key', event.eventKey);

  if (definitionsError) throw definitionsError;

  const unlockedPatchIds: string[] = [];

  for (const definition of (definitions ?? []) as PatchDefinitionRow[]) {
    if (!isWithinAvailability(definition, now)) continue;

    let granted = null;

    if (
      definition.unlock_type === 'counter' ||
      definition.unlock_type === 'unique_counter'
    ) {
      granted = await evaluateCounterPatch(
        fid,
        definition,
        event,
        inserted.id,
      );
    } else if (definition.unlock_type === 'time_window') {
      granted = await evaluateTimeWindowPatch(
        fid,
        definition,
        event,
        inserted.id,
      );
    }

    if (granted?.patch_id) unlockedPatchIds.push(granted.patch_id);
  }

  const { count } = await supabaseAdmin
    .from('tobyworld_owned_patches')
    .select('id', { head: true, count: 'exact' })
    .eq('fid', fid);

  await supabaseAdmin.from('tobyworld_backpack_profiles').upsert(
    {
      fid,
      backpack_tier: getBackpackTier(count ?? 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'fid' },
  );

  return { duplicate: false, unlockedPatchIds };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return jsonError(auth.error, auth.status);
    }

    const pack = await loadPack(auth.fid);
    return NextResponse.json({ ok: true, pack });
  } catch (error) {
    console.error('Traveler pack GET failed:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Unable to load traveler pack',
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFarcasterFid(request);

    if (!auth.ok) {
      return jsonError(auth.error, auth.status);
    }

    const fid = auth.fid;
    const body = await request.json();

    if (!body || typeof body.action !== 'string') {
      return jsonError('Missing action');
    }

    if (body.action === 'record_event') {
      const result = await recordEvent(fid, body.event);
      const pack = await loadPack(fid);

      return NextResponse.json({
        ok: true,
        duplicate: result.duplicate,
        unlockedPatchIds: result.unlockedPatchIds,
        pack,
      });
    }

    if (body.action === 'update_layout') {
      const placements = Array.isArray(body.placements)
        ? (body.placements as PatchPlacement[])
        : [];

      if (placements.length > 150) return jsonError('Too many placements');

      const sanitized = placements.map((placement, index) => ({
        patchId: String(placement.patchId),
        x: Math.max(0, Math.min(100, Number(placement.x))),
        y: Math.max(0, Math.min(100, Number(placement.y))),
        rotation: Math.max(-180, Math.min(180, Number(placement.rotation))),
        scale: Math.max(0.35, Math.min(2.5, Number(placement.scale))),
        zIndex: Math.max(0, Math.min(500, Number(placement.zIndex ?? index))),
      }));

      const { error } = await supabaseAdmin.rpc(
        'tobyworld_replace_patch_layout',
        {
          p_fid: fid,
          p_placements: sanitized,
        },
      );

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'feature_patch') {
      const patchId =
        body.patchId === null || body.patchId === undefined
          ? null
          : String(body.patchId);

      const { error } = await supabaseAdmin.rpc(
        'tobyworld_set_featured_patch',
        {
          p_fid: fid,
          p_patch_id: patchId,
        },
      );

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'record_share') {
      const patchId =
        typeof body.patchId === 'string' ? body.patchId : null;

      const { error } = await supabaseAdmin
        .from('tobyworld_patch_shares')
        .insert({
          fid: fid,
          patch_id: patchId,
          share_type: patchId ? 'patch' : 'backpack',
          platform:
            typeof body.platform === 'string' ? body.platform : 'farcaster',
        });

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return jsonError('Unknown action');
  } catch (error) {
    console.error('Traveler pack POST failed:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Traveler pack request failed',
      500,
    );
  }
}
