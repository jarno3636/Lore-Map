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
      'The first community relic of Tobyworld. Unlocked when the pond reaches 1,017 Daily Rite echoes.',
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
      'A sevenfold pond relic. Unlocked when the community reaches 7,777 Daily Rite echoes.',
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
      'The bloom relic of the pond garden. Unlocked when the community reaches 185,964 Daily Rite echoes.',
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
      'The final known gate relic. Unlocked when the community reaches 7,777,777 Daily Rite echoes.',
    lore: 'The gate opens only when the pond has remembered almost everything.',
    accent: 'gold',
  },
] as const satisfies readonly TobyworldMilestone[];

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
