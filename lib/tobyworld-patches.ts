export type PatchCategory =
  | 'daily_rite'
  | 'pond_passport'
  | 'atlas_exploration'
  | 'community'
  | 'milestone_relics'
  | 'secret_discoveries'
  | 'seasonal'
  | 'special';

export type PatchRarity =
  | 'field'
  | 'keepsake'
  | 'rare'
  | 'mythic'
  | 'legend';

export type UnlockType =
  | 'counter'
  | 'unique_counter'
  | 'sequence'
  | 'time_window'
  | 'seasonal'
  | 'manual'
  | 'external';

export type BackpackTier =
  | 'wanderer'
  | 'trailkeeper'
  | 'pathfinder'
  | 'cartographer'
  | 'relic_seeker'
  | 'atlas_legend';

export type TravelerEventKey =
  | 'daily_rite_completed'
  | 'daily_rite_streak'
  | 'passport_opened'
  | 'passport_shared'
  | 'passport_rerolled'
  | 'atlas_opened'
  | 'atlas_node_visited'
  | 'relic_viewed'
  | 'community_echo_added'
  | 'page_visited'
  | 'toby_clicked'
  | 'floating_star_clicked'
  | 'session_duration_reached'
  | 'secret_sequence_completed';

export type SafePatchDefinition = {
  id: string;
  name: string;
  shortDescription: string;
  lore: string;
  category: PatchCategory;
  rarity: PatchRarity;
  imagePath: string;
  publicHint: string | null;
  isHidden: boolean;
  sortOrder: number;
  animationKey: string | null;
};

export type OwnedPatch = SafePatchDefinition & {
  earnedAt: string;
  featured: boolean;
};

export type PatchProgress = SafePatchDefinition & {
  currentValue: number;
  targetValue: number;
  completedAt: string | null;
};

export type PatchPlacement = {
  patchId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
};

export type TravelerPackPayload = {
  explorer: {
    fid: number;
    tier: BackpackTier;
    patchCount: number;
    secretCount: number;
    featuredPatchId: string | null;
  };
  catalog: SafePatchDefinition[];
  ownedPatches: OwnedPatch[];
  visibleProgress: PatchProgress[];
  backpackLayout: PatchPlacement[];
  recentUnlocks: OwnedPatch[];
};

export type TravelerEventInput = {
  eventKey: TravelerEventKey;
  value?: number;
  uniqueKey?: string;
  idempotencyKey: string;
  context?: Record<string, unknown>;
  occurredAt?: string;
};

export const CATEGORY_LABELS: Record<PatchCategory, string> = {
  daily_rite: 'Daily Rite',
  pond_passport: 'Pond Passport',
  atlas_exploration: 'Atlas Exploration',
  community: 'Community Hall',
  milestone_relics: 'Milestone Relics',
  secret_discoveries: 'Secret Discoveries',
  seasonal: 'Seasonal',
  special: 'Special',
};

export const RARITY_LABELS: Record<PatchRarity, string> = {
  field: 'Field',
  keepsake: 'Keepsake',
  rare: 'Rare',
  mythic: 'Mythic',
  legend: 'Legend',
};

export const TIER_LABELS: Record<BackpackTier, string> = {
  wanderer: 'Wanderer',
  trailkeeper: 'Trailkeeper',
  pathfinder: 'Pathfinder',
  cartographer: 'Cartographer',
  relic_seeker: 'Relic Seeker',
  atlas_legend: 'Atlas Legend',
};

export function getBackpackTier(patchCount: number): BackpackTier {
  if (patchCount >= 75) return 'atlas_legend';
  if (patchCount >= 50) return 'relic_seeker';
  if (patchCount >= 30) return 'cartographer';
  if (patchCount >= 15) return 'pathfinder';
  if (patchCount >= 5) return 'trailkeeper';
  return 'wanderer';
}

export function getTierProgress(patchCount: number) {
  const thresholds = [0, 5, 15, 30, 50, 75];
  const currentIndex = thresholds.findLastIndex((value) => patchCount >= value);
  const current = thresholds[Math.max(0, currentIndex)];
  const next = thresholds[currentIndex + 1];

  if (next === undefined) {
    return { current, next: null, percentage: 100 };
  }

  return {
    current,
    next,
    percentage: Math.max(
      0,
      Math.min(100, ((patchCount - current) / (next - current)) * 100),
    ),
  };
}

export const DEFAULT_PATCH_POSITIONS: Array<Omit<PatchPlacement, 'patchId'>> = [
  { x: 31, y: 24, rotation: -7, scale: 0.92, zIndex: 4 },
  { x: 53, y: 21, rotation: 6, scale: 0.9, zIndex: 5 },
  { x: 67, y: 35, rotation: 8, scale: 0.86, zIndex: 6 },
  { x: 39, y: 39, rotation: -3, scale: 1.03, zIndex: 7 },
  { x: 58, y: 51, rotation: 4, scale: 0.96, zIndex: 8 },
  { x: 30, y: 57, rotation: -8, scale: 0.9, zIndex: 9 },
  { x: 47, y: 69, rotation: 2, scale: 0.93, zIndex: 10 },
  { x: 70, y: 68, rotation: 7, scale: 0.82, zIndex: 11 },
  { x: 21, y: 73, rotation: -5, scale: 0.8, zIndex: 12 },
];

export function buildDefaultLayout(patchIds: string[]): PatchPlacement[] {
  return patchIds.map((patchId, index) => {
    const base = DEFAULT_PATCH_POSITIONS[index % DEFAULT_PATCH_POSITIONS.length];
    const lap = Math.floor(index / DEFAULT_PATCH_POSITIONS.length);

    return {
      patchId,
      x: Math.max(10, Math.min(88, base.x + (lap % 3) * 4 - 3)),
      y: Math.max(12, Math.min(82, base.y + lap * 2)),
      rotation: base.rotation + (lap % 2 === 0 ? -2 : 2),
      scale: Math.max(0.58, base.scale - lap * 0.06),
      zIndex: base.zIndex + index,
    };
  });
}
