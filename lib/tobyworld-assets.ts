import type { Address } from 'viem';

export type TobyworldAssetId = 'toby' | 'patience' | 'taboshi';

export type TobyworldAssetDefinition = {
  id: TobyworldAssetId;
  name: string;
  symbol: string;
  address: Address;
  imageSrc: string;
  accent: 'blue' | 'red' | 'green';
  description: string;
  howItFits: string;
  links: ReadonlyArray<{ label: string; href: string }>;
};

/**
 * These addresses are carried forward from the existing Atlas v4 configuration.
 * Treat them as deployment configuration: verify each one against the official
 * Tobyworld source before enabling production wallet reads.
 */
export const TOBYWORLD_ASSETS = [
  {
    id: 'toby',
    name: 'Toby',
    symbol: '$TOBY',
    address: '0xb8D98a102b0079B69FFbc760C8d857A31653e56e' as Address,
    imageSrc: '/images/atlas/toby-pond-guardian.png',
    accent: 'blue',
    description: 'The fixed pond guardian at the center of the flywheel.',
    howItFits:
      'Toby is the stable center. The outer paths can move, but the pond stays still and receives every returning current.',
    links: [
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
      { label: 'Rune III', href: 'https://toadgod.xyz/rune3' },
      {
        label: 'BaseScan',
        href: 'https://basescan.org/token/0xb8D98a102b0079B69FFbc760C8d857A31653e56e',
      },
    ],
  },
  {
    id: 'patience',
    name: 'Patience',
    symbol: '$PATIENCE',
    address: '0x6D96f18F00B815B2109A3766E79F6A7aD7785624' as Address,
    imageSrc: '/images/atlas/patience-grain.png',
    accent: 'red',
    description: 'The red grain that starts the Still-Water ritual.',
    howItFits:
      'Patience is the quiet first movement: a grain lands, a ripple expands, and the pond is allowed to settle.',
    links: [
      { label: 'Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
      {
        label: 'BaseScan',
        href: 'https://basescan.org/token/0x6D96f18F00B815B2109A3766E79F6A7aD7785624',
      },
    ],
  },
  {
    id: 'taboshi',
    name: 'Taboshi',
    symbol: '$TABOSHI',
    address: '0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f' as Address,
    imageSrc: '/images/atlas/taboshi-leaf.png',
    accent: 'green',
    description: 'The leaf that tends the garden after stillness.',
    howItFits:
      'Taboshi is the growth bridge. It gives the world something to tend once the pond has become quiet.',
    links: [
      { label: 'Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
      {
        label: 'BaseScan',
        href: 'https://basescan.org/token/0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f',
      },
    ],
  },
] as const satisfies readonly TobyworldAssetDefinition[];

export const TOBYWORLD_ASSET_BY_ID = Object.fromEntries(
  TOBYWORLD_ASSETS.map((asset) => [asset.id, asset]),
) as Record<TobyworldAssetId, TobyworldAssetDefinition>;
