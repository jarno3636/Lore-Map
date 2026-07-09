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
    composeCast?: (params: { text: string; embeds?: string[] }) => Promise<void> | void;
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
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envOrigin) {
    return envOrigin.replace(/\/$/, '');
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

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
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
  const username = contextUser?.username || snapshot?.username;

  if (username) return `@${username}`;
  if (address) return 'Wallet supporter';

  return 'Tobyworld traveler';
}

function getIssuedDate(value?: string) {
  if (!value) return 'Pending';

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function getSourceLabel(source?: string, isFarcasterSession = false) {
  if (!source) return 'Not loaded';
  if (source === 'gemini') return 'AI stamp';
  if (source === 'wallet') return isFarcasterSession ? 'Pond stamp' : 'Wallet stamp';
  if (source.startsWith('fallback')) return 'Local stamp';

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

function isValidHexSignature(value: unknown): value is `0x${string}` {
  if (typeof value !== 'string') return false;
  if (!/^0x[0-9a-fA-F]+$/.test(value)) return false;

  return value.length === 132 || value.length === 130;
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function createWalletSupporterPersona(address: string, heldAssets: TobyworldAsset[]): PondPersona {
  const heldSymbols =
    heldAssets.length > 0 ? heldAssets.map((asset) => asset.symbol).join(' + ') : 'Pond Assets';

  const seed = hashText(`${address}:${heldSymbols}:${getTodayUtcDate()}`);

  const title = pick(WALLET_TITLES, seed);
  const characteristic = pick(WALLET_CHARACTERISTICS, seed >> 3);
  const strangeHabit = pick(WALLET_HABITS, seed >> 6);
  const pondWarning = pick(WALLET_WARNINGS, seed >> 9);
  const stamp = pick(
    ['△ · 🐸 · 🍃', '🐸 · ⇄ · ✦', '🍃 · 🐸 · 🪪', '✦ · 🐸 · △'],
    seed >> 12,
  );

  return {
    title,
    characteristic,
    strangeHabit,
    pondWarning,
    stamp,
    shareText: `My Tobyworld Pond Passport has been stamped: ${title}. Held path: ${heldSymbols}. The pond remains professionally concerned. ${stamp}`,
  };
}

function createWalletSupporterSnapshot(address: string): PassportSnapshot {
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
  isFarcasterSession,
}: {
  isConnected: boolean;
  isCheckingAssets: boolean;
  isLoading: boolean;
  isRerolling: boolean;
  data: PassportResponse | null;
  hasEnoughAssets: boolean;
  assetCount: number;
  isFarcasterSession: boolean;
}) {
  if (!isConnected) return 'Wallet needed';
  if (isCheckingAssets) return 'Checking wallet assets…';
  if (isLoading) return 'Loading passport…';
  if (isRerolling) return 'Rerolling stamp…';

  if (!hasEnoughAssets) {
    return `${assetCount}/${REQUIRED_ASSET_COUNT} assets detected`;
  }

  if (data?.persona) {
    const rerolls = data.source === 'wallet' ? 0 : data.limits?.rerollsRemaining ?? 0;

    if (data.source === 'wallet') {
      return isFarcasterSession ? 'Loaded · Pond stamp' : 'Loaded · Wallet supporter stamp';
    }

    return `Loaded · ${rerolls} reroll${rerolls === 1 ? '' : 's'} left`;
  }

  return 'Ready for pond stamp';
}

function toBigIntBalance(value: unknown) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.floor(value));
  if (typeof value === 'string' && value.trim()) return BigInt(value);

  return BigInt(0);
}

function pickBackupFrogImage(seed: string | number | undefined) {
  const value = String(seed ?? 'pond');
  const hash = hashText(value);

  return PASSPORT_FROG_BACKUPS[Math.abs(hash) % PASSPORT_FROG_BACKUPS.length];
}

function getSafePhotoUrl(photoSrc?: string) {
  if (!photoSrc) return undefined;

  if (!photoSrc.startsWith('/images/passport/')) {
    return undefined;
  }

  try {
    return new URL(photoSrc, getPublicOrigin()).toString();
  } catch {
    return undefined;
  }
}

function getRenderedMark({
  snapshot,
  isFarcasterSession,
}: {
  snapshot?: PassportSnapshot;
  isFarcasterSession: boolean;
}) {
  if (isFarcasterSession && snapshot?.currentMark === 'Web Supporter') {
    return 'Pond Supporter';
  }

  return snapshot?.currentMark ?? 'Unstamped Frog';
}

function getPassportImageUrl({
  persona,
  snapshot,
  contextUser,
  address,
  photoSrc,
  heldAssets,
  source,
  isFarcasterSession,
  compact = false,
}: {
  persona: PondPersona;
  snapshot?: PassportSnapshot;
  contextUser: MiniAppUserContext | null;
  address?: string;
  photoSrc?: string;
  heldAssets: TobyworldAsset[];
  source?: string;
  isFarcasterSession: boolean;
  compact?: boolean;
}) {
  const url = new URL('/api/tobyworld/passport-image', getPublicOrigin());

  const title = compact ? compactText(persona.title, 54) : compactText(persona.title, 72);
  const characteristic = compact
    ? compactText(persona.characteristic, 80)
    : compactText(persona.characteristic, 140);
  const name = compact
    ? compactText(getDisplayName(snapshot, contextUser, address), 40)
    : compactText(getDisplayName(snapshot, contextUser, address), 52);
  const handle = compact
    ? compactText(getHandle(snapshot, contextUser, address), 36)
    : compactText(getHandle(snapshot, contextUser, address), 52);
  const mark = compact
    ? compactText(getRenderedMark({ snapshot, isFarcasterSession }), 36)
    : compactText(getRenderedMark({ snapshot, isFarcasterSession }), 42);

  url.searchParams.set('title', title);
  url.searchParams.set('characteristic', characteristic);
  url.searchParams.set('name', name);
  url.searchParams.set('handle', handle);
  url.searchParams.set('mark', mark);
  url.searchParams.set('streak', `${formatNumber(snapshot?.streakCount)}d`);
  url.searchParams.set('rites', formatNumber(snapshot?.totalCompletions));
  url.searchParams.set('power', `${formatNumber(snapshot?.currentEchoPower)}x`);
  url.searchParams.set('assets', `${heldAssets.length}/${TOTAL_ASSET_COUNT}`);
  url.searchParams.set('stamp', compact ? '△ · 🐸 · 🍃' : persona.stamp);
  url.searchParams.set(
    'mode',
    source === 'wallet' && !isFarcasterSession ? 'WALLET SUPPORTER' : 'APPROVED',
  );

  const safePhoto = getSafePhotoUrl(photoSrc);

  if (safePhoto && !compact) {
    url.searchParams.set('photo', safePhoto);
  }

  return url.toString();
}

function getPassportShareUrl({
  persona,
  snapshot,
  contextUser,
  address,
  heldAssets,
  source,
  isFarcasterSession,
}: {
  persona: PondPersona;
  snapshot?: PassportSnapshot;
  contextUser: MiniAppUserContext | null;
  address?: string;
  heldAssets: TobyworldAsset[];
  source?: string;
  isFarcasterSession: boolean;
}) {
  const imageUrl = getPassportImageUrl({
    persona,
    snapshot,
    contextUser,
    address,
    photoSrc: undefined,
    heldAssets,
    source,
    isFarcasterSession,
    compact: true,
  });

  const shareUrl = new URL('/api/tobyworld/passport-share', getPublicOrigin());
  const parsedImageUrl = new URL(imageUrl);

  parsedImageUrl.searchParams.forEach((value, key) => {
    shareUrl.searchParams.set(key, value);
  });

  return shareUrl.toString();
}

function getDynamicPassportCastText({
  persona,
  snapshot,
  contextUser,
  address,
  heldAssets,
  source,
  isFarcasterSession,
}: {
  persona: PondPersona;
  snapshot?: PassportSnapshot;
  contextUser: MiniAppUserContext | null;
  address?: string;
  heldAssets: TobyworldAsset[];
  source?: string;
  isFarcasterSession: boolean;
}) {
  const name = getDisplayName(snapshot, contextUser, address);
  const handle = getHandle(snapshot, contextUser, address);
  const heldPath =
    heldAssets.length > 0 ? heldAssets.map((asset) => asset.symbol).join(' + ') : 'pond path';

  const stats =
    source === 'wallet' && !isFarcasterSession
      ? `Wallet Supporter · ${heldPath}`
      : `${formatNumber(snapshot?.streakCount)}d streak · ${formatNumber(
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

async function copyText(value: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

async function openExternalUrl(url: string) {
  const openUrl = (sdk as PassportSdk).actions?.openUrl;

  if (openUrl) {
    await Promise.resolve(openUrl(url));
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export function TobyworldPondPassport() {
  const [data, setData] = useState<PassportResponse | null>(null);
  const [contextUser, setContextUser] = useState<MiniAppUserContext | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [heldAssets, setHeldAssets] = useState<TobyworldAsset[]>([]);
  const [isCheckingAssets, setIsCheckingAssets] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [isSupporting, setIsSupporting] = useState(false);
  const [isCreatingImage, setIsCreatingImage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [freshInkKey, setFreshInkKey] = useState(0);
  const [pfpFailed, setPfpFailed] = useState(false);
  const [frogImageFailed, setFrogImageFailed] = useState(false);

  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });

  const persona = data?.persona;
  const snapshot = data?.snapshot;
  const hasQuickAuth = Boolean(getBoundQuickAuthFetch());
  const hasFarcasterProfile = Boolean(contextUser?.fid || (snapshot?.fid && snapshot.fid > 0));
  const canUseFarcasterPassport = Boolean(contextUser?.fid && hasQuickAuth);
  const isFarcasterSession = Boolean(isMiniApp || hasFarcasterProfile || canUseFarcasterPassport);
  const canUseWalletSupport = Boolean(!isFarcasterSession);

  const fallbackFrogImage = pickBackupFrogImage(snapshot?.fid || address);
  const pfpUrl = !pfpFailed ? contextUser?.pfpUrl : undefined;
  const photoSrc = pfpUrl || (!frogImageFailed ? fallbackFrogImage : undefined);
  const sharePhotoSrc = !frogImageFailed ? fallbackFrogImage : undefined;

  const assetCount = heldAssets.length;
  const hasEnoughAssets = assetCount >= REQUIRED_ASSET_COUNT;
  const canUsePassport = Boolean(isConnected && address && hasEnoughAssets);

  const stats = useMemo(
    () => [
      {
        label: 'Streak',
        value: `${formatNumber(snapshot?.streakCount)}d`,
      },
      {
        label: 'Best',
        value: `${formatNumber(snapshot?.bestStreak)}d`,
      },
      {
        label: 'Rites',
        value: formatNumber(snapshot?.totalCompletions),
      },
      {
        label: 'Power',
        value: `${formatNumber(snapshot?.currentEchoPower)}x`,
      },
    ],
    [snapshot],
  );

  const statusLabel = getPassportStateLabel({
    isConnected,
    isCheckingAssets,
    isLoading,
    isRerolling,
    data,
    hasEnoughAssets,
    assetCount,
    isFarcasterSession,
  });

  const checkWalletAssets = useCallback(async () => {
    if (!isConnected || !address || !publicClient) {
      setHeldAssets([]);
      setIsCheckingAssets(false);
      return;
    }

    setIsCheckingAssets(true);

    try {
      const results = await Promise.allSettled(
        TOBYWORLD_SWAP_TOKENS.map(async (token) => {
          const balance = await publicClient.readContract({
            address: token.address,
            abi: ERC20_BALANCE_ABI,
            functionName: 'balanceOf',
            args: [address],
          });

          return {
            token,
            balance,
          };
        }),
      );

      const nextHeldAssets = results
        .map((result) => {
          if (result.status !== 'fulfilled') return null;

          const balance = toBigIntBalance(result.value.balance);

          if (balance <= BigInt(0)) return null;

          return result.value.token;
        })
        .filter((token): token is TobyworldAsset => Boolean(token));

      setHeldAssets(nextHeldAssets);
    } catch {
      setHeldAssets([]);
    } finally {
      setIsCheckingAssets(false);
    }
  }, [address, isConnected, publicClient]);

  const loadMiniAppContext = useCallback(async () => {
    try {
      const passportSdk = sdk as PassportSdk;

      if (passportSdk.isInMiniApp) {
        const miniAppResult = await Promise.resolve(passportSdk.isInMiniApp());
        setIsMiniApp(Boolean(miniAppResult));
      }

      const context = await Promise.resolve(passportSdk.context);

      if (context?.user) {
        setContextUser(context.user);
        setIsMiniApp(true);
      }
    } catch {
      setContextUser(null);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setNotice(null);

    const preferredConnector =
      connectors.find((connector) => /farcaster/i.test(connector.name)) ??
      connectors.find((connector) => /base|coinbase/i.test(connector.name)) ??
      connectors.find((connector) => /injected|metamask/i.test(connector.name)) ??
      connectors[0];

    if (!preferredConnector) {
      setNotice(
        'No wallet connector found. Open this page in Farcaster, Coinbase Wallet, MetaMask, or another wallet browser.',
      );
      return;
    }

    try {
      await connectAsync({ connector: preferredConnector });
      setNotice('Wallet connected. Checking Tobyworld assets…');
      window.setTimeout(() => {
        void checkWalletAssets();
      }, 600);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Wallet connection was cancelled or failed. Try again from a wallet browser.',
      );
    }
  }, [checkWalletAssets, connectAsync, connectors]);

  const fetchPassport = useCallback(
    async (reroll = false) => {
      const authFetch = getBoundQuickAuthFetch();

      if (!isConnected || !address) {
        setNotice('Connect a wallet that holds at least two Tobyworld assets to stamp a passport.');
        await connectWallet();
        return;
      }

      if (!hasEnoughAssets) {
        setNotice(
          `Passport locked. This wallet currently holds ${assetCount}/${REQUIRED_ASSET_COUNT} required Tobyworld assets.`,
        );
        return;
      }

      if (!authFetch) {
        setNotice(
          'Wallet gate passed. Press Support Rite to sign a free message and receive a Wallet Supporter Passport. No gas, no transaction, no token approval.',
        );
        return;
      }

      const previousTitle = data?.persona?.title;

      setNotice(null);

      if (reroll) {
        setIsRerolling(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await authFetch(`${getPublicOrigin()}/api/tobyworld/pond-passport`, {
          method: reroll ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        const nextData = (await response.json()) as PassportResponse;

        if (!response.ok) {
          throw new Error(nextData.error || 'The pond refused to stamp the passport.');
        }

        setData(nextData);
        setFreshInkKey((value) => value + 1);

        if (reroll) {
          const nextTitle = nextData.persona?.title;

          setNotice(
            nextTitle && nextTitle !== previousTitle
              ? `New stamp loaded: ${nextTitle}.`
              : 'Passport rerolled. The pond may have kept one detail because it liked it.',
          );
        } else {
          setNotice(nextData.persona ? 'Passport loaded.' : null);
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'The passport ink ran.');
      } finally {
        setIsLoading(false);
        setIsRerolling(false);
      }
    },
    [
      address,
      assetCount,
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

    if (!isConnected || !address) return undefined;

    const interval = window.setInterval(() => {
      void checkWalletAssets();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [address, checkWalletAssets, isConnected]);

  useEffect(() => {
    if (!canUseFarcasterPassport) return;
    if (!canUsePassport || data?.persona) return;

    void fetchPassport(false);
  }, [canUseFarcasterPassport, canUsePassport, data?.persona, fetchPassport]);

  async function supportRiteWithWallet() {
    if (!canUseWalletSupport) {
      setNotice('Farcaster users support the rite through the Farcaster Daily Rite.');
      return;
    }

    if (!address) {
      await connectWallet();
      return;
    }

    if (!hasEnoughAssets) {
      setNotice(
        `Supporter passport locked. This wallet currently holds ${assetCount}/${REQUIRED_ASSET_COUNT} required Tobyworld assets.`,
      );
      return;
    }

    try {
      setIsSupporting(true);
      setNotice(null);

      const message = buildWalletSupportMessage(address);
      const signature = await signMessageAsync({ message });

      if (!isValidHexSignature(signature)) {
        throw new Error(
          'Wallet did not return a valid signature. Try again from your wallet app or wallet browser.',
        );
      }

      const response = await fetch('/api/tobyworld/wallet-support-rite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature,
        }),
      });

      const result = (await response.json()) as WalletSupportResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Unable to support today’s rite.');
      }

      const walletPersona = createWalletSupporterPersona(address, heldAssets);
      const walletSnapshot = createWalletSupporterSnapshot(address);

      setData({
        ok: true,
        persona: walletPersona,
        snapshot: walletSnapshot,
        source: 'wallet',
        generatedOn: getTodayUtcDate(),
        limits: {
          rerollsRemaining: 0,
          cooldownSeconds: 0,
        },
      });

      setFreshInkKey((value) => value + 1);
      setNotice(result.message || 'The wallet has supported today’s pond rite. Passport stamped.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Wallet signing failed. Try again from your wallet app or wallet browser.',
      );
    } finally {
      setIsSupporting(false);
    }
  }

  function buildImageUrl() {
    if (!persona) return null;

    return getPassportImageUrl({
      persona,
      snapshot,
      contextUser,
      address,
      photoSrc: sharePhotoSrc,
      heldAssets,
      source: data?.source,
      isFarcasterSession,
      compact: false,
    });
  }

  function buildShareUrl() {
    if (!persona) return null;

    return getPassportShareUrl({
      persona,
      snapshot,
      contextUser,
      address,
      heldAssets,
      source: data?.source,
      isFarcasterSession,
    });
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
      isFarcasterSession,
    });
  }

  async function sharePassport() {
    if (!persona) return;

    const shareUrl = buildShareUrl();

    if (!shareUrl) return;

    const text = buildCastText();
    const composeCast = (sdk as PassportSdk).actions?.composeCast;

    try {
      if (composeCast) {
        await Promise.resolve(
          composeCast({
            text,
            embeds: [shareUrl],
          }),
        );

        setNotice('Passport cast opened with image card attached.');
        return;
      }

      const warpcastUrl = new URL('https://warpcast.com/~/compose');
      warpcastUrl.searchParams.set('text', text);
      warpcastUrl.searchParams.append('embeds[]', shareUrl);

      await openExternalUrl(warpcastUrl.toString());
      setNotice('Cast composer opened.');
    } catch {
      const copied = await copyText(`${text}\n\n${shareUrl}`);
      setNotice(copied ? 'Passport cast text and share card copied.' : text);
    }
  }

  async function shareToX() {
    if (!persona) return;

    const shareUrl = buildShareUrl();

    if (!shareUrl) return;

    const text = buildCastText();

    const url = new URL('https://twitter.com/intent/tweet');
    url.searchParams.set('text', text);
    url.searchParams.set('url', shareUrl);

    await openExternalUrl(url.toString());
  }

  async function copyPassport() {
    if (!persona) return;

    const shareUrl = buildShareUrl();

    if (!shareUrl) return;

    const text = buildCastText();

    const copied = await copyText(`${text}\n\n${shareUrl}`);
    setNotice(copied ? 'Passport text and share card copied.' : persona.shareText);
  }

  async function sharePassportImage() {
    if (!persona) return;

    const imageUrl = buildImageUrl();

    if (!imageUrl) {
      setNotice('Unable to build passport image URL.');
      return;
    }

    try {
      setIsCreatingImage(true);
      setNotice(null);

      const response = await fetch(imageUrl, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Unable to render passport image.');
      }

      const blob = await response.blob();

      if (!blob.type.includes('image')) {
        throw new Error('Passport image route did not return an image.');
      }

      const file = new File([blob], 'tobyworld-pond-passport.png', {
        type: 'image/png',
      });

      const shareNavigator = navigator as FileShareNavigator;

      if (shareNavigator.canShare?.({ files: [file] }) && shareNavigator.share) {
        try {
          await shareNavigator.share({
            title: 'Tobyworld Pond Passport',
            text: buildCastText(),
            files: [file],
          });

          setNotice('Passport image share opened.');
          return;
        } catch (shareError) {
          const isAbort =
            shareError instanceof DOMException && shareError.name === 'AbortError';

          if (!isAbort) {
            throw shareError;
          }

          const copied = await copyText(imageUrl);

          setNotice(
            copied
              ? 'Share cancelled. Image link copied.'
              : 'Share cancelled. Use Copy to save the image link.',
          );
          return;
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = 'tobyworld-pond-passport.png';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);

      setNotice('Passport image download started.');
    } catch (error) {
      const copied = await copyText(imageUrl);

      setNotice(
        error instanceof Error
          ? `${error.message}${copied ? ' Image link copied instead.' : ''}`
          : 'Unable to create passport image.',
      );
    } finally {
      setIsCreatingImage(false);
    }
  }

  const renderedMark = getRenderedMark({
    snapshot,
    isFarcasterSession,
  });

  return (
    <section className="pond-passport" aria-label="Tobyworld Pond Passport">
      <div className="pond-passport-glow" aria-hidden="true" />

      <div className="pond-passport-toolbar">
        <div>
          <p>POND PASSPORT</p>
          <span>{statusLabel}</span>
        </div>

        <div className="pond-passport-toolbar-chip">
          <strong>{getSourceLabel(data?.source, isFarcasterSession)}</strong>
          <small>{getIssuedDate(data?.generatedOn)}</small>
        </div>
      </div>

      {!isConnected && (
        <div className="pond-passport-gate">
          <strong>The passport desk is open.</strong>
          <p>
            Connect a wallet that holds at least two Tobyworld assets to reveal your
            Pond Passport. In Farcaster, your passport uses your profile, PFP, and
            Daily Rite activity. On web, you can support today’s rite and share to X.
          </p>

          <button type="button" onClick={() => void connectWallet()} disabled={isConnecting}>
            {isConnecting ? 'Opening wallet…' : 'Connect Wallet'}
          </button>
        </div>
      )}

      {isConnected && !hasEnoughAssets && !isCheckingAssets && (
        <div className="pond-passport-gate">
          <strong>Two-asset gate.</strong>
          <p>
            This wallet currently holds {assetCount}/{REQUIRED_ASSET_COUNT} required
            Tobyworld assets. Hold any two of Toby, Taboshi, and Patience to stamp a
            passport.
          </p>

          <div className="pond-passport-asset-pills">
            {TOBYWORLD_SWAP_TOKENS.map((token) => {
              const held = heldAssets.some((heldToken) => heldToken.id === token.id);

              return (
                <span className={held ? 'is-held' : ''} key={token.id}>
                  {held ? '✓ ' : ''}
                  {token.symbol}
                </span>
              );
            })}
          </div>

          <button type="button" onClick={() => disconnect()} className="ghost">
            Disconnect
          </button>
        </div>
      )}

      {isConnected && hasEnoughAssets && !persona && canUseWalletSupport && (
        <div className="pond-passport-gate">
          <strong>Wallet supporter mode.</strong>
          <p>
            This wallet passed the two-asset gate. Press Support Rite to sign a free
            message, add one echo to the community rite, and stamp a Wallet Supporter
            Passport. No gas. No transaction. No token approval.
          </p>

          <button
            type="button"
            onClick={() => void supportRiteWithWallet()}
            disabled={isSupporting || isSigning}
          >
            {isSupporting || isSigning ? 'Signing…' : 'Support Rite + Stamp Passport'}
          </button>
        </div>
      )}

      <article
        className={`pond-passport-card ${persona ? 'is-ready' : 'is-pending'} ${
          !hasEnoughAssets ? 'is-locked' : ''
        }`}
        key={freshInkKey}
      >
        <div className="pond-passport-watermark" aria-hidden="true">
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
            <h3>{getDisplayName(snapshot, contextUser, address)}</h3>
            <p>
              {getHandle(snapshot, contextUser, address)}
              {snapshot?.fid ? ` · FID ${snapshot.fid}` : ''}
            </p>
          </div>

          <div className="pond-passport-mini-stamp" aria-hidden="true">
            △🐸🍃
          </div>
        </div>

        <div className="pond-passport-title-block">
          <small>POND TITLE</small>
          <h2>
            {persona?.title ??
              (hasEnoughAssets ? 'Awaiting pond stamp…' : 'Passport locked')}
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
            <p>{persona?.strangeHabit ?? 'Pending.'}</p>
          </div>

          <div>
            <small>WARNING</small>
            <p>{persona?.pondWarning ?? 'Pending.'}</p>
          </div>
        </div>

        <div className="pond-passport-stat-row">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="pond-passport-bottom-row">
          <div>
            <small>MARK</small>
            <strong>{renderedMark}</strong>
          </div>

          <div className="pond-passport-approved">
            <span>{persona?.stamp ?? '△ · 🐸 · 🍃'}</span>
            <b>{hasEnoughAssets ? 'APPROVED' : 'LOCKED'}</b>
          </div>
        </div>
      </article>

      <div className="pond-passport-actions">
        {!isConnected ? (
          <button
            type="button"
            className="primary"
            onClick={() => void connectWallet()}
            disabled={isConnecting}
          >
            {isConnecting ? 'Opening…' : 'Connect'}
          </button>
        ) : canUseFarcasterPassport ? (
          <button
            type="button"
            className="primary"
            onClick={() => void fetchPassport(true)}
            disabled={
              isRerolling ||
              isLoading ||
              !hasEnoughAssets ||
              !persona ||
              data?.source === 'wallet' ||
              (data?.limits?.rerollsRemaining ?? 0) <= 0
            }
          >
            {isRerolling ? 'Rerolling…' : 'Reroll'}
          </button>
        ) : canUseWalletSupport ? (
          <button
            type="button"
            className="primary"
            onClick={() => void supportRiteWithWallet()}
            disabled={!hasEnoughAssets || isSupporting || isSigning}
          >
            {isSupporting || isSigning ? 'Signing…' : persona ? 'Support Again' : 'Support Rite'}
          </button>
        ) : null}

        <button type="button" onClick={() => void sharePassport()} disabled={!persona}>
          Cast
        </button>

        {canUseWalletSupport && (
          <button type="button" onClick={() => void shareToX()} disabled={!persona}>
            X
          </button>
        )}

        <button
          type="button"
          onClick={() => void sharePassportImage()}
          disabled={!persona || isCreatingImage}
        >
          {isCreatingImage ? 'Making…' : 'Image'}
        </button>

        <button type="button" onClick={() => void copyPassport()} disabled={!persona}>
          Copy
        </button>

        <button
          type="button"
          className="ghost"
          onClick={() => void fetchPassport(false)}
          disabled={isLoading || isRerolling || !hasEnoughAssets || !canUseFarcasterPassport}
        >
          {isLoading ? 'Loading…' : 'Reload'}
        </button>
      </div>

      {notice && (
        <p className="pond-passport-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
