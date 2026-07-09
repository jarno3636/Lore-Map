import type { Address } from 'viem';

export type MilestoneChainId = 8453 | 84532;

function parseMilestoneChainId(): MilestoneChainId {
  const rawChainId = process.env.NEXT_PUBLIC_MILESTONE_CHAIN_ID;

  if (rawChainId === '84532') return 84532;
  if (rawChainId === '8453') return 8453;

  return 84532;
}

export const MILESTONE_RELICS_ADDRESS = process.env
  .NEXT_PUBLIC_MILESTONE_RELICS_ADDRESS as Address | undefined;

export const MILESTONE_CHAIN_ID = parseMilestoneChainId();

export const MILESTONE_EIP712_NAME = 'TobyworldMilestoneRelicsClean';
export const MILESTONE_EIP712_VERSION = '1';

export function getMilestoneChainName(chainId: MilestoneChainId = MILESTONE_CHAIN_ID) {
  if (chainId === 8453) return 'Base';
  return 'Base Sepolia';
}

export function getMilestoneBaseScanUrl(txHash: string) {
  const subdomain = MILESTONE_CHAIN_ID === 84532 ? 'sepolia.' : '';

  return `https://${subdomain}basescan.org/tx/${txHash}`;
}

export const MILESTONE_RELICS_ABI = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'fid', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'hasClaimedByFid',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'fid', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'hasClaimedByWallet',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'wallet', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'validTokenId',
    stateMutability: 'pure',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'uri',
    stateMutability: 'pure',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'claimSigner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
