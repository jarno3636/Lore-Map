export type LoreFragment = {
  slug: string;
  title: string;
  rune: string;
  quote: string;
  description: string;
  sourceLabel: string;
  sourceUrl: string;
  accent: 'blue' | 'red' | 'green' | 'gold';
};

export const loreFragments: LoreFragment[] = [
  {
    slug: 'stillness-is-motion',
    title: 'Stillness Is Motion',
    rune: 'RUNE III · POND',
    quote: '“We move not by leaps. We move by stillness.”',
    description:
      'The pond is the beginning: a quiet center where conviction is expressed through time, not noise.',
    sourceLabel: 'Read the Rune III lore',
    sourceUrl: 'https://toadgod.xyz/rune3',
    accent: 'blue',
  },
  {
    slug: 'gather-the-fallen',
    title: 'Gather the Fallen',
    rune: '$TOBY · FOUNDATION',
    quote: '“Gather the fallen.”',
    description:
      '$TOBY is the central node of the atlas. Every path returns to the pond and the community it represents.',
    sourceLabel: 'Visit toadgod.xyz',
    sourceUrl: 'https://toadgod.xyz/',
    accent: 'blue',
  },
  {
    slug: 'the-still-water-garden',
    title: 'The Still-Water Garden',
    rune: '$PATIENCE · SEED',
    quote: '“A grain falls. One ripple sleeps.”',
    description:
      'Patience is planted rather than rushed. In the atlas, a held ritual gives the water time to reveal a lotus spore.',
    sourceLabel: 'Read the garden passage',
    sourceUrl: 'https://toadgod.xyz/rune3',
    accent: 'red',
  },
  {
    slug: 'leaves-and-rivers',
    title: 'Leaves and Rivers',
    rune: 'TABOSHI + SATO · TEND',
    quote: '“Roots reach bedrock. Rivers return.”',
    description:
      'Taboshi tends the plot while Sato carries the movement back through the world. The map renders both as one living loop.',
    sourceLabel: 'Read the flywheel passage',
    sourceUrl: 'https://toadgod.xyz/rune3',
    accent: 'green',
  },
  {
    slug: 'seed-of-glory',
    title: 'Seed of Glory',
    rune: 'RUNE IV · AWAITING',
    quote: '“Choose seed of glory, harvest gold.”',
    description:
      'The Gold Gate remains intentionally unresolved. It is a horizon in the atlas, not a promise or a reward screen.',
    sourceLabel: 'Read the closing lore',
    sourceUrl: 'https://toadgod.xyz/rune3',
    accent: 'gold',
  },
];

export const getLoreFragment = (slug: string) => loreFragments.find((fragment) => fragment.slug === slug);
