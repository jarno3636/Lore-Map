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
import type { Connector } from 'wagmi';
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

type PassportSdk = typeof sdk & {
  context?: { user?: MiniAppUserContext } | Promise<{ user?: MiniAppUserContext }>;
  isInMiniApp?: () => boolean | Promise<boolean>;
  quickAuth?: { fetch?: typeof fetch };
  actions?: {
    composeCast?: (params: { text: string; embeds?: string[] }) => Promise<void> | void;
    openUrl?: (url: string) => Promise<void> | void;
  };
};

type TobyworldAsset = (typeof TOBYWORLD_SWAP_TOKENS)[number];

type PassportSharePayload = {
  title: string;
  characteristic: string;
  name: string;
  handle: string;
  mark: string;
  streak: string;
  rites: string;
  power: string;
  assets: string;
  stamp: string;
  mode: string;
  photo?: string;
};

type ShareCreateResponse = {
  ok?: boolean;
  shareUrl?: string;
  imageUrl?: string;
  error?: string;
};

type PassportShareLinks = {
  shareUrl: string;
  imageUrl: string;
  png: Blob;
};

type WalletSupportResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

type FileShareNavigator = Navigator & {
  canShare?: (data: { files?: File[] }) => boolean;
  share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
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
] as const;

const WALLET_TITLES = [
  'Wallet Pond Inspector',
  'Two-Asset Tadpole With Papers',
  'Certified Ripple Supporter',
  'Suspiciously Official Pond Visitor',
  'Base Pond Stamp Holder',
] as const;

const WALLET_CHARACTERISTICS = [
  'Signed one harmless message and immediately became part of the pond bureaucracy.',
  'Carries enough Tobyworld energy to make the passport desk nod respectfully.',
  'Supports the rite without asking why the frog has a clipboard.',
  'Holds the required pond artifacts and now expects travel privileges.',
] as const;

const WALLET_HABITS = [
  'Checks token balances like a frog checking pockets before a road trip.',
  'Keeps two pond artifacts nearby in case paperwork appears.',
  'Pretends this is normal web behavior. It is pond behavior.',
] as const;

const WALLET_WARNINGS = [
  'May attempt to explain the passport desk to normal people.',
  'Do not let this wallet near unattended lily pads.',
  'Approved for pond entry, but still under frog observation.',
] as const;

function getPublicOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://toby-atlas.vercel.app';
}

function getQuickAuthFetch() {
  const quickAuth = (sdk as PassportSdk).quickAuth;
  return quickAuth?.fetch ? quickAuth.fetch.bind(quickAuth) : null;
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function compactText(value: string, maxLength: number) {
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean.length <= maxLength
    ? clean
    : `${clean.slice(0, maxLength - 1).trim()}…`;
}

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDisplayName(
  snapshot?: PassportSnapshot,
  contextUser?: MiniAppUserContext | null,
  address?: string,
) {
  return (
    contextUser?.displayName ||
    snapshot?.displayName ||
    contextUser?.username ||
    snapshot?.username ||
    (snapshot?.fid ? `FID ${snapshot.fid}` : null) ||
    (address ? shortenAddress(address) : null) ||
    'Unstamped Frog'
  );
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

function pickBackupFrogImage(seed: string | number | undefined) {
  const hash = hashText(String(seed ?? 'pond'));
  return PASSPORT_FROG_BACKUPS[hash % PASSPORT_FROG_BACKUPS.length];
}

function toBigIntBalance(value: unknown) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.floor(value));
  }
  if (typeof value === 'string' && value.trim()) return BigInt(value);
  return BigInt(0);
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

function createWalletPersona(address: string, heldAssets: TobyworldAsset[]): PondPersona {
  const heldSymbols = heldAssets.map((asset) => asset.symbol).join(' + ');
  const seed = hashText(`${address}:${heldSymbols}:${getTodayUtcDate()}`);
  const title = pick(WALLET_TITLES, seed);

  return {
    title,
    characteristic: pick(WALLET_CHARACTERISTICS, seed >> 3),
    strangeHabit: pick(WALLET_HABITS, seed >> 6),
    pondWarning: pick(WALLET_WARNINGS, seed >> 9),
    stamp: pick(['△ · 🐸 · 🍃', '🐸 · ⇄ · ✦', '🍃 · 🐸 · 🪪'], seed >> 12),
    shareText: `My Tobyworld Pond Passport has been stamped: ${title}.`,
  };
}

function createWalletSnapshot(address: string): PassportSnapshot {
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

function connectorLabel(connector: Connector) {
  const name = connector.name.toLowerCase();
  if (name.includes('farcaster')) return 'Farcaster Wallet';
  if (name.includes('walletconnect')) return 'WalletConnect';
  if (name.includes('base') || name.includes('coinbase')) return 'Base Account';
  if (name.includes('injected')) return 'Browser Wallet';
  return connector.name;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word;

    if (lines.length === maxLines - 1) break;
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  if (lines.join(' ').length < text.length && lines.length > 0) {
    let last = lines[lines.length - 1];

    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }

    lines[lines.length - 1] = `${last.trim()}…`;
  }

  lines.forEach((value, index) => {
    context.fillText(value, x, y + index * lineHeight);
  });

  return lines.length;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Passport artwork could not load.'));
    image.src = src;
  });
}

async function renderPassportPng(payload: PassportSharePayload) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');

  const background = context.createLinearGradient(0, 0, 1200, 800);
  background.addColorStop(0, '#173f49');
  background.addColorStop(0.5, '#0f2926');
  background.addColorStop(1, '#3a2713');
  context.fillStyle = background;
  context.fillRect(0, 0, 1200, 800);

  context.globalAlpha = 0.28;
  for (let index = 0; index < 84; index += 1) {
    const x = (index * 137) % 1200;
    const y = (index * 83) % 800;
    context.beginPath();
    context.arc(x, y, index % 5 === 0 ? 2 : 1, 0, Math.PI * 2);
    context.fillStyle = index % 3 === 0 ? '#f8dc84' : '#b9f4ff';
    context.fill();
  }
  context.globalAlpha = 1;

  roundedRect(context, 72, 64, 1056, 672, 48);
  const paper = context.createLinearGradient(72, 64, 1128, 736);
  paper.addColorStop(0, '#fff5d8');
  paper.addColorStop(0.58, '#f3dfae');
  paper.addColorStop(1, '#e7c982');
  context.fillStyle = paper;
  context.fill();
  context.strokeStyle = '#e5bd5c';
  context.lineWidth = 3;
  context.stroke();

  context.save();
  context.globalAlpha = 0.055;
  context.fillStyle = '#6b3a20';
  context.font = '900 170px Georgia, serif';
  context.translate(760, 520);
  context.rotate(-0.15);
  context.fillText('POND', 0, 0);
  context.restore();

  context.fillStyle = '#7b3f23';
  context.font = '900 25px Arial, sans-serif';
  context.fillText('TOBYWORLD POND PASSPORT', 132, 126);

  context.fillStyle = '#2f1f15';
  context.font =
    payload.name.length > 25
      ? '900 52px Georgia, serif'
      : '900 66px Georgia, serif';
  context.fillText(payload.name, 132, 194);

  context.fillStyle = '#7b3f23';
  context.font = '800 25px Arial, sans-serif';
  context.fillText(payload.handle, 132, 230);

  context.strokeStyle = 'rgba(91,53,26,0.20)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(132, 260);
  context.lineTo(790, 260);
  context.stroke();

  context.fillStyle = '#7b3f23';
  context.font = '900 19px Arial, sans-serif';
  context.fillText('POND TITLE', 132, 310);

  context.fillStyle = '#2f1f15';
  context.font =
    payload.title.length > 34
      ? '900 52px Georgia, serif'
      : '900 66px Georgia, serif';

  const titleLines = drawWrappedText(
    context,
    payload.title,
    132,
    370,
    670,
    58,
    2,
  );

  context.fillStyle = '#3c281b';
  context.font = '800 25px Arial, sans-serif';

  drawWrappedText(
    context,
    payload.characteristic,
    132,
    titleLines > 1 ? 474 : 436,
    680,
    33,
    2,
  );

  const stats = [
    ['STREAK', payload.streak],
    ['RITES', payload.rites],
    ['POWER', payload.power],
    ['ASSETS', payload.assets],
  ] as const;

  stats.forEach(([label, value], index) => {
    const x = 132 + index * 166;

    roundedRect(context, x, 624, 148, 78, 17);
    context.fillStyle = 'rgba(255,248,230,0.54)';
    context.fill();
    context.strokeStyle = 'rgba(91,53,26,0.16)';
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = '#2f1f15';
    context.font = '900 28px Arial, sans-serif';
    context.fillText(value, x + 18, 656);

    context.fillStyle = '#7b3f23';
    context.font = '900 13px Arial, sans-serif';
    context.fillText(label, x + 18, 684);
  });

  context.strokeStyle = 'rgba(91,53,26,0.16)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(844, 94);
  context.lineTo(844, 704);
  context.stroke();

  roundedRect(context, 886, 104, 178, 178, 34);
  context.fillStyle = 'rgba(255,248,230,0.48)';
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(91,53,26,0.34)';
  context.stroke();

  try {
    const image = await loadImage(
      new URL(
        payload.photo || PASSPORT_FROG_BACKUPS[0],
        getPublicOrigin(),
      ).toString(),
    );

    context.save();
    roundedRect(context, 894, 112, 162, 162, 28);
    context.clip();
    context.drawImage(image, 894, 112, 162, 162);
    context.restore();
  } catch {
    context.textAlign = 'center';
    context.font = '86px Arial, sans-serif';
    context.fillStyle = '#2f1f15';
    context.fillText('🐸', 975, 220);
    context.textAlign = 'left';
  }

  roundedRect(context, 876, 320, 198, 112, 55);
  context.fillStyle = 'rgba(255,248,230,0.34)';
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(123,63,35,0.48)';
  context.stroke();

  context.textAlign = 'center';
  context.fillStyle = '#2f1f15';
  context.font = '900 22px Arial, sans-serif';
  context.fillText(payload.stamp, 975, 362);

  context.fillStyle = '#7b3f23';
  context.font = '900 15px Arial, sans-serif';
  context.fillText(payload.mode, 975, 395);

  context.textAlign = 'left';
  context.fillStyle = '#7b3f23';
  context.font = '900 15px Arial, sans-serif';
  context.fillText('CURRENT MARK', 886, 488);

  context.fillStyle = '#2f1f15';
  context.font = '900 31px Georgia, serif';
  drawWrappedText(context, payload.mark, 886, 532, 190, 36, 2);

  context.fillStyle = '#7b3f23';
  context.font = '800 18px Georgia, serif';
  context.textAlign = 'center';
  context.fillText('We move not by leaps.', 975, 654);
  context.fillText('We move by stillness.', 975, 680);
  context.textAlign = 'left';

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('PNG creation failed.'));
      },
      'image/png',
      0.96,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Image encoding failed.'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Image reading failed.'));
    };

    reader.readAsDataURL(blob);
  });
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

async function openExternalUrl(url: string) {
  const action = (sdk as PassportSdk).actions?.openUrl;

  if (action) {
    await Promise.resolve(action(url));
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
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isCreatingImage, setIsCreatingImage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [freshInkKey, setFreshInkKey] = useState(0);
  const [pfpFailed, setPfpFailed] = useState(false);

  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });

  const persona = data?.persona;
  const snapshot = data?.snapshot;
  const canUseFarcasterPassport = Boolean(contextUser?.fid && getQuickAuthFetch());
  const isFarcasterSession = Boolean(isMiniApp || contextUser?.fid);
  const assetCount = heldAssets.length;
  const hasEnoughAssets = assetCount >= REQUIRED_ASSET_COUNT;
  const fallbackFrogImage = pickBackupFrogImage(snapshot?.fid || address);
  const pfpUrl = !pfpFailed ? contextUser?.pfpUrl : undefined;
  const photoSrc = pfpUrl || fallbackFrogImage;
  const renderedMark = snapshot?.currentMark ?? 'Unstamped Frog';

  const stats = useMemo(
    () => [
      { label: 'Streak', value: `${formatNumber(snapshot?.streakCount)}d` },
      { label: 'Best', value: `${formatNumber(snapshot?.bestStreak)}d` },
      { label: 'Rites', value: formatNumber(snapshot?.totalCompletions) },
      { label: 'Power', value: `${formatNumber(snapshot?.currentEchoPower)}x` },
    ],
    [snapshot],
  );

  const visibleConnectors = useMemo(() => {
    const seen = new Set<string>();

    return connectors.filter((connector) => {
      const label = connectorLabel(connector);

      if (seen.has(label)) return false;

      seen.add(label);
      return true;
    });
  }, [connectors]);

  const checkWalletAssets = useCallback(async () => {
    if (!isConnected || !address || !publicClient) {
      setHeldAssets([]);
      return;
    }

    setIsCheckingAssets(true);

    try {
      const results = await Promise.allSettled(
        TOBYWORLD_SWAP_TOKENS.map(async (token) => ({
          token,
          balance: await publicClient.readContract({
            address: token.address,
            abi: ERC20_BALANCE_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
        })),
      );

      setHeldAssets(
        results
          .map((result) => {
            if (result.status !== 'fulfilled') return null;

            return toBigIntBalance(result.value.balance) > BigInt(0)
              ? result.value.token
              : null;
          })
          .filter((token): token is TobyworldAsset => token !== null),
      );
    } finally {
      setIsCheckingAssets(false);
    }
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    void (async () => {
      try {
        const passportSdk = sdk as PassportSdk;
        const inside = passportSdk.isInMiniApp
          ? await Promise.resolve(passportSdk.isInMiniApp())
          : false;
        const context = await Promise.resolve(passportSdk.context);

        setIsMiniApp(Boolean(inside || context?.user));
        setContextUser(context?.user ?? null);
      } catch {
        setIsMiniApp(false);
        setContextUser(null);
      }
    })();
  }, []);

  useEffect(() => {
    void checkWalletAssets();

    if (!isConnected || !address) return undefined;

    const interval = window.setInterval(() => {
      void checkWalletAssets();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [address, checkWalletAssets, isConnected]);

  const connectWallet = useCallback(
    async (connector?: Connector) => {
      const selected =
        connector ??
        (isFarcasterSession
          ? connectors.find((item) => /farcaster/i.test(item.name))
          : connectors.find((item) => /base|coinbase/i.test(item.name))) ??
        connectors.find((item) => /walletconnect/i.test(item.name)) ??
        connectors.find((item) => /injected/i.test(item.name)) ??
        connectors[0];

      if (!selected) {
        setNotice('No wallet connector is available in this browser.');
        return;
      }

      try {
        setNotice(null);
        await connectAsync({ connector: selected });
        setNotice('Wallet connected. Checking Tobyworld assets…');
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Wallet connection failed.',
        );
      }
    },
    [connectAsync, connectors, isFarcasterSession],
  );

  const fetchPassport = useCallback(
    async (reroll = false) => {
      const authFetch = getQuickAuthFetch();

      if (!authFetch || !contextUser?.fid) return;
      if (!isConnected || !address || !hasEnoughAssets) return;

      if (reroll) {
        setIsRerolling(true);
      } else {
        setIsLoading(true);
      }

      setNotice(null);

      try {
        const response = await authFetch(
          `${getPublicOrigin()}/api/tobyworld/pond-passport`,
          {
            method: reroll ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          },
        );

        const nextData = (await response.json()) as PassportResponse;

        if (!response.ok) {
          throw new Error(nextData.error || 'Passport load failed.');
        }

        setData(nextData);
        setFreshInkKey((value) => value + 1);
        setNotice(reroll ? 'New stamp loaded.' : 'Passport loaded.');
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Passport load failed.',
        );
      } finally {
        setIsLoading(false);
        setIsRerolling(false);
      }
    },
    [address, contextUser?.fid, hasEnoughAssets, isConnected],
  );

  useEffect(() => {
    if (
      !canUseFarcasterPassport ||
      !isConnected ||
      !hasEnoughAssets ||
      persona
    ) {
      return;
    }

    void fetchPassport(false);
  }, [
    canUseFarcasterPassport,
    fetchPassport,
    hasEnoughAssets,
    isConnected,
    persona,
  ]);

  async function supportWalletPassport() {
    if (!address) {
      await connectWallet();
      return;
    }

    if (!hasEnoughAssets) {
      setNotice(
        `This wallet holds ${assetCount}/${REQUIRED_ASSET_COUNT} required assets.`,
      );
      return;
    }

    setIsSupporting(true);
    setNotice(null);

    try {
      const message = buildWalletSupportMessage(address);
      const signature = await signMessageAsync({ message });

      const response = await fetch('/api/tobyworld/wallet-support-rite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature,
        }),
      });

      const result = (await response.json()) as WalletSupportResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Wallet passport failed.');
      }

      setData({
        ok: true,
        persona: createWalletPersona(address, heldAssets),
        snapshot: createWalletSnapshot(address),
        source: 'wallet',
        generatedOn: getTodayUtcDate(),
        limits: {
          rerollsRemaining: 0,
          cooldownSeconds: 0,
        },
      });

      setFreshInkKey((value) => value + 1);
      setNotice(result.message || 'Wallet passport stamped.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Wallet passport failed.',
      );
    } finally {
      setIsSupporting(false);
    }
  }

  function buildSharePayload(): PassportSharePayload {
    if (!persona) {
      throw new Error('No passport is ready.');
    }

    return {
      title: compactText(persona.title, 72),
      characteristic: compactText(persona.characteristic, 145),
      name: compactText(
        getDisplayName(snapshot, contextUser, address),
        52,
      ),
      handle: compactText(
        getHandle(snapshot, contextUser, address),
        52,
      ),
      mark: compactText(renderedMark, 42),
      streak: `${formatNumber(snapshot?.streakCount)}d`,
      rites: formatNumber(snapshot?.totalCompletions),
      power: `${formatNumber(snapshot?.currentEchoPower)}x`,
      assets: `${heldAssets.length}/${TOTAL_ASSET_COUNT}`,
      stamp: compactText(persona.stamp, 32),
      mode: data?.source === 'wallet' ? 'WALLET SUPPORTER' : 'APPROVED',
      photo: fallbackFrogImage,
    };
  }

  function buildCastText() {
    if (!persona) return '';

    const name = getDisplayName(snapshot, contextUser, address);
    const handle = getHandle(snapshot, contextUser, address);

    return [
      `${name} received a Tobyworld Pond Passport.`,
      '',
      `Title: ${persona.title}`,
      `Trait: ${persona.characteristic}`,
      '',
      `${handle} · ${formatNumber(snapshot?.streakCount)}d streak · ${formatNumber(
        snapshot?.currentEchoPower,
      )}x echo power`,
      '',
      'The pond remains professionally concerned.',
    ].join('\n');
  }

  async function createShare(): Promise<PassportShareLinks> {
    const payload = buildSharePayload();
    const png = await renderPassportPng(payload);
    const imageDataUrl = await blobToDataUrl(png);

    const response = await fetch('/api/tobyworld/passport-share/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        payload,
        imageDataUrl,
      }),
    });

    const result = (await response.json()) as ShareCreateResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Unable to create passport share.');
    }

    const shareUrl = result.shareUrl;
    const imageUrl = result.imageUrl;

    if (typeof shareUrl !== 'string' || shareUrl.length === 0) {
      throw new Error('Passport share route did not return a valid share URL.');
    }

    if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
      throw new Error('Passport share route did not return a valid image URL.');
    }

    return {
      shareUrl,
      imageUrl,
      png,
    };
  }

  async function sharePassport() {
    if (!persona) return;

    setIsCreatingShare(true);
    setNotice('Creating passport image…');

    try {
      const links = await createShare();
      const shareUrl: string = links.shareUrl;
      const composeCast = (sdk as PassportSdk).actions?.composeCast;
      const text = buildCastText();

      if (isFarcasterSession && composeCast) {
        await Promise.resolve(
          composeCast({
            text,
            embeds: [shareUrl],
          }),
        );

        setNotice('Passport cast opened with its image attached.');
        return;
      }

      const copied = await copyText(`${text}\n\n${shareUrl}`);

      setNotice(
        copied
          ? 'Passport share copied.'
          : 'Passport share created.',
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

  async function shareToX() {
    if (!persona) return;

    setIsCreatingShare(true);
    setNotice('Creating passport image…');

    try {
      const links = await createShare();
      const shareUrl: string = links.shareUrl;
      const intent = new URL('https://twitter.com/intent/tweet');

      intent.searchParams.set('text', buildCastText());
      intent.searchParams.set('url', shareUrl);

      await openExternalUrl(intent.toString());
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

  async function savePng() {
    if (!persona) return;

    setIsCreatingImage(true);
    setNotice('Drawing passport image…');

    try {
      const png = await renderPassportPng(buildSharePayload());
      const file = new File(
        [png],
        'tobyworld-pond-passport.png',
        { type: 'image/png' },
      );

      const shareNavigator = navigator as FileShareNavigator;

      if (
        shareNavigator.canShare?.({ files: [file] }) &&
        shareNavigator.share
      ) {
        await shareNavigator.share({
          title: 'Tobyworld Pond Passport',
          text: buildCastText(),
          files: [file],
        });

        setNotice('Image share sheet opened.');
        return;
      }

      const objectUrl = URL.createObjectURL(png);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = 'tobyworld-pond-passport.png';
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 10_000);

      setNotice('Passport PNG downloaded.');
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        setNotice('Image share cancelled.');
      } else {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Unable to save image.',
        );
      }
    } finally {
      setIsCreatingImage(false);
    }
  }

  async function copyPassport() {
    if (!persona) return;

    setIsCreatingShare(true);
    setNotice('Creating passport image…');

    try {
      const links = await createShare();
      const shareUrl: string = links.shareUrl;
      const copied = await copyText(
        `${buildCastText()}\n\n${shareUrl}`,
      );

      setNotice(
        copied
          ? 'Passport and image link copied.'
          : 'Copy failed.',
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

  const statusLabel = !isConnected
    ? 'Wallet needed'
    : isCheckingAssets
      ? 'Checking wallet assets…'
      : isLoading
        ? 'Loading passport…'
        : isRerolling
          ? 'Rerolling stamp…'
          : !hasEnoughAssets
            ? `${assetCount}/${REQUIRED_ASSET_COUNT} assets detected`
            : persona
              ? 'Passport ready'
              : 'Ready for pond stamp';

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
            {data?.source === 'wallet'
              ? 'Wallet stamp'
              : data?.source
                ? 'Pond stamp'
                : 'Not loaded'}
          </strong>
          <small>{data?.generatedOn ?? 'Pending'}</small>
        </div>
      </div>

      {!isConnected && (
        <div className="pond-passport-gate">
          <strong>The passport desk is open.</strong>
          <p>
            Connect any supported wallet. A wallet holding any two
            Tobyworld assets can stamp a passport.
          </p>

          <div className="pond-passport-connector-grid">
            {visibleConnectors.map((connector) => (
              <button
                type="button"
                key={connector.uid}
                onClick={() => void connectWallet(connector)}
                disabled={isConnecting}
              >
                {isConnecting
                  ? 'Opening…'
                  : connectorLabel(connector)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isConnected &&
        !hasEnoughAssets &&
        !isCheckingAssets && (
          <div className="pond-passport-gate">
            <strong>Two-asset gate.</strong>
            <p>
              This wallet holds {assetCount}/{REQUIRED_ASSET_COUNT}{' '}
              required assets.
            </p>

            <div className="pond-passport-asset-pills">
              {TOBYWORLD_SWAP_TOKENS.map((token) => {
                const held = heldAssets.some(
                  (item) => item.id === token.id,
                );

                return (
                  <span
                    className={held ? 'is-held' : ''}
                    key={token.id}
                  >
                    {held ? '✓ ' : ''}
                    {token.symbol}
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              className="ghost"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          </div>
        )}

      {isConnected &&
        hasEnoughAssets &&
        !persona &&
        !canUseFarcasterPassport && (
          <div className="pond-passport-gate">
            <strong>Wallet supporter mode.</strong>
            <p>
              Sign one free message to verify the wallet and stamp its
              passport. No gas or token approval.
            </p>

            <button
              type="button"
              onClick={() => void supportWalletPassport()}
              disabled={isSupporting || isSigning}
            >
              {isSupporting || isSigning
                ? 'Signing…'
                : 'Stamp Wallet Passport'}
            </button>
          </div>
        )}

      <article
        className={`pond-passport-card ${
          persona ? 'is-ready' : 'is-pending'
        } ${!hasEnoughAssets ? 'is-locked' : ''}`}
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
            <img
              src={photoSrc}
              alt=""
              aria-hidden="true"
              onError={() => setPfpFailed(true)}
            />
          </div>

          <div className="pond-passport-identity">
            <small>ISSUED TO</small>
            <h3>
              {getDisplayName(snapshot, contextUser, address)}
            </h3>
            <p>
              {getHandle(snapshot, contextUser, address)}
              {snapshot?.fid ? ` · FID ${snapshot.fid}` : ''}
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
                : 'Hold at least two Tobyworld assets to reveal your stamp.')}
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
        {isConnected && canUseFarcasterPassport && (
          <button
            type="button"
            className="primary"
            onClick={() => void fetchPassport(true)}
            disabled={
              isRerolling ||
              isLoading ||
              !persona ||
              (data?.limits?.rerollsRemaining ?? 0) <= 0
            }
          >
            {isRerolling ? 'Rerolling…' : 'Reroll'}
          </button>
        )}

        {isConnected && !canUseFarcasterPassport && (
          <button
            type="button"
            className="primary"
            onClick={() => void supportWalletPassport()}
            disabled={
              !hasEnoughAssets ||
              isSupporting ||
              isSigning
            }
          >
            {isSupporting || isSigning
              ? 'Signing…'
              : persona
                ? 'Restamp'
                : 'Stamp'}
          </button>
        )}

        <button
          type="button"
          onClick={() => void sharePassport()}
          disabled={!persona || isCreatingShare}
        >
          {isCreatingShare
            ? 'Creating…'
            : isFarcasterSession
              ? 'Cast'
              : 'Share'}
        </button>

        {!isFarcasterSession && (
          <button
            type="button"
            onClick={() => void shareToX()}
            disabled={!persona || isCreatingShare}
          >
            X
          </button>
        )}

        <button
          type="button"
          onClick={() => void savePng()}
          disabled={!persona || isCreatingImage}
        >
          {isCreatingImage ? 'Drawing…' : 'Save PNG'}
        </button>

        <button
          type="button"
          onClick={() => void copyPassport()}
          disabled={!persona || isCreatingShare}
        >
          Copy
        </button>

        {isConnected && (
          <button
            type="button"
            className="ghost"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        )}
      </div>

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
