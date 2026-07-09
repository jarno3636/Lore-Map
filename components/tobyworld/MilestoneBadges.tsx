'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import {
  TOBYWORLD_MILESTONES,
  formatMilestoneNumber,
  getMilestoneProgress,
  type TobyworldMilestone,
} from '@/lib/tobyworld-milestones';
import {
  MILESTONE_CHAIN_ID,
  MILESTONE_RELICS_ABI,
  MILESTONE_RELICS_ADDRESS,
  getMilestoneBaseScanUrl,
  getMilestoneChainName,
} from '@/lib/tobyworld-milestone-contract';
import './milestone-badges.css';

type MilestoneWithProgress = TobyworldMilestone & {
  progress: {
    percent: number;
    remaining: number;
    unlocked: boolean;
  };
};

type MultiplierStatus = {
  cap: number;
  nextCapAt: number | null;
  nextCap: number | null;
};

type MilestonesResponse = {
  totalEchoes: number;
  totalRites?: number;
  nextMilestone: TobyworldMilestone;
  milestones: MilestoneWithProgress[];
  multiplier?: MultiplierStatus;
  error?: string;
};

type ClaimResponse = {
  ok?: boolean;
  error?: string;
  fid: number;
  to: `0x${string}`;
  tokenId: number;
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
  contractAddress: `0x${string}`;
  chainId: number;
  signerAddress?: `0x${string}`;
  expiresInSeconds?: number;
  totalEchoes?: number;
  totalRites?: number;
  userRiteCount?: number;
  userEchoPower?: number;
  userHighestEchoPower?: number;
  milestone?: {
    id?: number;
    tokenId?: number;
    title: string;
    threshold?: number;
    symbol: string;
    imageSrc: string;
  };
};

type QuickAuthFetch = typeof fetch;

type QuickAuthSdk = typeof sdk & {
  quickAuth?: {
    fetch?: QuickAuthFetch;
  };
};

const ZERO_BIGINT = BigInt(0);

function getOrigin() {
  if (typeof window === 'undefined') return 'https://toby-atlas.vercel.app';
  return window.location.origin;
}

function getApiUrl(path: string) {
  return `${getOrigin()}${path}`;
}

function getBoundQuickAuthFetch() {
  const quickAuth = (sdk as QuickAuthSdk).quickAuth;

  if (!quickAuth?.fetch) {
    return null;
  }

  return quickAuth.fetch.bind(quickAuth);
}

function getFallbackData(): MilestonesResponse {
  return {
    totalEchoes: 0,
    totalRites: 0,
    nextMilestone: TOBYWORLD_MILESTONES[0],
    multiplier: {
      cap: 3,
      nextCapAt: 1017,
      nextCap: 6,
    },
    milestones: TOBYWORLD_MILESTONES.map((milestone) => ({
      ...milestone,
      progress: getMilestoneProgress(0, milestone.threshold),
    })),
  };
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getCapCopy(multiplier?: MultiplierStatus) {
  if (!multiplier) {
    return 'Max 3x echo power active.';
  }

  if (!multiplier.nextCapAt || !multiplier.nextCap) {
    return `Max ${multiplier.cap}x echo power active. Final cap reached.`;
  }

  return `Max ${multiplier.cap}x echo power active. ${multiplier.nextCap}x opens at ${formatMilestoneNumber(
    multiplier.nextCapAt,
  )} weighted echoes.`;
}

function getRelicStatusCopy({
  claimed,
  locked,
  remaining,
  canReadBalances,
}: {
  claimed: boolean;
  locked: boolean;
  remaining: number;
  canReadBalances: boolean;
}) {
  if (claimed) return 'This wallet holds the relic.';
  if (locked) return `${formatMilestoneNumber(remaining)} weighted echoes remain.`;
  if (!canReadBalances) return 'Unlocked. Connect wallet to check claim status.';
  return 'Unlocked for eligible frogs.';
}

function toBigIntBalance(value: unknown) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.floor(value));
  if (typeof value === 'string' && value.trim()) return BigInt(value);

  return ZERO_BIGINT;
}

export function MilestoneBadges() {
  const [data, setData] = useState<MilestonesResponse>(() => getFallbackData());
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingTokenId, setPendingTokenId] = useState<number | null>(null);
  const [lastHash, setLastHash] = useState<`0x${string}` | undefined>();

  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: lastHash,
    chainId: MILESTONE_CHAIN_ID,
    query: {
      enabled: Boolean(lastHash),
    },
  });

  const totalEchoes = data.totalEchoes;
  const totalRites = data.totalRites ?? totalEchoes;
  const nextMilestone = data.nextMilestone;
  const chainName = getMilestoneChainName();
  const multiplierCap = data.multiplier?.cap ?? 3;

  const canReadBalances = Boolean(isConnected && address && MILESTONE_RELICS_ADDRESS);
  const isWrongChain = Boolean(isConnected && chainId && chainId !== MILESTONE_CHAIN_ID);
  const isBusy = isWriting || isConfirming;

  const nextProgress = useMemo(
    () => getMilestoneProgress(totalEchoes, nextMilestone.threshold),
    [nextMilestone.threshold, totalEchoes],
  );

  const balanceReadContracts = useMemo(() => {
    if (!canReadBalances || !address || !MILESTONE_RELICS_ADDRESS) return [];

    return data.milestones.map((milestone) => ({
      address: MILESTONE_RELICS_ADDRESS,
      abi: MILESTONE_RELICS_ABI,
      functionName: 'balanceOf' as const,
      args: [address, BigInt(milestone.tokenId)] as const,
      chainId: MILESTONE_CHAIN_ID,
    }));
  }, [address, canReadBalances, data.milestones]);

  const {
    data: balanceReads,
    refetch: refetchBalances,
    isFetching: isReadingBalances,
  } = useReadContracts({
    contracts: balanceReadContracts,
    query: {
      enabled: canReadBalances && balanceReadContracts.length > 0,
      refetchInterval: canReadBalances ? 20_000 : false,
    },
  });

  const claimedTokenIds = useMemo(() => {
    const claimed = new Set<number>();

    if (!canReadBalances || !Array.isArray(balanceReads)) {
      return claimed;
    }

    balanceReads.forEach((read, index) => {
      const tokenId = data.milestones[index]?.tokenId;

      if (!tokenId) return;
      if (!read || read.status !== 'success') return;
      if (typeof read.result === 'undefined' || read.result === null) return;

      const balance = toBigIntBalance(read.result);

      if (balance > ZERO_BIGINT) {
        claimed.add(tokenId);
      }
    });

    return claimed;
  }, [balanceReads, canReadBalances, data.milestones]);

  const fetchMilestones = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/tobyworld/milestones', {
        cache: 'no-store',
      });

      const nextData = (await response.json()) as MilestonesResponse;

      if (!response.ok) {
        throw new Error(nextData.error || 'Unable to read milestone tracker.');
      }

      setData(nextData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The relic tracker is resting.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMilestones();

    const interval = window.setInterval(() => {
      void fetchMilestones();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [fetchMilestones]);

  useEffect(() => {
    if (!isConfirmed || !receipt) return;

    setNotice('Relic claimed. The pond has written your mark onchain.');
    setPendingTokenId(null);

    void fetchMilestones();

    if (canReadBalances) {
      void refetchBalances();
    }
  }, [canReadBalances, fetchMilestones, isConfirmed, receipt, refetchBalances]);

  function connectWallet() {
    setNotice(null);

    const preferredConnector =
      connectors.find((connector) => /farcaster/i.test(connector.name)) ??
      connectors.find((connector) => /base|coinbase/i.test(connector.name)) ??
      connectors.find((connector) => /injected|metamask/i.test(connector.name)) ??
      connectors[0];

    if (!preferredConnector) {
      setNotice('No wallet connector found. Open this in Farcaster or a wallet browser.');
      return;
    }

    connect({ connector: preferredConnector });
  }

  async function handleClaim(milestone: MilestoneWithProgress) {
    setNotice(null);

    if (!MILESTONE_RELICS_ADDRESS) {
      setNotice('Relic contract address is missing.');
      return;
    }

    if (!address) {
      connectWallet();
      return;
    }

    if (isWrongChain) {
      switchChain({ chainId: MILESTONE_CHAIN_ID });
      return;
    }

    if (!milestone.progress.unlocked) {
      setNotice(
        `${milestone.title} is still locked. ${formatMilestoneNumber(
          milestone.progress.remaining,
        )} weighted echoes remain.`,
      );
      return;
    }

    if (claimedTokenIds.has(milestone.tokenId)) {
      setNotice('This wallet already holds that relic.');
      return;
    }

    const authFetch = getBoundQuickAuthFetch();

    if (!authFetch) {
      setNotice('Open this inside Farcaster to verify your Daily Rite before claiming.');
      return;
    }

    let sent = false;

    try {
      setPendingTokenId(milestone.tokenId);

      const response = await authFetch(getApiUrl('/api/tobyworld/milestone-claim'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: milestone.tokenId,
          walletAddress: address,
        }),
      });

      const claimData = (await response.json()) as ClaimResponse;

      if (!response.ok) {
        throw new Error(claimData.error || 'Unable to prepare claim.');
      }

      if (claimData.chainId !== MILESTONE_CHAIN_ID) {
        throw new Error('Claim voucher chain does not match your relic contract chain.');
      }

      if (
        claimData.contractAddress.toLowerCase() !==
        MILESTONE_RELICS_ADDRESS.toLowerCase()
      ) {
        throw new Error('Claim voucher contract does not match the configured relic contract.');
      }

      const hash = await writeContractAsync({
        address: MILESTONE_RELICS_ADDRESS,
        abi: MILESTONE_RELICS_ABI,
        functionName: 'claim',
        chainId: MILESTONE_CHAIN_ID,
        args: [
          claimData.to,
          BigInt(claimData.tokenId),
          BigInt(claimData.fid),
          BigInt(claimData.nonce),
          BigInt(claimData.deadline),
          claimData.signature,
        ],
      });

      sent = true;
      setLastHash(hash);
      setNotice(
        claimData.userEchoPower
          ? `Claim sent. Your latest echo power is ${claimData.userEchoPower}x. Confirming onchain…`
          : 'Claim sent. Confirming your relic onchain…',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The claim did not complete.');
    } finally {
      if (!sent) {
        setPendingTokenId(null);
      }
    }
  }

  return (
    <section className="milestone-relics" aria-label="Tobyworld milestone relic tracker">
      <div className="milestone-relics-glow" aria-hidden="true" />
      <div className="milestone-relics-ring milestone-relics-ring-one" aria-hidden="true" />
      <div className="milestone-relics-ring milestone-relics-ring-two" aria-hidden="true" />

      <header className="milestone-relics-header">
        <div>
          <p>MILESTONE RELICS</p>
          <h2>Echoes become relics.</h2>
          <span>
            Daily Rites now carry echo power. Streaks can make one rite count for more,
            and the community unlocks higher power caps together.
          </span>
        </div>

        <div className="milestone-wallet-panel">
          <small>RELIC GATE</small>

          {isConnected && address ? (
            <>
              <strong>{shortenAddress(address)}</strong>
              <span>{isWrongChain ? `Switch to ${chainName}` : chainName}</span>

              <div className="milestone-wallet-actions">
                {isWrongChain ? (
                  <button
                    type="button"
                    onClick={() => switchChain({ chainId: MILESTONE_CHAIN_ID })}
                    disabled={isSwitching}
                  >
                    {isSwitching ? 'Switching…' : `Switch to ${chainName}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (canReadBalances) void refetchBalances();
                    }}
                    disabled={!canReadBalances}
                  >
                    {isReadingBalances ? 'Reading…' : 'Refresh Relics'}
                  </button>
                )}

                <button type="button" onClick={() => disconnect()} className="ghost">
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <>
              <strong>Wallet needed</strong>
              <span>User pays gas to claim.</span>
              <button type="button" onClick={connectWallet} disabled={isConnecting}>
                {isConnecting ? 'Opening…' : 'Connect Wallet'}
              </button>
            </>
          )}
        </div>
      </header>

      <article className={`milestone-relics-hero accent-${nextMilestone.accent}`}>
        <div className="milestone-relics-hero-image">
          <img src={nextMilestone.imageSrc} alt="" aria-hidden="true" />
          <span>{nextMilestone.symbol}</span>
        </div>

        <div className="milestone-relics-hero-copy">
          <p>NEXT RELIC</p>
          <h3>{nextMilestone.title}</h3>
          <span>{nextMilestone.lore}</span>

          <div className="milestone-relics-progress-shell">
            <div className="milestone-relics-progress-topline">
              <strong>
                {formatMilestoneNumber(totalEchoes)} /{' '}
                {formatMilestoneNumber(nextMilestone.threshold)}
              </strong>
              <small>{Math.floor(nextProgress.percent)}%</small>
            </div>

            <div className="milestone-relics-progress-track">
              <i style={{ width: `${nextProgress.percent}%` }} />
            </div>

            <small>
              {nextProgress.unlocked
                ? 'Unlocked. Eligible frogs may claim.'
                : `${formatMilestoneNumber(nextProgress.remaining)} weighted echoes remain.`}
            </small>

            <div className="milestone-multiplier-strip">
              <span>
                <b>{multiplierCap}x</b>
                current max power
              </span>

              <span>
                <b>{formatMilestoneNumber(totalRites)}</b>
                rites completed
              </span>

              <span>
                <b>{data.multiplier?.nextCap ? `${data.multiplier.nextCap}x` : 'MAX'}</b>
                {data.multiplier?.nextCapAt
                  ? `opens at ${formatMilestoneNumber(data.multiplier.nextCapAt)}`
                  : 'cap reached'}
              </span>
            </div>
          </div>

          <div className="milestone-power-note">
            <span>✦</span>
            <p>{getCapCopy(data.multiplier)}</p>
          </div>
        </div>
      </article>

      <div className="milestone-relics-grid">
        {data.milestones.map((milestone) => {
          const claimed = claimedTokenIds.has(milestone.tokenId);
          const claiming = pendingTokenId === milestone.tokenId || isBusy;
          const locked = !milestone.progress.unlocked;
          const statusCopy = getRelicStatusCopy({
            claimed,
            locked,
            remaining: milestone.progress.remaining,
            canReadBalances,
          });

          return (
            <article
              className={`milestone-relic-card accent-${milestone.accent} ${
                milestone.progress.unlocked ? 'is-unlocked' : 'is-locked'
              } ${claimed ? 'is-claimed' : ''}`}
              key={milestone.id}
            >
              <div className="milestone-relic-card-image">
                <img src={milestone.imageSrc} alt={milestone.title} />
                <span>{claimed ? '✓' : milestone.symbol}</span>
              </div>

              <div className="milestone-relic-card-copy">
                <p>
                  {claimed ? 'CLAIMED RELIC' : locked ? 'LOCKED RELIC' : 'CLAIMABLE RELIC'}
                </p>
                <h3>{milestone.title}</h3>
                <span>{milestone.description}</span>
              </div>

              <div className="milestone-relic-card-progress">
                <div>
                  <strong>
                    {formatMilestoneNumber(totalEchoes)} /{' '}
                    {formatMilestoneNumber(milestone.threshold)}
                  </strong>
                  <small>{statusCopy}</small>
                </div>

                <div className="milestone-relic-mini-track">
                  <i style={{ width: `${milestone.progress.percent}%` }} />
                </div>
              </div>

              <button
                type="button"
                disabled={locked || claimed || claiming}
                onClick={() => void handleClaim(milestone)}
              >
                {claimed
                  ? 'Claimed'
                  : claiming && pendingTokenId === milestone.tokenId
                    ? 'Claiming…'
                    : locked
                      ? 'Locked'
                      : isWrongChain
                        ? `Switch to ${chainName}`
                        : address
                          ? 'Claim Relic'
                          : 'Connect to Claim'}
              </button>
            </article>
          );
        })}
      </div>

      {notice && (
        <p className="milestone-relics-notice" role="status">
          {notice}
        </p>
      )}

      {lastHash && (
        <a
          className="milestone-relics-tx"
          href={getMilestoneBaseScanUrl(lastHash)}
          target="_blank"
          rel="noreferrer"
        >
          View latest relic transaction ↗
        </a>
      )}
    </section>
  );
}
