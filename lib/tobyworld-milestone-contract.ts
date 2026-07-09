import type { Address } from 'viem';

export const MILESTONE_RELICS_ADDRESS = process.env
  .NEXT_PUBLIC_MILESTONE_RELICS_ADDRESS as Address | undefined;

export const MILESTONE_CHAIN_ID = 8453 as const;

export const MILESTONE_EIP712_NAME = 'TobyworldMilestoneRelicsClean';
export const MILESTONE_EIP712_VERSION = '1';

export function getMilestoneChainName() {
  return 'Base';
}

export function getMilestoneBaseScanUrl(txHash: string) {
  return `https://basescan.org/tx/${txHash}`;
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
