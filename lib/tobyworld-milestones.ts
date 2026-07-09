export type TobyworldMilestone = {
  id: number;
  tokenId: number;
  title: string;
  shortTitle: string;
  threshold: number;
  symbol: string;
  imageSrc: string;
  description: string;
  lore: string;
  accent: 'red' | 'blue' | 'green' | 'gold';
};

export type EchoMultiplierInfo = {
  baseMultiplier: number;
  cap: number;
  echoPower: number;
  nextBaseMultiplierAt: number | null;
  nextCapAt: number | null;
  nextCap: number | null;
};

export const TOBYWORLD_MILESTONES = [
  {
    id: 1017,
    tokenId: 1017,
    title: 'Still-Water Echo',
    shortTitle: 'Still-Water',
    threshold: 1017,
    symbol: '△',
    imageSrc: '/images/milestones/still-water-echo.png',
    description:
      'The first community relic of Tobyworld. Unlocked when the pond reaches 1,017 weighted echoes.',
    lore: 'The red grain falls. The pond listens. The first echo becomes permanent.',
    accent: 'red',
  },
  {
    id: 7777,
    tokenId: 7777,
    title: 'Sevenfold Pond',
    shortTitle: 'Sevenfold',
    threshold: 7777,
    symbol: '🐸',
    imageSrc: '/images/milestones/sevenfold-pond.png',
    description:
      'A sevenfold pond relic. Unlocked when the community reaches 7,777 weighted echoes.',
    lore: 'Seven lights gather on still water. Toby remains at the center.',
    accent: 'blue',
  },
  {
    id: 185964,
    tokenId: 185964,
    title: 'Taboshi Bloom',
    shortTitle: 'Taboshi',
    threshold: 185964,
    symbol: '🍃',
    imageSrc: '/images/milestones/taboshi-bloom.png',
    description:
      'The bloom relic of the pond garden. Unlocked when the community reaches 185,964 weighted echoes.',
    lore: 'The leaf does not rush. It grows until the pond becomes a garden.',
    accent: 'green',
  },
  {
    id: 7777777,
    tokenId: 7777777,
    title: 'The Endless Gate',
    shortTitle: 'Gate',
    threshold: 7777777,
    symbol: '✦',
    imageSrc: '/images/milestones/endless-gate.png',
    description:
      'The final known gate relic. Unlocked when the community reaches 7,777,777 weighted echoes.',
    lore: 'The gate opens only when the pond has remembered almost everything.',
    accent: 'gold',
  },
] as const satisfies readonly TobyworldMilestone[];

export const STREAK_MULTIPLIER_TIERS = [
  { streak: 1, multiplier: 1 },
  { streak: 3, multiplier: 2 },
  { streak: 7, multiplier: 3 },
  { streak: 14, multiplier: 4 },
  { streak: 30, multiplier: 5 },
  { streak: 60, multiplier: 6 },
  { streak: 101, multiplier: 7 },
  { streak: 180, multiplier: 8 },
  { streak: 365, multiplier: 9 },
  { streak: 777, multiplier: 10 },
] as const;

export function formatMilestoneNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function getMilestoneProgress(totalEchoes: number, threshold: number) {
  const safeTotal = Math.max(0, totalEchoes);
  const percent = Math.min(100, (safeTotal / threshold) * 100);
  const remaining = Math.max(0, threshold - safeTotal);

  return {
    percent,
    remaining,
    unlocked: safeTotal >= threshold,
  };
}

export function getNextMilestone(totalEchoes: number) {
  return (
    TOBYWORLD_MILESTONES.find((milestone) => totalEchoes < milestone.threshold) ??
    TOBYWORLD_MILESTONES[TOBYWORLD_MILESTONES.length - 1]
  );
}

export function getMilestoneByTokenId(tokenId: number) {
  return TOBYWORLD_MILESTONES.find((milestone) => milestone.tokenId === tokenId) ?? null;
}

export function getBaseStreakMultiplier(streakCount: number) {
  const safeStreak = Math.max(1, Math.floor(streakCount));

  let multiplier = 1;

  for (const tier of STREAK_MULTIPLIER_TIERS) {
    if (safeStreak >= tier.streak) {
      multiplier = tier.multiplier;
    }
  }

  return multiplier;
}

export function getNextBaseMultiplierAt(streakCount: number) {
  const safeStreak = Math.max(1, Math.floor(streakCount));

  return STREAK_MULTIPLIER_TIERS.find((tier) => tier.streak > safeStreak)?.streak ?? null;
}

export function getCommunityMultiplierCap(totalEchoes: number) {
  const safeTotal = Math.max(0, Math.floor(totalEchoes));

  if (safeTotal >= 185964) return 10;
  if (safeTotal >= 7777) return 8;
  if (safeTotal >= 1017) return 6;

  return 3;
}

export function getNextMultiplierCap(totalEchoes: number) {
  const safeTotal = Math.max(0, Math.floor(totalEchoes));

  if (safeTotal < 1017) {
    return {
      nextCapAt: 1017,
      nextCap: 6,
    };
  }

  if (safeTotal < 7777) {
    return {
      nextCapAt: 7777,
      nextCap: 8,
    };
  }

  if (safeTotal < 185964) {
    return {
      nextCapAt: 185964,
      nextCap: 10,
    };
  }

  return {
    nextCapAt: null,
    nextCap: null,
  };
}

export function getRiteEchoMultiplier(streakCount: number, totalEchoes: number): EchoMultiplierInfo {
  const baseMultiplier = getBaseStreakMultiplier(streakCount);
  const cap = getCommunityMultiplierCap(totalEchoes);
  const echoPower = Math.min(baseMultiplier, cap);
  const { nextCapAt, nextCap } = getNextMultiplierCap(totalEchoes);

  return {
    baseMultiplier,
    cap,
    echoPower,
    nextBaseMultiplierAt: getNextBaseMultiplierAt(streakCount),
    nextCapAt,
    nextCap,
  };
}
