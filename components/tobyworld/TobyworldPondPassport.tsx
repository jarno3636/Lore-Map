'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSignMessage,
} from 'wagmi';
import { TOBYWORLD_SWAP_TOKENS } from '@/lib/tobyworld-swap-tokens';
import './tobyworld-pond-passport.css';

type PondPersona = {
  title: string;
  characteristic: string;
  strangeHabit: string;
  pondWarning: string;
  stamp: string;
  shareText: string;
};

type PassportSnapshot = {
  fid: number;
  username: string | null;
  displayName: string | null;
  currentMark: string;
  streakCount: number;
  bestStreak: number;
  totalCompletions: number;
  currentEchoPower: number;
  highestEchoPower: number;
  totalEchoes: number;
  totalRites: number;
};

type PassportResponse = {
  ok?: boolean;
  error?: string;
  fid?: number;
  persona?: PondPersona;
  snapshot?: PassportSnapshot;
  source?: string;
  generatedOn?: string;
  limits?: {
    rerollsRemaining: number;
    cooldownSeconds: number;
  };
};

type MiniAppUserContext = {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
};

type MiniAppContext = {
  user?: MiniAppUserContext;
};

type QuickAuthFetch = typeof fetch;

type PassportSdk = typeof sdk & {
  context?: MiniAppContext | Promise<MiniAppContext>;
  isInMiniApp?: () => boolean | Promise<boolean>;
  quickAuth?: {
    fetch?: QuickAuthFetch;
  };
  actions?: {
    composeCast?: (params: {
      text: string;
      embeds?: string[];
    }) => Promise<void> | void;
    openUrl?: (url: string) => Promise<void> | void;
  };
};

type WalletSupportResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  alreadySupportedToday?: boolean;
  heldAssets?: Array<{
    id: string;
    symbol: string;
  }>;
};

type PassportShareCreateResponse = {
  ok?: boolean;
  id?: string;
  shareUrl?: string;
  imageUrl?: string;
  error?: string;
};

type TobyworldAsset = (typeof TOBYWORLD_SWAP_TOKENS)[number];

type FileShareData = {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
};

type FileShareNavigator = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const BASE_CHAIN_ID = 8453 as const;
const REQUIRED_ASSET_COUNT = 2;
const TOTAL_ASSET_COUNT = 3;

const PASSPORT_FROG_BACKUPS = [
  '/images/passport/frog-lily-agent.png',
  '/images/passport/frog-detective-mustache.png',
  '/images/passport/frog-moon-wizard.png',
  '/images/passport/frog-leaf-scout.png',
  '/images/passport/frog-top-hat-gentleman.png',
];

const WALLET_TITLES = [
  'Wallet Pond Inspector',
  'Two-Asset Tadpole With Papers',
  'Certified Ripple Supporter',
  'Suspiciously Official Pond Visitor',
  'Base Pond Stamp Holder',
  'Unpaid Intern of the Lily Desk',
];

const WALLET_CHARACTERISTICS = [
  'Signed one harmless message and immediately became part of the pond bureaucracy.',
  'Carries enough Tobyworld energy to make the passport desk nod respectfully.',
  'Supports the rite without asking why the frog has a clipboard.',
  'Holds the required pond artifacts and now expects travel privileges.',
  'Arrived by wallet, passed the vibe check, and received questionable clearance.',
];

const WALLET_HABITS = [
  'Checks token balances like a frog checking pockets before a road trip.',
  'Signs messages with the confidence of someone who read at least half the warning.',
  'Keeps two pond artifacts nearby in case paperwork appears.',
  'Pretends this is normal web behavior. It is not. It is pond behavior.',
];

const WALLET_WARNINGS = [
  'May attempt to explain the passport desk to normal people.',
  'Do not let this wallet near unattended lily pads.',
  'Approved for pond entry, but still under frog observation.',
  'No gas was spent, but dignity may have been lightly stamped.',
];

function getPublicOrigin() {
  const envOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envOrigin) {
    return envOrigin.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'https://toby-atlas.vercel.app';
}

function getBoundQuickAuthFetch() {
  const quickAuth = (sdk as PassportSdk).quickAuth;

  if (!quickAuth?.fetch) return null;

  return quickAuth.fetch.bind(quickAuth);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function compactText(value: string, maxLength: number) {
  const clean = value.trim().replace(/\s+/g, ' ');

  if (clean.length <= maxLength) return clean;

  return `${clean
    .slice(0, Math.max(0, maxLength - 1))
    .trim()}…`;
}

function getDisplayName(
  snapshot?: PassportSnapshot,
  contextUser?: MiniAppUserContext | null,
  address?: string,
) {
  if (contextUser?.displayName) return contextUser.displayName;
  if (snapshot?.displayName) return snapshot.displayName;
  if (contextUser?.username) return contextUser.username;
  if (snapshot?.username) return snapshot.username;
  if (snapshot?.fid) return `FID ${snapshot.fid}`;
  if (address) return shortenAddress(address);

  return 'Unstamped Frog';
}

function getHandle(
  snapshot?: PassportSnapshot,
  contextUser?: MiniAppUserContext | null,
  address?: string,
) {
  const username =
    contextUser?.username ||
    snapshot?.username;

  if (username) return `@${username}`;
  if (address) return 'Wallet supporter';

  return 'Tobyworld traveler';
}

function getIssuedDate(value?: string) {
  if (!value) return 'Pending';

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function getSourceLabel(
  source?: string,
  isFarcasterSession = false,
) {
  if (!source) return 'Not loaded';
  if (source === 'gemini') return 'AI stamp';

  if (source === 'wallet') {
    return isFarcasterSession
      ? 'Wallet echo'
      : 'Wallet stamp';
  }

  if (source.startsWith('fallback')) {
    return 'Local stamp';
  }

  return 'Pond stamp';
}

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildWalletSupportMessage(address: string) {
  return [
    'Tobyworld Pond Passport',
    '',
    "I am supporting today's pond rite.",
    '',
    `Wallet: ${address}`,
    `Date: ${getTodayUtcDate()}`,
    `Domain: ${window.location.host}`,
    '',
    'No gas. No transaction. No token approval.',
  ].join('\n');
}

function isValidHexSignature(
  value: unknown,
): value is `0x${string}` {
  if (typeof value !== 'string') {
    return false;
  }

  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    return false;
  }

  /*
   * Smart account signatures may be longer than standard EOA signatures.
   */
  return value.length > 2 && value.length % 2 === 0;
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pick<T>(
  items: readonly T[],
  seed: number,
) {
  return items[Math.abs(seed) % items.length];
}

function createWalletSupporterPersona(
  address: string,
  heldAssets: TobyworldAsset[],
): PondPersona {
  const heldSymbols =
    heldAssets.length > 0
      ? heldAssets
          .map((asset) => asset.symbol)
          .join(' + ')
      : 'Pond Assets';

  const seed = hashText(
    `${address}:${heldSymbols}:${getTodayUtcDate()}`,
  );

  const title = pick(WALLET_TITLES, seed);
  const characteristic = pick(
    WALLET_CHARACTERISTICS,
    seed >> 3,
  );
  const strangeHabit = pick(
    WALLET_HABITS,
    seed >> 6,
  );
  const pondWarning = pick(
    WALLET_WARNINGS,
    seed >> 9,
  );
  const stamp = pick(
    [
      '△ · 🐸 · 🍃',
      '🐸 · ⇄ · ✦',
      '🍃 · 🐸 · 🪪',
      '✦ · 🐸 · △',
    ],
    seed >> 12,
  );

  return {
    title,
    characteristic,
    strangeHabit,
    pondWarning,
    stamp,
    shareText:
      `My Tobyworld Pond Passport has been stamped: ${title}. ` +
      `Held path: ${heldSymbols}. ` +
      `The pond remains professionally concerned. ${stamp}`,
  };
}

function createWalletSupporterSnapshot(
  address: string,
): PassportSnapshot {
  return {
    fid: 0,
    username: null,
    displayName: `Wallet ${shortenAddress(address)}`,
    currentMark: 'Wallet Supporter',
    streakCount: 1,
    bestStreak: 1,
    totalCompletions: 1,
    currentEchoPower: 1,
    highestEchoPower: 1,
    totalEchoes: 0,
    totalRites: 1,
  };
}

function getPassportStateLabel({
  isConnected,
  isCheckingAssets,
  isLoading,
  isRerolling,
  data,
  hasEnoughAssets,
  assetCount,
}: {
  isConnected: boolean;
  isCheckingAssets: boolean;
  isLoading: boolean;
  isRerolling: boolean;
  data: PassportResponse | null;
  hasEnoughAssets: boolean;
  assetCount: number;
}) {
  if (!isConnected) return 'Wallet available';
  if (isCheckingAssets) return 'Checking wallet assets…';
  if (isLoading) return 'Loading passport…';
  if (isRerolling) return 'Rerolling stamp…';

  if (!hasEnoughAssets) {
    return `${assetCount}/${REQUIRED_ASSET_COUNT} assets detected`;
  }

  if (data?.persona) {
    if (data.source === 'wallet') {
      return 'Loaded · Wallet supporter stamp';
    }

    const rerolls =
      data.limits?.rerollsRemaining ?? 0;

    return `Loaded · ${rerolls} reroll${
      rerolls === 1 ? '' : 's'
    } left`;
  }

  return 'Ready for pond stamp';
}

function toBigIntBalance(value: unknown) {
  if (typeof value === 'bigint') {
    return value;
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return BigInt(Math.floor(value));
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return BigInt(value);
  }

  return BigInt(0);
}

function pickBackupFrogImage(
  seed: string | number | undefined,
) {
  const value = String(seed ?? 'pond');
  const hash = hashText(value);

  return PASSPORT_FROG_BACKUPS[
    Math.abs(hash) %
      PASSPORT_FROG_BACKUPS.length
  ];
}

function getRenderedMark(
  snapshot?: PassportSnapshot,
) {
  if (
    snapshot?.currentMark === 'Web Supporter'
  ) {
    return 'Pond Supporter';
  }

  return (
    snapshot?.currentMark ??
    'Unstamped Frog'
  );
}

function getDynamicPassportCastText({
  persona,
  snapshot,
  contextUser,
  address,
  heldAssets,
  source,
}: {
  persona: PondPersona;
  snapshot?: PassportSnapshot;
  contextUser: MiniAppUserContext | null;
  address?: string;
  heldAssets: TobyworldAsset[];
  source?: string;
}) {
  const name = getDisplayName(
    snapshot,
    contextUser,
    address,
  );

  const handle = getHandle(
    snapshot,
    contextUser,
    address,
  );

  const heldPath =
    heldAssets.length > 0
      ? heldAssets
          .map((asset) => asset.symbol)
          .join(' + ')
      : 'pond path';

  const stats =
    source === 'wallet'
      ? `Wallet Supporter · ${heldPath}`
      : `${formatNumber(
          snapshot?.streakCount,
        )}d streak · ${formatNumber(
          snapshot?.currentEchoPower,
        )}x echo power`;

  return [
    `${name} received a Tobyworld Pond Passport.`,
    '',
    `Title: ${persona.title}`,
    `Trait: ${persona.characteristic}`,
    '',
    `${handle} · ${stats}`,
    '',
    'The pond remains professionally concerned.',
  ].join('\n');
}

function isFarcasterConnector(
  connector: {
    id: string;
    name: string;
  },
) {
  return /farcaster|miniapp|mini-app/i.test(
    `${connector.id} ${connector.name}`,
  );
}

function getConnectorPriority(
  connector: {
    id: string;
    name: string;
  },
  isMiniApp: boolean,
) {
  const identity =
    `${connector.id} ${connector.name}`.toLowerCase();

  if (
    isMiniApp &&
    /farcaster|miniapp|mini-app/.test(identity)
  ) {
    return 0;
  }

  if (
    /injected|metamask|rabby|rainbow/.test(
      identity,
    )
  ) {
    return 1;
  }

  if (
    /baseaccount|base account|coinbase|smart wallet/.test(
      identity,
    )
  ) {
    return 2;
  }

  if (
    /walletconnect|wallet connect/.test(
      identity,
    )
  ) {
    return 3;
  }

  return 4;
}

function getConnectorLabel(
  connector: {
    id: string;
    name: string;
  },
) {
  const identity =
    `${connector.id} ${connector.name}`.toLowerCase();

  if (/farcaster|miniapp|mini-app/.test(identity)) {
    return 'Farcaster Wallet';
  }

  if (/baseaccount|base account/.test(identity)) {
    return 'Base Account';
  }

  if (/walletconnect|wallet connect/.test(identity)) {
    return 'WalletConnect';
  }

  if (/injected/.test(identity)) {
    return 'Browser Wallet';
  }

  return connector.name;
}

async function copyText(value: string) {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard
  ) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

async function openExternalUrl(url: string) {
  const openUrl =
    (sdk as PassportSdk).actions?.openUrl;

  if (openUrl) {
    await Promise.resolve(openUrl(url));
    return true;
  }

  const opened = window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );

  return Boolean(opened);
}

export function TobyworldPondPassport() {
  const [data, setData] =
    useState<PassportResponse | null>(null);

  const [contextUser, setContextUser] =
    useState<MiniAppUserContext | null>(null);

  const [isMiniApp, setIsMiniApp] =
    useState(false);

  const [hasCheckedMiniApp, setHasCheckedMiniApp] =
    useState(false);

  const [heldAssets, setHeldAssets] =
    useState<TobyworldAsset[]>([]);

  const [isCheckingAssets, setIsCheckingAssets] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isRerolling, setIsRerolling] =
    useState(false);

  const [isSupporting, setIsSupporting] =
    useState(false);

  const [isCreatingImage, setIsCreatingImage] =
    useState(false);

  const [isCreatingShare, setIsCreatingShare] =
    useState(false);

  const [connectingConnectorId, setConnectingConnectorId] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState<string | null>(null);

  const [freshInkKey, setFreshInkKey] =
    useState(0);

  const [pfpFailed, setPfpFailed] =
    useState(false);

  const [frogImageFailed, setFrogImageFailed] =
    useState(false);

  const {
    address,
    isConnected,
  } = useAccount();

  const {
    connectors,
    connectAsync,
    isPending: isConnecting,
  } = useConnect();

  const { disconnect } = useDisconnect();

  const {
    signMessageAsync,
    isPending: isSigning,
  } = useSignMessage();

  const publicClient = usePublicClient({
    chainId: BASE_CHAIN_ID,
  });

  const persona = data?.persona;
  const snapshot = data?.snapshot;

  const hasQuickAuth =
    Boolean(getBoundQuickAuthFetch());

  const hasFarcasterProfile =
    Boolean(
      contextUser?.fid ||
        (snapshot?.fid && snapshot.fid > 0),
    );

  const canUseFarcasterPassport =
    Boolean(
      hasCheckedMiniApp &&
        isMiniApp &&
        contextUser?.fid &&
        hasQuickAuth,
    );

  const isFarcasterSession =
    Boolean(
      isMiniApp ||
        hasFarcasterProfile ||
        canUseFarcasterPassport,
    );

  const fallbackFrogImage =
    pickBackupFrogImage(
      snapshot?.fid || address,
    );

  const pfpUrl =
    !pfpFailed
      ? contextUser?.pfpUrl
      : undefined;

  const photoSrc =
    pfpUrl ||
    (!frogImageFailed
      ? fallbackFrogImage
      : undefined);

  /*
   * Keep share-image photos on your own domain.
   * This avoids external PFP fetch failures in ImageResponse.
   */
  const sharePhotoSrc =
    !frogImageFailed
      ? fallbackFrogImage
      : undefined;

  const assetCount = heldAssets.length;
  const hasEnoughAssets =
    assetCount >= REQUIRED_ASSET_COUNT;

  const canUsePassport =
    Boolean(
      isConnected &&
        address &&
        hasEnoughAssets,
    );

  const renderedMark =
    getRenderedMark(snapshot);

  const availableConnectors = useMemo(() => {
    const seen = new Set<string>();

    return connectors
      .filter((connector) => {
        if (
          !isMiniApp &&
          isFarcasterConnector(connector)
        ) {
          return false;
        }

        const key =
          `${connector.id}:${connector.name}`;

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort(
        (left, right) =>
          getConnectorPriority(left, isMiniApp) -
          getConnectorPriority(right, isMiniApp),
      );
  }, [connectors, isMiniApp]);

  const stats = useMemo(
    () => [
      {
        label: 'Streak',
        value: `${formatNumber(
          snapshot?.streakCount,
        )}d`,
      },
      {
        label: 'Best',
        value: `${formatNumber(
          snapshot?.bestStreak,
        )}d`,
      },
      {
        label: 'Rites',
        value: formatNumber(
          snapshot?.totalCompletions,
        ),
      },
      {
        label: 'Power',
        value: `${formatNumber(
          snapshot?.currentEchoPower,
        )}x`,
      },
    ],
    [snapshot],
  );

  const statusLabel =
    getPassportStateLabel({
      isConnected,
      isCheckingAssets,
      isLoading,
      isRerolling,
      data,
      hasEnoughAssets,
      assetCount,
    });

  const checkWalletAssets =
    useCallback(async () => {
      if (
        !isConnected ||
        !address ||
        !publicClient
      ) {
        setHeldAssets([]);
        setIsCheckingAssets(false);
        return;
      }

      setIsCheckingAssets(true);

      try {
        const results =
          await Promise.allSettled(
            TOBYWORLD_SWAP_TOKENS.map(
              async (token) => {
                const balance =
                  await publicClient.readContract({
                    address: token.address,
                    abi: ERC20_BALANCE_ABI,
                    functionName: 'balanceOf',
                    args: [address],
                  });

                return {
                  token,
                  balance,
                };
              },
            ),
          );

        const nextHeldAssets = results
          .map((result) => {
            if (
              result.status !== 'fulfilled'
            ) {
              return null;
            }

            const balance =
              toBigIntBalance(
                result.value.balance,
              );

            if (balance <= BigInt(0)) {
              return null;
            }

            return result.value.token;
          })
          .filter(
            (
              token,
            ): token is TobyworldAsset =>
              token !== null,
          );

        setHeldAssets(nextHeldAssets);
      } catch (error) {
        console.error(
          'Passport wallet asset check failed:',
          error,
        );

        setHeldAssets([]);
      } finally {
        setIsCheckingAssets(false);
      }
    }, [
      address,
      isConnected,
      publicClient,
    ]);

  const loadMiniAppContext =
    useCallback(async () => {
      try {
        const passportSdk =
          sdk as PassportSdk;

        if (passportSdk.isInMiniApp) {
          const miniAppResult =
            await Promise.resolve(
              passportSdk.isInMiniApp(),
            );

          setIsMiniApp(
            Boolean(miniAppResult),
          );
        }

        const context =
          await Promise.resolve(
            passportSdk.context,
          );

        if (context?.user) {
          setContextUser(context.user);
          setIsMiniApp(true);
        }
      } catch (error) {
        console.warn(
          'Passport Mini App context unavailable:',
          error,
        );

        setContextUser(null);
      } finally {
        setHasCheckedMiniApp(true);
      }
    }, []);

  const connectWallet =
    useCallback(
      async (
        requestedConnectorId?: string,
      ) => {
        setNotice(null);

        if (
          availableConnectors.length === 0
        ) {
          setNotice(
            'Wallet connectors are still loading. Wait a moment and try again.',
          );
          return;
        }

        const requestedConnector =
          requestedConnectorId
            ? availableConnectors.find(
                (connector) =>
                  connector.id ===
                  requestedConnectorId,
              )
            : undefined;

        const preferredConnector =
          requestedConnector ??
          availableConnectors[0];

        if (!preferredConnector) {
          setNotice(
            'No compatible wallet connector is available.',
          );
          return;
        }

        try {
          setConnectingConnectorId(
            preferredConnector.id,
          );

          await connectAsync({
            connector: preferredConnector,
            chainId: BASE_CHAIN_ID,
          });

          setNotice(
            `Connected with ${getConnectorLabel(
              preferredConnector,
            )}. Checking Tobyworld assets…`,
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Wallet connection was cancelled or failed.';

          setNotice(message);
        } finally {
          setConnectingConnectorId(null);
        }
      },
      [
        availableConnectors,
        connectAsync,
      ],
    );

  const fetchPassport =
    useCallback(
      async (reroll = false) => {
        const authFetch =
          getBoundQuickAuthFetch();

        if (!isConnected || !address) {
          setNotice(
            'Connect a wallet that holds at least two Tobyworld assets to stamp a passport.',
          );

          await connectWallet();
          return;
        }

        if (!hasEnoughAssets) {
          setNotice(
            `Passport locked. This wallet currently holds ${assetCount}/${REQUIRED_ASSET_COUNT} required Tobyworld assets.`,
          );
          return;
        }

        if (
          !authFetch ||
          !canUseFarcasterPassport
        ) {
          setNotice(
            'Your wallet passed the gate. Use Wallet Support to add an echo and stamp a wallet passport.',
          );
          return;
        }

        const previousTitle =
          data?.persona?.title;

        setNotice(null);
        setImagePreviewUrl(null);

        if (reroll) {
          setIsRerolling(true);
        } else {
          setIsLoading(true);
        }

        try {
          const response =
            await authFetch(
              `${getPublicOrigin()}/api/tobyworld/pond-passport`,
              {
                method: reroll
                  ? 'POST'
                  : 'GET',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                cache: 'no-store',
              },
            );

          const nextData =
            (await response.json()) as PassportResponse;

          if (!response.ok) {
            throw new Error(
              nextData.error ||
                'The pond refused to stamp the passport.',
            );
          }

          setData(nextData);
          setFreshInkKey(
            (value) => value + 1,
          );

          if (reroll) {
            const nextTitle =
              nextData.persona?.title;

            setNotice(
              nextTitle &&
                nextTitle !== previousTitle
                ? `New stamp loaded: ${nextTitle}.`
                : 'Passport rerolled. The pond may have kept one detail because it liked it.',
            );
          } else {
            setNotice(
              nextData.persona
                ? 'Passport loaded.'
                : null,
            );
          }
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : 'The passport ink ran.',
          );
        } finally {
          setIsLoading(false);
          setIsRerolling(false);
        }
      },
      [
        address,
        assetCount,
        canUseFarcasterPassport,
        connectWallet,
        data?.persona?.title,
        hasEnoughAssets,
        isConnected,
      ],
    );

  useEffect(() => {
    void loadMiniAppContext();
  }, [loadMiniAppContext]);

  useEffect(() => {
    void checkWalletAssets();

    if (
      !isConnected ||
      !address
    ) {
      return undefined;
    }

    const interval =
      window.setInterval(() => {
        void checkWalletAssets();
      }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    address,
    checkWalletAssets,
    isConnected,
  ]);

  useEffect(() => {
    if (!canUseFarcasterPassport) {
      return;
    }

    if (
      !canUsePassport ||
      data?.persona
    ) {
      return;
    }

    void fetchPassport(false);
  }, [
    canUseFarcasterPassport,
    canUsePassport,
    data?.persona,
    fetchPassport,
  ]);

  async function supportRiteWithWallet() {
    if (!address || !isConnected) {
      await connectWallet();
      return;
    }

    if (!hasEnoughAssets) {
      setNotice(
        `Wallet support is locked. This wallet currently holds ${assetCount}/${REQUIRED_ASSET_COUNT} required Tobyworld assets.`,
      );
      return;
    }

    try {
      setIsSupporting(true);
      setNotice(null);
      setImagePreviewUrl(null);

      const message =
        buildWalletSupportMessage(address);

      const signature =
        await signMessageAsync({
          message,
        });

      if (
        !isValidHexSignature(signature)
      ) {
        throw new Error(
          'Wallet did not return a valid signature. Reconnect the wallet and try again.',
        );
      }

      const response = await fetch(
        '/api/tobyworld/wallet-support-rite',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            walletAddress: address,
            message,
            signature,
          }),
        },
      );

      const result =
        (await response.json()) as WalletSupportResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to support today’s rite.',
        );
      }

      /*
       * Preserve an existing Farcaster passport.
       * In a Farcaster session the wallet contributes an echo without
       * replacing the user's FID-based passport.
       */
      if (!persona) {
        const walletPersona =
          createWalletSupporterPersona(
            address,
            heldAssets,
          );

        const walletSnapshot =
          createWalletSupporterSnapshot(
            address,
          );

        setData({
          ok: true,
          persona: walletPersona,
          snapshot: walletSnapshot,
          source: 'wallet',
          generatedOn:
            getTodayUtcDate(),
          limits: {
            rerollsRemaining: 0,
            cooldownSeconds: 0,
          },
        });

        setFreshInkKey(
          (value) => value + 1,
        );
      }

      setNotice(
        result.message ||
          (result.alreadySupportedToday
            ? 'This wallet already supported today’s rite. Its passport remains valid.'
            : 'Wallet echo added. The pond remembers.'),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Wallet signing failed. Try again from your wallet app.',
      );
    } finally {
      setIsSupporting(false);
    }
  }

  function buildCastText() {
    if (!persona) return '';

    return getDynamicPassportCastText({
      persona,
      snapshot,
      contextUser,
      address,
      heldAssets,
      source: data?.source,
    });
  }

  async function createPassportShareLinks() {
    if (!persona) {
      throw new Error(
        'No passport is ready to share.',
      );
    }

    const payload = {
      title: compactText(
        persona.title,
        72,
      ),
      characteristic: compactText(
        persona.characteristic,
        150,
      ),
      name: compactText(
        getDisplayName(
          snapshot,
          contextUser,
          address,
        ),
        52,
      ),
      handle: compactText(
        getHandle(
          snapshot,
          contextUser,
          address,
        ),
        52,
      ),
      mark: compactText(
        renderedMark,
        42,
      ),
      streak: `${formatNumber(
        snapshot?.streakCount,
      )}d`,
      rites: formatNumber(
        snapshot?.totalCompletions,
      ),
      power: `${formatNumber(
        snapshot?.currentEchoPower,
      )}x`,
      assets: `${heldAssets.length}/${TOTAL_ASSET_COUNT}`,
      stamp: compactText(
        persona.stamp,
        32,
      ),
      mode:
        data?.source === 'wallet'
          ? 'WALLET SUPPORTER'
          : 'APPROVED',
      photo: sharePhotoSrc,
    };

    const response = await fetch(
      '/api/tobyworld/passport-share/create',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          Accept: 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify(payload),
      },
    );

    let result: PassportShareCreateResponse;

    try {
      result =
        (await response.json()) as PassportShareCreateResponse;
    } catch {
      throw new Error(
        `Passport share route returned invalid JSON with status ${response.status}.`,
      );
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
          `Passport share creation failed with status ${response.status}.`,
      );
    }

    if (
      !result.ok ||
      !result.id ||
      !result.shareUrl ||
      !result.imageUrl
    ) {
      throw new Error(
        result.error ||
          'Passport share route did not return complete share links.',
      );
    }

    const shareUrl = new URL(
      result.shareUrl,
      getPublicOrigin(),
    ).toString();

    const imageUrl = new URL(
      result.imageUrl,
      getPublicOrigin(),
    ).toString();

    if (
      !shareUrl.includes(
        `/api/tobyworld/passport-share/${result.id}`,
      )
    ) {
      throw new Error(
        'Passport share route returned the wrong share URL.',
      );
    }

    if (
      !imageUrl.includes(
        `/api/tobyworld/passport-image/${result.id}`,
      )
    ) {
      throw new Error(
        'Passport share route returned the wrong image URL.',
      );
    }

    return {
      id: result.id,
      shareUrl,
      imageUrl,
    };
  }

  async function sharePassport() {
    if (!persona || isCreatingShare) {
      return;
    }

    try {
      setIsCreatingShare(true);
      setNotice(null);

      const { shareUrl } =
        await createPassportShareLinks();

      const text = buildCastText();

      const composeCast =
        (sdk as PassportSdk).actions
          ?.composeCast;

      if (composeCast) {
        await Promise.resolve(
          composeCast({
            text,
            embeds: [shareUrl],
          }),
        );

        setNotice(
          'Passport cast opened with its image card attached.',
        );
        return;
      }

      const warpcastUrl = new URL(
        'https://warpcast.com/~/compose',
      );

      warpcastUrl.searchParams.set(
        'text',
        text,
      );

      warpcastUrl.searchParams.append(
        'embeds[]',
        shareUrl,
      );

      await openExternalUrl(
        warpcastUrl.toString(),
      );

      setNotice('Cast composer opened.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to share passport.',
      );
    } finally {
      setIsCreatingShare(false);
    }
  }

  async function shareToX() {
    if (!persona || isCreatingShare) {
      return;
    }

    try {
      setIsCreatingShare(true);
      setNotice(null);

      const { shareUrl } =
        await createPassportShareLinks();

      const text = buildCastText();

      const url = new URL(
        'https://twitter.com/intent/tweet',
      );

      url.searchParams.set(
        'text',
        text,
      );

      url.searchParams.set(
        'url',
        shareUrl,
      );

      await openExternalUrl(
        url.toString(),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to share passport.',
      );
    } finally {
      setIsCreatingShare(false);
    }
  }

  async function copyPassport() {
    if (!persona || isCreatingShare) {
      return;
    }

    try {
      setIsCreatingShare(true);
      setNotice(null);

      const { shareUrl } =
        await createPassportShareLinks();

      const copied = await copyText(
        `${buildCastText()}\n\n${shareUrl}`,
      );

      setNotice(
        copied
          ? 'Passport text and share card copied.'
          : 'Unable to copy the passport.',
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to copy passport.',
      );
    } finally {
      setIsCreatingShare(false);
    }
  }

  async function sharePassportImage() {
    if (!persona || isCreatingImage) {
      return;
    }

    try {
      setIsCreatingImage(true);
      setNotice(null);

      const { imageUrl } =
        await createPassportShareLinks();

      setImagePreviewUrl(imageUrl);

      const response = await fetch(
        imageUrl,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept:
              'image/png,image/jpeg,image/*',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Passport image failed with status ${response.status}.`,
        );
      }

      const contentType =
        response.headers
          .get('content-type')
          ?.toLowerCase() ?? '';

      if (
        !contentType.startsWith('image/')
      ) {
        throw new Error(
          `Passport route returned ${
            contentType || 'an unknown file type'
          } instead of an image.`,
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error(
          'Passport image route returned an empty image.',
        );
      }

      const isJpeg =
        contentType.includes('jpeg') ||
        contentType.includes('jpg');

      const extension =
        isJpeg ? 'jpg' : 'png';

      const mimeType =
        isJpeg
          ? 'image/jpeg'
          : 'image/png';

      const file = new File(
        [blob],
        `tobyworld-pond-passport.${extension}`,
        {
          type: mimeType,
        },
      );

      const shareNavigator =
        navigator as FileShareNavigator;

      const canShareFile =
        typeof shareNavigator.share ===
          'function' &&
        typeof shareNavigator.canShare ===
          'function' &&
        shareNavigator.canShare({
          files: [file],
        });

      if (
        canShareFile &&
        shareNavigator.share
      ) {
        try {
          await shareNavigator.share({
            title:
              'Tobyworld Pond Passport',
            text: buildCastText(),
            files: [file],
          });

          setNotice(
            'Passport image share opened.',
          );
          return;
        } catch (error) {
          const cancelled =
            error instanceof DOMException &&
            error.name === 'AbortError';

          if (cancelled) {
            setNotice(
              'Image share cancelled. The permanent PNG link is available below.',
            );
            return;
          }

          /*
           * Continue to browser-specific saving fallbacks.
           */
        }
      }

      /*
       * Standard desktop/Android browsers generally support same-origin
       * downloads. Use the fetched blob so the PNG is saved as a file.
       */
      if (!isMiniApp) {
        const objectUrl =
          URL.createObjectURL(blob);

        const link =
          document.createElement('a');

        link.href = objectUrl;
        link.download =
          `tobyworld-pond-passport.${extension}`;

        link.rel =
          'noopener noreferrer';

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 15_000);

        setNotice(
          'Passport image download started. The permanent PNG link is also available below.',
        );
        return;
      }

      /*
       * Embedded iOS/Farcaster browsers are unreliable with blob downloads.
       * Open the permanent server image so it can be long-pressed and saved.
       */
      await openExternalUrl(imageUrl);

      setNotice(
        'Passport PNG opened. Long-press the image or use the browser share menu to save it.',
      );
    } catch (error) {
      console.error(
        'Passport image creation failed:',
        error,
      );

      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to create the passport image.',
      );
    } finally {
      setIsCreatingImage(false);
    }
  }

  return (
    <section
      className="pond-passport"
      aria-label="Tobyworld Pond Passport"
    >
      <div
        className="pond-passport-glow"
        aria-hidden="true"
      />

      <div className="pond-passport-toolbar">
        <div>
          <p>POND PASSPORT</p>
          <span>{statusLabel}</span>
        </div>

        <div className="pond-passport-toolbar-chip">
          <strong>
            {getSourceLabel(
              data?.source,
              isFarcasterSession,
            )}
          </strong>

          <small>
            {getIssuedDate(
              data?.generatedOn,
            )}
          </small>
        </div>
      </div>

      {!isConnected && (
        <div className="pond-passport-gate">
          <strong>
            The passport desk is open.
          </strong>

          <p>
            Connect any supported wallet. A wallet
            holding at least two Tobyworld assets can
            support today’s rite and stamp a passport.
            Farcaster users may also load their FID-based
            passport.
          </p>

          <div className="pond-passport-connector-list">
            {availableConnectors.length > 0 ? (
              availableConnectors.map(
                (connector) => (
                  <button
                    type="button"
                    key={`${connector.id}-${connector.name}`}
                    onClick={() =>
                      void connectWallet(
                        connector.id,
                      )
                    }
                    disabled={
                      isConnecting ||
                      connectingConnectorId !==
                        null
                    }
                  >
                    {connectingConnectorId ===
                    connector.id
                      ? 'Opening…'
                      : `Connect ${getConnectorLabel(
                          connector,
                        )}`}
                  </button>
                ),
              )
            ) : (
              <button
                type="button"
                onClick={() =>
                  void connectWallet()
                }
                disabled={isConnecting}
              >
                {isConnecting
                  ? 'Loading wallets…'
                  : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      )}

      {isConnected && (
        <div className="pond-passport-wallet-strip">
          <div>
            <small>CONNECTED WALLET</small>
            <strong>
              {address
                ? shortenAddress(address)
                : 'Connected'}
            </strong>
          </div>

          <div>
            <small>TOBYWORLD ASSETS</small>
            <strong>
              {isCheckingAssets
                ? 'Checking…'
                : `${assetCount}/${TOTAL_ASSET_COUNT}`}
            </strong>
          </div>

          <button
            type="button"
            className="ghost"
            onClick={() => {
              disconnect();
              setHeldAssets([]);
              setImagePreviewUrl(null);
              setNotice(
                'Wallet disconnected.',
              );
            }}
          >
            Disconnect
          </button>
        </div>
      )}

      {isConnected &&
        !hasEnoughAssets &&
        !isCheckingAssets && (
          <div className="pond-passport-gate">
            <strong>Two-asset gate.</strong>

            <p>
              This wallet currently holds{' '}
              {assetCount}/
              {REQUIRED_ASSET_COUNT} required
              Tobyworld assets. Hold any two of
              Toby, Taboshi, and Patience to stamp
              or support a passport.
            </p>

            <div className="pond-passport-asset-pills">
              {TOBYWORLD_SWAP_TOKENS.map(
                (token) => {
                  const held =
                    heldAssets.some(
                      (heldToken) =>
                        heldToken.id ===
                        token.id,
                    );

                  return (
                    <span
                      className={
                        held
                          ? 'is-held'
                          : ''
                      }
                      key={token.id}
                    >
                      {held ? '✓ ' : ''}
                      {token.symbol}
                    </span>
                  );
                },
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                void checkWalletAssets()
              }
              disabled={isCheckingAssets}
            >
              {isCheckingAssets
                ? 'Checking…'
                : 'Check Again'}
            </button>
          </div>
        )}

      {isConnected &&
        hasEnoughAssets &&
        !persona &&
        !canUseFarcasterPassport && (
          <div className="pond-passport-gate">
            <strong>
              Wallet supporter mode.
            </strong>

            <p>
              This wallet passed the two-asset
              gate. Sign one free message to add
              an echo and stamp a Wallet Supporter
              Passport. No gas, transaction, or
              token approval.
            </p>

            <button
              type="button"
              onClick={() =>
                void supportRiteWithWallet()
              }
              disabled={
                isSupporting ||
                isSigning
              }
            >
              {isSupporting ||
              isSigning
                ? 'Signing…'
                : 'Support Rite + Stamp Passport'}
            </button>
          </div>
        )}

      <article
        className={`pond-passport-card ${
          persona
            ? 'is-ready'
            : 'is-pending'
        } ${
          !hasEnoughAssets
            ? 'is-locked'
            : ''
        }`}
        key={freshInkKey}
      >
        <div
          className="pond-passport-watermark"
          aria-hidden="true"
        >
          POND
        </div>

        <div className="pond-passport-card-head">
          <div className="pond-passport-photo">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt=""
                aria-hidden="true"
                onError={() => {
                  if (pfpUrl) {
                    setPfpFailed(true);
                    return;
                  }

                  setFrogImageFailed(true);
                }}
              />
            ) : (
              <span>🐸</span>
            )}
          </div>

          <div className="pond-passport-identity">
            <small>ISSUED TO</small>

            <h3>
              {getDisplayName(
                snapshot,
                contextUser,
                address,
              )}
            </h3>

            <p>
              {getHandle(
                snapshot,
                contextUser,
                address,
              )}

              {snapshot?.fid
                ? ` · FID ${snapshot.fid}`
                : ''}
            </p>
          </div>

          <div
            className="pond-passport-mini-stamp"
            aria-hidden="true"
          >
            △🐸🍃
          </div>
        </div>

        <div className="pond-passport-title-block">
          <small>POND TITLE</small>

          <h2>
            {persona?.title ??
              (hasEnoughAssets
                ? 'Awaiting pond stamp…'
                : 'Passport locked')}
          </h2>

          <p>
            {persona?.characteristic ??
              (hasEnoughAssets
                ? 'The frog at the desk is still checking the file.'
                : 'Hold at least two Tobyworld assets in this wallet to reveal your stamp.')}
          </p>
        </div>

        <div className="pond-passport-trait-grid">
          <div>
            <small>HABIT</small>

            <p>
              {persona?.strangeHabit ??
                'Pending.'}
            </p>
          </div>

          <div>
            <small>WARNING</small>

            <p>
              {persona?.pondWarning ??
                'Pending.'}
            </p>
          </div>
        </div>

        <div className="pond-passport-stat-row">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>
                {stat.value}
              </strong>

              <span>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <div className="pond-passport-bottom-row">
          <div>
            <small>MARK</small>
            <strong>
              {renderedMark}
            </strong>
          </div>

          <div className="pond-passport-approved">
            <span>
              {persona?.stamp ??
                '△ · 🐸 · 🍃'}
            </span>

            <b>
              {hasEnoughAssets
                ? 'APPROVED'
                : 'LOCKED'}
            </b>
          </div>
        </div>
      </article>

      <div className="pond-passport-actions">
        {!isConnected && (
          <button
            type="button"
            className="primary"
            onClick={() =>
              void connectWallet()
            }
            disabled={isConnecting}
          >
            {isConnecting
              ? 'Opening…'
              : 'Connect'}
          </button>
        )}

        {isConnected &&
          canUseFarcasterPassport && (
            <button
              type="button"
              className="primary"
              onClick={() =>
                void fetchPassport(true)
              }
              disabled={
                isRerolling ||
                isLoading ||
                !hasEnoughAssets ||
                !persona ||
                data?.source ===
                  'wallet' ||
                (data?.limits
                  ?.rerollsRemaining ??
                  0) <= 0
              }
            >
              {isRerolling
                ? 'Rerolling…'
                : 'Reroll'}
            </button>
          )}

        {isConnected && (
          <button
            type="button"
            className={
              !persona
                ? 'primary'
                : undefined
            }
            onClick={() =>
              void supportRiteWithWallet()
            }
            disabled={
              !hasEnoughAssets ||
              isSupporting ||
              isSigning
            }
          >
            {isSupporting ||
            isSigning
              ? 'Signing…'
              : persona
                ? 'Wallet Echo'
                : 'Support Rite'}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            void sharePassport()
          }
          disabled={
            !persona ||
            isCreatingShare
          }
        >
          {isCreatingShare
            ? 'Preparing…'
            : 'Cast'}
        </button>

        <button
          type="button"
          onClick={() =>
            void shareToX()
          }
          disabled={
            !persona ||
            isCreatingShare
          }
        >
          X
        </button>

        <button
          type="button"
          onClick={() =>
            void sharePassportImage()
          }
          disabled={
            !persona ||
            isCreatingImage
          }
        >
          {isCreatingImage
            ? 'Making…'
            : 'Save Image'}
        </button>

        <button
          type="button"
          onClick={() =>
            void copyPassport()
          }
          disabled={
            !persona ||
            isCreatingShare
          }
        >
          Copy
        </button>

        {canUseFarcasterPassport && (
          <button
            type="button"
            className="ghost"
            onClick={() =>
              void fetchPassport(false)
            }
            disabled={
              isLoading ||
              isRerolling ||
              !hasEnoughAssets
            }
          >
            {isLoading
              ? 'Loading…'
              : 'Reload'}
          </button>
        )}
      </div>

      {imagePreviewUrl && (
        <div className="pond-passport-image-result">
          <strong>
            Passport PNG ready
          </strong>

          <p>
            Open the permanent image directly,
            then long-press or use the browser
            share menu to save it.
          </p>

          <a
            href={imagePreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PNG ↗
          </a>

          <button
            type="button"
            onClick={() =>
              void copyText(
                imagePreviewUrl,
              ).then((copied) => {
                setNotice(
                  copied
                    ? 'PNG link copied.'
                    : 'Unable to copy PNG link.',
                );
              })
            }
          >
            Copy PNG Link
          </button>
        </div>
      )}

      {notice && (
        <p
          className="pond-passport-notice"
          role="status"
        >
          {notice}
        </p>
      )}
    </section>
  );
}
