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

function getOrigin() {
  if (typeof window === 'undefined') return 'https://toby-atlas.vercel.app';
  return window.location.origin;
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

function getSourceLabel(source?: string) {
  if (!source) return 'Not loaded';
  if (source === 'gemini') return 'AI stamp';
  if (source === 'wallet') return 'Wallet stamp';
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
    shareText: `My Tobyworld Web Supporter Passport has been stamped: ${title}. Held path: ${heldSymbols}. The pond remains professionally concerned. ${stamp}`,
  };
}

function createWalletSupporterSnapshot(address: string): PassportSnapshot {
  return {
    fid: 0,
    username: null,
    displayName: `Wallet ${shortenAddress(address)}`,
    currentMark: 'Web Supporter',
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
  if (!isConnected) return 'Wallet needed';
  if (isCheckingAssets) return 'Checking wallet assets…';
  if (isLoading) return 'Loading passport…';
  if (isRerolling) return 'Rerolling stamp…';

  if (!hasEnoughAssets) {
    return `${assetCount}/${REQUIRED_ASSET_COUNT} assets detected`;
  }

  if (data?.persona) {
    const rerolls = data.source === 'wallet' ? 0 : data.limits?.rerollsRemaining ?? 0;

    return data.source === 'wallet'
      ? 'Loaded · Web supporter stamp'
      : `Loaded · ${rerolls} reroll${rerolls === 1 ? '' : 's'} left`;
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

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient,
) {
  drawRoundedRect(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth = 1,
) {
  drawRoundedRect(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
}

function wrapText({
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  maxLines: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = context.measureText(testLine).width;

    if (width > maxWidth && line) {
      lines.push(line);
      line = word;

      if (lines.length >= maxLines) break;
    } else {
      line = testLine;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  lines.forEach((currentLine, index) => {
    context.fillText(currentLine, x, y + index * lineHeight);
  });
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load.'));
    image.src = src.startsWith('http') ? src : `${getOrigin()}${src}`;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to create passport image.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

async function createPassportImageBlob({
  persona,
  snapshot,
  contextUser,
  address,
  photoSrc,
  heldAssets,
  source,
}: {
  persona: PondPersona;
  snapshot?: PassportSnapshot;
  contextUser: MiniAppUserContext | null;
  address?: string;
  photoSrc?: string;
  heldAssets: TobyworldAsset[];
  source?: string;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create image context.');
  }

  const background = context.createLinearGradient(0, 0, 1200, 630);
  background.addColorStop(0, '#061419');
  background.addColorStop(0.45, '#172017');
  background.addColorStop(1, '#3a2714');
  context.fillStyle = background;
  context.fillRect(0, 0, 1200, 630);

  const glowBlue = context.createRadialGradient(220, 110, 10, 220, 110, 420);
  glowBlue.addColorStop(0, 'rgba(141, 233, 255, 0.42)');
  glowBlue.addColorStop(1, 'rgba(141, 233, 255, 0)');
  context.fillStyle = glowBlue;
  context.fillRect(0, 0, 1200, 630);

  const card = context.createLinearGradient(92, 72, 1108, 558);
  card.addColorStop(0, '#fff8e6');
  card.addColorStop(1, '#e8cf99');

  fillRoundedRect(context, 76, 64, 1048, 502, 46, card);
  strokeRoundedRect(context, 76, 64, 1048, 502, 46, 'rgba(255, 227, 160, 0.72)', 3);

  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = '#5b351a';
  context.font = '900 160px Georgia, serif';
  context.fillText('POND', 706, 438);
  context.restore();

  context.fillStyle = '#7b3f23';
  context.font = '900 24px Arial, sans-serif';
  context.fillText('TOBYWORLD POND PASSPORT', 132, 126);

  context.fillStyle = '#2f1f15';
  context.font = '900 58px Georgia, serif';
  context.fillText(getDisplayName(snapshot, contextUser, address), 132, 188);

  context.fillStyle = '#7b3f23';
  context.font = '800 25px Arial, sans-serif';
  context.fillText(getHandle(snapshot, contextUser, address), 134, 226);

  const photoX = 858;
  const photoY = 102;
  const photoSize = 166;

  fillRoundedRect(context, photoX, photoY, photoSize, photoSize, 34, 'rgba(255, 248, 230, 0.55)');
  strokeRoundedRect(context, photoX, photoY, photoSize, photoSize, 34, 'rgba(91, 53, 26, 0.32)', 3);

  try {
    if (!photoSrc) throw new Error('No photo source.');

    const image = await loadCanvasImage(photoSrc);

    context.save();
    drawRoundedRect(context, photoX + 8, photoY + 8, photoSize - 16, photoSize - 16, 28);
    context.clip();
    context.drawImage(image, photoX + 8, photoY + 8, photoSize - 16, photoSize - 16);
    context.restore();
  } catch {
    context.fillStyle = '#2f1f15';
    context.font = '92px Arial, sans-serif';
    context.fillText('🐸', photoX + 38, photoY + 112);
  }

  context.fillStyle = '#7b3f23';
  context.font = '900 21px Arial, sans-serif';
  context.fillText('POND TITLE', 132, 294);

  context.fillStyle = '#2f1f15';
  context.font = '900 66px Georgia, serif';
  wrapText({
    context,
    text: persona.title,
    x: 132,
    y: 354,
    maxWidth: 680,
    lineHeight: 62,
    maxLines: 2,
  });

  context.fillStyle = '#3c281b';
  context.font = '800 26px Arial, sans-serif';
  wrapText({
    context,
    text: persona.characteristic,
    x: 132,
    y: 466,
    maxWidth: 710,
    lineHeight: 32,
    maxLines: 2,
  });

  fillRoundedRect(context, 858, 300, 204, 96, 999, 'rgba(255, 248, 230, 0.42)');
  strokeRoundedRect(context, 858, 300, 204, 96, 999, 'rgba(123, 63, 35, 0.42)', 4);

  context.fillStyle = '#2f1f15';
  context.font = '900 25px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(persona.stamp, 960, 344);

  context.fillStyle = '#7b3f23';
  context.font = '900 18px Arial, sans-serif';
  context.fillText(source === 'wallet' ? 'WEB SUPPORTER' : 'APPROVED', 960, 374);
  context.textAlign = 'start';

  const statItems = [
    ['STREAK', `${formatNumber(snapshot?.streakCount)}d`],
    ['RITES', formatNumber(snapshot?.totalCompletions)],
    ['POWER', `${formatNumber(snapshot?.currentEchoPower)}x`],
    ['ASSETS', `${heldAssets.length}/3`],
  ] as const;

  statItems.forEach(([label, value], index) => {
    const x = 132 + index * 162;

    fillRoundedRect(context, x, 506, 132, 72, 18, 'rgba(255, 248, 230, 0.38)');
    context.fillStyle = '#2f1f15';
    context.font = '900 27px Arial, sans-serif';
    context.fillText(value, x + 16, 538);

    context.fillStyle = '#7b3f23';
    context.font = '900 14px Arial, sans-serif';
    context.fillText(label, x + 16, 562);
  });

  context.fillStyle = '#7b3f23';
  context.font = '900 20px Arial, sans-serif';
  context.fillText('We move not by leaps. We move by stillness.', 718, 544);

  context.fillStyle = '#2f1f15';
  context.font = '900 22px Arial, sans-serif';
  context.fillText('toby-atlas.vercel.app', 718, 574);

  return canvasToBlob(canvas);
}

export function TobyworldPondPassport() {
  const [data, setData] = useState<PassportResponse | null>(null);
  const [contextUser, setContextUser] = useState<MiniAppUserContext | null>(null);
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
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });

  const persona = data?.persona;
  const snapshot = data?.snapshot;
  const hasQuickAuth = Boolean(getBoundQuickAuthFetch());

  const fallbackFrogImage = pickBackupFrogImage(snapshot?.fid || address);
  const pfpUrl = !pfpFailed ? contextUser?.pfpUrl : undefined;
  const photoSrc = pfpUrl || (!frogImageFailed ? fallbackFrogImage : undefined);

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
      const context = await Promise.resolve((sdk as PassportSdk).context);

      if (context?.user) {
        setContextUser(context.user);
      }
    } catch {
      setContextUser(null);
    }
  }, []);

  const connectWallet = useCallback(() => {
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
  }, [connect, connectors]);

  const fetchPassport = useCallback(
    async (reroll = false) => {
      const authFetch = getBoundQuickAuthFetch();

      if (!isConnected || !address) {
        setNotice('Connect a wallet that holds at least two Tobyworld assets to stamp a passport.');
        connectWallet();
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
          'Wallet gate passed. Press Support Rite to sign a free message and receive a Web Supporter Passport. No gas, no transaction, no token approval.',
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
        const response = await authFetch(`${getOrigin()}/api/tobyworld/pond-passport`, {
          method: reroll ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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
    if (!hasQuickAuth) return;
    if (!canUsePassport || data?.persona) return;

    void fetchPassport(false);
  }, [canUsePassport, data?.persona, fetchPassport, hasQuickAuth]);

  async function supportRiteWithWallet() {
    if (!address) {
      connectWallet();
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

      const response = await fetch('/api/tobyworld/wallet-support-rite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setNotice(
        result.message ||
          'The wallet has supported today’s pond rite. Web Supporter Passport stamped.',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The wallet stamp failed.');
    } finally {
      setIsSupporting(false);
    }
  }

  async function sharePassport() {
    if (!persona) return;

    const text = persona.shareText;
    const composeCast = (sdk as PassportSdk).actions?.composeCast;

    try {
      if (composeCast) {
        await Promise.resolve(
          composeCast({
            text,
            embeds: [getOrigin()],
          }),
        );

        setNotice('Passport cast opened.');
        return;
      }

      const copied = await copyText(text);
      setNotice(copied ? 'Passport share text copied.' : text);
    } catch {
      const copied = await copyText(text);
      setNotice(copied ? 'Passport share text copied.' : text);
    }
  }

  async function shareToX() {
    if (!persona) return;

    const url = new URL('https://twitter.com/intent/tweet');
    url.searchParams.set('text', persona.shareText);
    url.searchParams.set('url', getOrigin());

    await openExternalUrl(url.toString());
  }

  async function copyPassport() {
    if (!persona) return;

    const copied = await copyText(persona.shareText);
    setNotice(copied ? 'Passport share text copied.' : persona.shareText);
  }

  async function sharePassportImage() {
    if (!persona) return;

    try {
      setIsCreatingImage(true);
      setNotice(null);

      const blob = await createPassportImageBlob({
        persona,
        snapshot,
        contextUser,
        address,
        photoSrc,
        heldAssets,
        source: data?.source,
      });

      const file = new File([blob], 'tobyworld-pond-passport.png', {
        type: 'image/png',
      });

      const shareNavigator = navigator as FileShareNavigator;

      if (shareNavigator.canShare?.({ files: [file] }) && shareNavigator.share) {
        await shareNavigator.share({
          title: 'Tobyworld Pond Passport',
          text: persona.shareText,
          files: [file],
        });

        setNotice('Passport image share opened.');
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = 'tobyworld-pond-passport.png';
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      setNotice('Passport image downloaded.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to create passport image.');
    } finally {
      setIsCreatingImage(false);
    }
  }

  return (
    <section className="pond-passport" aria-label="Tobyworld Pond Passport">
      <div className="pond-passport-glow" aria-hidden="true" />

      <div className="pond-passport-toolbar">
        <div>
          <p>POND PASSPORT</p>
          <span>{statusLabel}</span>
        </div>

        <div className="pond-passport-toolbar-chip">
          <strong>{getSourceLabel(data?.source)}</strong>
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

          <button type="button" onClick={connectWallet} disabled={isConnecting}>
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

      {isConnected && hasEnoughAssets && !persona && !hasQuickAuth && (
        <div className="pond-passport-gate">
          <strong>Wallet supporter mode.</strong>
          <p>
            This wallet passed the two-asset gate. Press Support Rite to sign a free
            message, add one echo to the community rite, and stamp a Web Supporter
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
            <strong>{snapshot?.currentMark ?? 'Unstamped Frog'}</strong>
          </div>

          <div className="pond-passport-approved">
            <span>{persona?.stamp ?? '△ · 🐸 · 🍃'}</span>
            <b>{hasEnoughAssets ? 'APPROVED' : 'LOCKED'}</b>
          </div>
        </div>
      </article>

      <div className="pond-passport-actions">
        {!isConnected ? (
          <button type="button" className="primary" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? 'Opening…' : 'Connect'}
          </button>
        ) : hasQuickAuth ? (
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
        ) : (
          <button
            type="button"
            className="primary"
            onClick={() => void supportRiteWithWallet()}
            disabled={!hasEnoughAssets || isSupporting || isSigning}
          >
            {isSupporting || isSigning ? 'Signing…' : persona ? 'Support Again' : 'Support Rite'}
          </button>
        )}

        <button
          type="button"
          onClick={() => void supportRiteWithWallet()}
          disabled={!isConnected || !hasEnoughAssets || isSupporting || isSigning}
        >
          {isSupporting || isSigning ? 'Signing…' : 'Support'}
        </button>

        <button type="button" onClick={() => void sharePassport()} disabled={!persona}>
          Cast
        </button>

        <button type="button" onClick={() => void shareToX()} disabled={!persona}>
          X
        </button>

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
          disabled={isLoading || isRerolling || !hasEnoughAssets || !hasQuickAuth}
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
