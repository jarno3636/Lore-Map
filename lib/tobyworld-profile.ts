import type { TobyworldAssetId } from './tobyworld-assets';

export type AssetPresence = 'held' | 'not_detected';

export type TobyworldActivity = {
  stillWaterAwakened: boolean;
  gardenLeaves: 0 | 1 | 2 | 3;
  satoAwake: boolean;
  lorelandSeen: boolean;
};

export type TobyworldProfileInput = {
  displayName?: string;
  handle?: string;
  assets: Record<TobyworldAssetId, AssetPresence>;
  activity: TobyworldActivity;
};

export type TobyworldGeneratedProfile = {
  archetype: string;
  title: string;
  narrative: string;
  castText: string;
  tweetText: string;
  accent: 'blue' | 'red' | 'green' | 'gold';
};

export const EMPTY_ACTIVITY: TobyworldActivity = {
  stillWaterAwakened: false,
  gardenLeaves: 0,
  satoAwake: false,
  lorelandSeen: false,
};

export function sanitizePublicName(value: unknown, maxLength = 36): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .trim()
    .slice(0, maxLength);

  return normalized || undefined;
}

export function readAtlasActivity(): TobyworldActivity {
  if (typeof window === 'undefined') return EMPTY_ACTIVITY;

  try {
    const raw = window.localStorage.getItem('tobyworld-atlas-v4');
    if (!raw) return EMPTY_ACTIVITY;

    const stored = JSON.parse(raw) as {
      ritual?: 'dormant' | 'holding' | 'awakened';
      gardenLevel?: number;
      riverAwake?: boolean;
      lorelandSeen?: boolean;
    };

    const gardenLevel = Math.max(0, Math.min(3, Number(stored.gardenLevel ?? 0))) as 0 | 1 | 2 | 3;

    return {
      stillWaterAwakened: stored.ritual === 'awakened',
      gardenLeaves: gardenLevel,
      satoAwake: Boolean(stored.riverAwake),
      lorelandSeen: Boolean(stored.lorelandSeen),
    };
  } catch {
    return EMPTY_ACTIVITY;
  }
}

export function hasAnyAsset(input: TobyworldProfileInput): boolean {
  return Object.values(input.assets).some((state) => state === 'held');
}

export function createFallbackProfile(input: TobyworldProfileInput): TobyworldGeneratedProfile {
  const held = (Object.entries(input.assets) as Array<[TobyworldAssetId, AssetPresence]>)
    .filter(([, state]) => state === 'held')
    .map(([id]) => id);

  const hasThreePaths = held.length === 3;
  const hasStillness = input.activity.stillWaterAwakened;
  const hasGrowth = input.activity.gardenLeaves > 0;
  const hasReturn = input.activity.satoAwake;
  const name = input.displayName ? `${input.displayName}, ` : '';

  if (hasThreePaths && hasStillness && hasGrowth && hasReturn) {
    return {
      archetype: 'Flywheel Keeper',
      title: 'Keeper of the Returning Current',
      narrative: `${name}your pond is steady, the garden is tended, and the current knows its way home.`,
      castText:
        'My Tobyworld signal: Keeper of the Returning Current. Stillness planted, garden tended, current returning. 🐸🔺🍃🌀',
      tweetText:
        'Keeper of the Returning Current in Tobyworld. Stillness planted, garden tended, current returning. 🐸🔺🍃🌀',
      accent: 'gold',
    };
  }

  if (hasStillness && input.assets.patience === 'held') {
    return {
      archetype: 'Still-Water Walker',
      title: 'The Ripple That Waits',
      narrative: `${name}your signal favors patience over noise. The water has room to show what rises next.`,
      castText:
        'My Tobyworld signal: The Ripple That Waits. We move not by leaps. We move by stillness. 🔺🌊',
      tweetText:
        'The Ripple That Waits. In Tobyworld, stillness is part of the path. 🔺🌊',
      accent: 'red',
    };
  }

  if (hasGrowth && input.assets.taboshi === 'held') {
    return {
      archetype: 'Garden Tenders',
      title: 'Tender of Quiet Leaves',
      narrative: `${name}you are building outward from a steady pond—one leaf, one path, one season at a time.`,
      castText:
        'My Tobyworld signal: Tender of Quiet Leaves. Plant stillness. Tend the world. 🍃',
      tweetText:
        'Tender of Quiet Leaves in Tobyworld. Plant stillness. Tend the world. 🍃',
      accent: 'green',
    };
  }

  if (hasReturn || input.assets.toby === 'held') {
    return {
      archetype: 'Pond Guardian',
      title: 'Watcher of the Fixed Center',
      narrative: `${name}your signal returns to the pond: steady at the center while the wider world keeps moving.`,
      castText:
        'My Tobyworld signal: Watcher of the Fixed Center. The flywheel moves around the pond. 🐸',
      tweetText:
        'Watcher of the Fixed Center. The flywheel moves around the pond. 🐸',
      accent: 'blue',
    };
  }

  return {
    archetype: 'Pond Seeker',
    title: 'A Light at the Waterline',
    narrative: `${name}your atlas is open. The first path begins when you decide what kind of signal to follow.`,
    castText:
      'I opened my Tobyworld atlas. The pond is quiet, and the first path is waiting. 🐸',
    tweetText:
      'I opened my Tobyworld atlas. The pond is quiet, and the first path is waiting. 🐸',
    accent: 'blue',
  };
}

const forbiddenHoldingLanguage = [
  /(?:\$?toby|\$?patience|\$?taboshi).{0,32}\b\d+(?:[.,]\d+)?\b/i,
  /\b\d+(?:[.,]\d+)?\s*(?:\$?toby|\$?patience|\$?taboshi)\b/i,
  /\b(?:balance|holding amount|quantity|token count|wallet value|market value|portfolio value)\b/i,
  /\b(?:apy|apr|return(?:s)?|profit(?:s)?|price target|guaranteed)\b/i,
];

export function profileHasForbiddenHoldingLanguage(profile: TobyworldGeneratedProfile): boolean {
  const combined = [
    profile.archetype,
    profile.title,
    profile.narrative,
    profile.castText,
    profile.tweetText,
  ].join('\n');

  return forbiddenHoldingLanguage.some((pattern) => pattern.test(combined));
}

export function normalizeGeneratedProfile(value: unknown, fallback: TobyworldGeneratedProfile): TobyworldGeneratedProfile {
  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<TobyworldGeneratedProfile>;
  const accent = ['blue', 'red', 'green', 'gold'].includes(String(candidate.accent))
    ? (candidate.accent as TobyworldGeneratedProfile['accent'])
    : fallback.accent;

  const profile: TobyworldGeneratedProfile = {
    archetype: sanitizeText(candidate.archetype, 48) ?? fallback.archetype,
    title: sanitizeText(candidate.title, 72) ?? fallback.title,
    narrative: sanitizeText(candidate.narrative, 260) ?? fallback.narrative,
    castText: sanitizeText(candidate.castText, 280) ?? fallback.castText,
    tweetText: sanitizeText(candidate.tweetText, 260) ?? fallback.tweetText,
    accent,
  };

  return profileHasForbiddenHoldingLanguage(profile) ? fallback : profile;
}

function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

  return normalized || undefined;
}
