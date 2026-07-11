import { getSupabaseAdmin } from '@/lib/supabase/server';

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

type ProcessPatchEventResult = {
  duplicate: boolean;
  unlockedPatchIds: string[];
};

export type TrustedPatchEvent = {
  eventKey: string;
  value?: number;
  uniqueKey?: string | null;
  idempotencyKey: string;
  context?: Record<string, unknown>;
  occurredAt?: string;
};

export type UnlockedPatchPayload = {
  id: string;
  name: string;
  shortDescription: string;
  lore: string;
  category: string;
  rarity: string;
  imagePath: string;
  publicHint: string | null;
  isHidden: boolean;
  sortOrder: number;
  animationKey: string | null;
  earnedAt: string;
  featured: boolean;
};

function safePatchDefinition(row: PatchDefinitionRow) {
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

async function processTrustedPatchEvent(
  fid: number,
  event: TrustedPatchEvent,
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc(
    'tobyworld_process_patch_event',
    {
      p_fid: fid,
      p_event_key: event.eventKey,
      p_event_value: event.value ?? 1,
      p_unique_key: event.uniqueKey ?? null,
      p_idempotency_key: event.idempotencyKey,
      p_context: event.context ?? {},
      p_occurred_at: event.occurredAt ?? new Date().toISOString(),
    },
  );

  if (error) {
    throw new Error(
      `Patch event ${event.eventKey} failed: ${error.message}`,
    );
  }

  const result =
    data as unknown as ProcessPatchEventResult | null;

  return Array.isArray(result?.unlockedPatchIds)
    ? result.unlockedPatchIds
    : [];
}

async function loadUnlockedPatches(
  fid: number,
  patchIds: string[],
): Promise<UnlockedPatchPayload[]> {
  if (patchIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();

  const [
    definitionsResult,
    ownershipResult,
  ] = await Promise.all([
    supabase
      .from('tobyworld_patch_definitions')
      .select(
        'id,name,short_description,lore,category,rarity,image_path,public_hint,is_hidden,sort_order,animation_key',
      )
      .in('id', patchIds),

    supabase
      .from('tobyworld_owned_patches')
      .select('patch_id,earned_at,featured')
      .eq('fid', fid)
      .in('patch_id', patchIds),
  ]);

  const queryError =
    definitionsResult.error ??
    ownershipResult.error;

  if (queryError) {
    throw new Error(
      `Unlocked patch read failed: ${queryError.message}`,
    );
  }

  const definitions =
    (definitionsResult.data ??
      []) as unknown as PatchDefinitionRow[];

  const ownershipById = new Map(
    (ownershipResult.data ?? []).map(
      (row) => [
        row.patch_id,
        {
          earnedAt: row.earned_at,
          featured: row.featured,
        },
      ],
    ),
  );

  return definitions.flatMap(
    (definition) => {
      const ownership =
        ownershipById.get(definition.id);

      if (!ownership) {
        return [];
      }

      return [
        {
          ...safePatchDefinition(
            definition,
          ),
          ...ownership,
        },
      ];
    },
  );
}

export async function awardTrustedPatchEvents(
  fid: number,
  events: TrustedPatchEvent[],
) {
  const unlockedGroups =
    await Promise.all(
      events.map((event) =>
        processTrustedPatchEvent(
          fid,
          event,
        ),
      ),
    );

  const unlockedPatchIds =
    Array.from(
      new Set(
        unlockedGroups.flat(),
      ),
    );

  return {
    unlockedPatchIds,
    unlockedPatches:
      await loadUnlockedPatches(
        fid,
        unlockedPatchIds,
      ),
  };
}

export async function awardTrustedPatchEventsSafely(
  fid: number,
  events: TrustedPatchEvent[],
) {
  try {
    return await awardTrustedPatchEvents(
      fid,
      events,
    );
  } catch (error) {
    console.error(
      'Non-blocking patch award failed:',
      error,
    );

    return {
      unlockedPatchIds:
        [] as string[],
      unlockedPatches:
        [] as UnlockedPatchPayload[],
    };
  }
}
