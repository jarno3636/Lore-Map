export type TobyworldSwapToken = {
  id: 'toby' | 'taboshi' | 'patience';
  name: string;
  symbol: string;
  loreName: string;
  address: `0x${string}`;
  caip19Id: string;
  imageSrc: string;
  accent: 'blue' | 'green' | 'red';
  eyebrow: string;
  description: string;
  role: string;
  tokenDetailsUrl: string;
};

export const BASE_NATIVE_TOKEN_CAIP19 = 'eip155:8453/native';

function getBaseErc20Caip19(address: `0x${string}`) {
  return `eip155:8453/erc20:${address}`;
}

export const TOBYWORLD_SWAP_TOKENS = [
  {
    id: 'toby',
    name: 'Toby',
    symbol: '$toby',
    loreName: 'The Pond Guardian',
    address: '0xb8d98a102b0079b69ffbc760c8d857a31653e56e',
    caip19Id: getBaseErc20Caip19('0xb8d98a102b0079b69ffbc760c8d857a31653e56e'),
    imageSrc: '/images/atlas/toby-pond-guardian.png',
    accent: 'blue',
    eyebrow: 'POND CENTER',
    description: 'The blue frog at the center of Tobyworld. Stillness, memory, and return.',
    role: 'The pond remembers.',
    tokenDetailsUrl:
      'https://basescan.org/token/0xb8d98a102b0079b69ffbc760c8d857a31653e56e',
  },
  {
    id: 'taboshi',
    name: 'Taboshi',
    symbol: '$Taboshi',
    loreName: 'The Leaf Bloom',
    address: '0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f',
    caip19Id: getBaseErc20Caip19('0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f'),
    imageSrc: '/images/atlas/taboshi-leaf.png',
    accent: 'green',
    eyebrow: 'LEAF GARDEN',
    description: 'The rare bloom of the pond. Growth, patience, and the garden path.',
    role: 'The leaf grows quietly.',
    tokenDetailsUrl:
      'https://basescan.org/token/0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f',
  },
  {
    id: 'patience',
    name: 'Patience',
    symbol: '$Patience',
    loreName: 'The Red Grain',
    address: '0x6D96f18F00B815B2109A3766E79F6A7aD7785624',
    caip19Id: getBaseErc20Caip19('0x6D96f18F00B815B2109A3766E79F6A7aD7785624'),
    imageSrc: '/images/atlas/patience-grain.png',
    accent: 'red',
    eyebrow: 'RED GRAIN',
    description: 'The first ripple. The red triangle. The discipline before the bloom.',
    role: 'The grain falls first.',
    tokenDetailsUrl:
      'https://basescan.org/token/0x6D96f18F00B815B2109A3766E79F6A7aD7785624',
  },
] as const satisfies readonly TobyworldSwapToken[];

export function getSushiSwapUrl(token: TobyworldSwapToken) {
  const url = new URL('https://www.sushi.com/base/swap');

  url.searchParams.set('token0', 'NATIVE');
  url.searchParams.set('token1', token.address);

  return url.toString();
}
