import { NextRequest, NextResponse } from 'next/server';
import { requireFarcasterFid } from '@/lib/farcaster/quick-auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  buildDefaultLayout,
  getBackpackTier,
  isTravelerEventInput,
  sanitizePlacements,
  type PatchPlacement,
  type TravelerEventInput,
} from '@/lib/tobyworld-patches';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseAdmin = getSupabaseAdmin();

/**
 * Events that may be reported by authenticated client components.
 *
 * Important:
 * `relic_claimed` is intentionally excluded. It must only be awarded by:
 *
 * app/api/tobyworld/milestone-claim/confirm/route.ts
 *
 * after that route verifies the Base transaction receipt and ERC-1155 balance.
 */
const CLIENT_EVENT_KEYS = new Set<string>([
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

type LayoutRow = {
  patch_id: string;
  x: number | string;
  y: number | string;
  rotation: number | string;
  scale: number | string;
  z_index: number | string;
};

type ProcessEventResult = {
  duplicate: boolean;
  unlockedPatchIds: string[];
};

type ActionBody = {
  action?: unknown;
  event?: unknown;
  placements?: unknown;
  patchId?: unknown;
  platform?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

function jsonSuccess(data: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: true,
      ...data,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function safeDefinition(
  row: PatchDefinitionRow,
) {
  return {
    id: row.id,
    name: row.name,
    shortDescription:
      row.short_description,
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

async function loadPack(fid: number) {
  const [
    definitionsResult,
    ownedResult,
    progressResult,
    layoutResult,
  ] = await Promise.all([
    supabaseAdmin
      .from(
        'tobyworld_patch_definitions',
      )
      .select(
        'id,name,short_description,lore,category,rarity,image_path,public_hint,is_hidden,sort_order,animation_key',
      )
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      }),

    supabaseAdmin
      .from(
        'tobyworld_owned_patches',
      )
      .select(
        'patch_id,earned_at,featured',
      )
      .eq('fid', fid)
      .order('earned_at', {
        ascending: false,
      }),

    supabaseAdmin
      .from(
        'tobyworld_patch_progress',
      )
      .select(
        'patch_id,current_value,target_value,completed_at',
      )
      .eq('fid', fid),

    supabaseAdmin
      .from(
        'tobyworld_backpack_placements',
      )
      .select(
        'patch_id,x,y,rotation,scale,z_index',
      )
      .eq('fid', fid),
  ]);

  const queryError =
    definitionsResult.error ??
    ownedResult.error ??
    progressResult.error ??
    layoutResult.error;

  if (queryError) {
    throw queryError;
  }

  const definitions =
    (definitionsResult.data ??
      []) as unknown as PatchDefinitionRow[];

  const owned =
    (ownedResult.data ??
      []) as unknown as OwnedPatchRow[];

  const progress =
    (progressResult.data ??
      []) as unknown as ProgressRow[];

  const layoutRows =
    (layoutResult.data ??
      []) as unknown as LayoutRow[];

  const definitionsById = new Map(
    definitions.map((definition) => [
      definition.id,
      definition,
    ]),
  );

  const ownedIds = new Set(
    owned.map(
      (item) => item.patch_id,
    ),
  );

  const ownedPatches = owned.flatMap(
    (ownership) => {
      const definition =
        definitionsById.get(
          ownership.patch_id,
        );

      if (!definition) {
        return [];
      }

      return [
        {
          ...safeDefinition(
            definition,
          ),
          earnedAt:
            ownership.earned_at,
          featured:
            ownership.featured,
        },
      ];
    },
  );

  const visibleProgress =
    progress.flatMap((item) => {
      const definition =
        definitionsById.get(
          item.patch_id,
        );

      if (
        !definition ||
        definition.is_hidden ||
        ownedIds.has(
          definition.id,
        )
      ) {
        return [];
      }

      return [
        {
          ...safeDefinition(
            definition,
          ),
          currentValue:
            item.current_value,
          targetValue:
            item.target_value,
          completedAt:
            item.completed_at,
        },
      ];
    });

  const catalog = definitions
    .filter(
      (definition) =>
        !definition.is_hidden ||
        ownedIds.has(
          definition.id,
        ),
    )
    .map(safeDefinition);

  const storedLayout =
    layoutRows.map((item) => ({
      patchId: item.patch_id,
      x: Number(item.x),
      y: Number(item.y),
      rotation: Number(
        item.rotation,
      ),
      scale: Number(item.scale),
      zIndex: Number(
        item.z_index,
      ),
    }));

  const backpackLayout =
    storedLayout.length > 0
      ? storedLayout
      : buildDefaultLayout(
          ownedPatches.map(
            (patch) => patch.id,
          ),
        );

  const patchCount =
    ownedPatches.length;

  const secretCount =
    ownedPatches.filter(
      (patch) =>
        patch.category ===
        'secret_discoveries',
    ).length;

  return {
    explorer: {
      fid,
      tier: getBackpackTier(
        patchCount,
      ),
      patchCount,
      secretCount,
      featuredPatchId:
        ownedPatches.find(
          (patch) =>
            patch.featured,
        )?.id ?? null,
    },
    catalog,
    ownedPatches,
    visibleProgress,
    backpackLayout,
    recentUnlocks:
      ownedPatches.slice(0, 6),
  };
}

async function processEvent(
  fid: number,
  event: TravelerEventInput,
) {
  if (
    !CLIENT_EVENT_KEYS.has(
      event.eventKey,
    )
  ) {
    throw new Error(
      'This traveler event cannot be submitted from the client.',
    );
  }

  const context =
    event.context &&
    isRecord(event.context)
      ? event.context
      : {};

  const uniqueKey =
    event.uniqueKey ??
    (typeof context.nodeId ===
    'string'
      ? context.nodeId
      : typeof context.relicId ===
          'string'
        ? context.relicId
        : typeof context.tokenId ===
            'string'
          ? context.tokenId
          : typeof context.pageKey ===
              'string'
            ? context.pageKey
            : null);

  const { data, error } =
    await supabaseAdmin.rpc(
      'tobyworld_process_patch_event',
      {
        p_fid: fid,
        p_event_key:
          event.eventKey,
        p_event_value:
          event.value ?? 1,
        p_unique_key:
          uniqueKey,
        p_idempotency_key:
          event.idempotencyKey,
        p_context: context,
        p_occurred_at:
          event.occurredAt ??
          new Date().toISOString(),
      },
    );

  if (error) {
    throw error;
  }

  const result =
    data as unknown as ProcessEventResult | null;

  return {
    duplicate:
      result?.duplicate ?? false,

    unlockedPatchIds:
      Array.isArray(
        result?.unlockedPatchIds,
      )
        ? result.unlockedPatchIds
        : [],
  };
}

export async function GET(
  request: NextRequest,
) {
  try {
    const auth =
      await requireFarcasterFid(
        request,
      );

    if (!auth.ok) {
      return jsonError(
        auth.error,
        auth.status,
      );
    }

    return jsonSuccess({
      pack: await loadPack(
        auth.fid,
      ),
    });
  } catch (error) {
    console.error(
      'Traveler pack GET failed:',
      error,
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : 'Unable to load traveler pack.',
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const auth =
      await requireFarcasterFid(
        request,
      );

    if (!auth.ok) {
      return jsonError(
        auth.error,
        auth.status,
      );
    }

    let rawBody: unknown;

    try {
      rawBody =
        await request.json();
    } catch {
      return jsonError(
        'Request body must be valid JSON.',
      );
    }

    if (!isRecord(rawBody)) {
      return jsonError(
        'Invalid request body.',
      );
    }

    const body =
      rawBody as ActionBody;

    if (
      typeof body.action !==
      'string'
    ) {
      return jsonError(
        'Missing action.',
      );
    }

    if (
      body.action ===
      'record_event'
    ) {
      if (
        !isTravelerEventInput(
          body.event,
        )
      ) {
        return jsonError(
          'Missing or invalid traveler event.',
        );
      }

      if (
        !CLIENT_EVENT_KEYS.has(
          body.event.eventKey,
        )
      ) {
        return jsonError(
          'This traveler event must be verified by a trusted server route.',
          403,
        );
      }

      const result =
        await processEvent(
          auth.fid,
          body.event,
        );

      const pack =
        await loadPack(
          auth.fid,
        );

      const unlockedPatches =
        pack.ownedPatches.filter(
          (patch) =>
            result.unlockedPatchIds.includes(
              patch.id,
            ),
        );

      return jsonSuccess({
        duplicate:
          result.duplicate,
        unlockedPatchIds:
          result.unlockedPatchIds,
        unlockedPatches,
        pack,
      });
    }

    if (
      body.action ===
      'update_layout'
    ) {
      if (
        Array.isArray(
          body.placements,
        ) &&
        body.placements.length >
          150
      ) {
        return jsonError(
          'Too many placements.',
        );
      }

      const placements:
        PatchPlacement[] =
        sanitizePlacements(
          body.placements,
        );

      const { error } =
        await supabaseAdmin.rpc(
          'tobyworld_replace_patch_layout',
          {
            p_fid:
              auth.fid,
            p_placements:
              placements,
          },
        );

      if (error) {
        throw error;
      }

      return jsonSuccess({});
    }

    if (
      body.action ===
      'feature_patch'
    ) {
      const patchId =
        body.patchId === null ||
        body.patchId ===
          undefined
          ? null
          : String(
              body.patchId,
            );

      const { error } =
        await supabaseAdmin.rpc(
          'tobyworld_set_featured_patch',
          {
            p_fid:
              auth.fid,
            p_patch_id:
              patchId,
          },
        );

      if (error) {
        throw error;
      }

      return jsonSuccess({});
    }

    if (
      body.action ===
      'record_share'
    ) {
      const patchId =
        typeof body.patchId ===
        'string'
          ? body.patchId
              .trim()
              .slice(0, 120) ||
            null
          : null;

      const platform =
        typeof body.platform ===
        'string'
          ? body.platform
              .trim()
              .slice(0, 80) ||
            'farcaster'
          : 'farcaster';

      const { error } =
        await supabaseAdmin
          .from(
            'tobyworld_patch_shares',
          )
          .insert({
            fid: auth.fid,
            patch_id:
              patchId,
            share_type:
              patchId
                ? 'patch'
                : 'backpack',
            platform,
          });

      if (error) {
        throw error;
      }

      return jsonSuccess({});
    }

    return jsonError(
      'Unknown action.',
    );
  } catch (error) {
    console.error(
      'Traveler pack POST failed:',
      error,
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : 'Traveler pack request failed.',
      500,
    );
  }
}
