import { getSupabaseAdmin } from '@/lib/supabase/server';

export type PassportSharePayload = {
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

export type StoredPassportShare = {
  id: string;
  payload: PassportSharePayload;
  imageUrl: string;
  createdAt: string | null;
};

const DEFAULT_PAYLOAD: PassportSharePayload = {
  title: 'Awaiting Pond Stamp',
  characteristic: 'The pond reviewed the file and became professionally concerned.',
  name: 'Unstamped Frog',
  handle: 'Tobyworld traveler',
  mark: 'Unstamped Frog',
  streak: '0d',
  rites: '0',
  power: '0x',
  assets: '0/3',
  stamp: '△ · 🐸 · 🍃',
  mode: 'APPROVED',
};

function cleanString(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback;
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean ? clean.slice(0, maxLength) : fallback;
}

function cleanPhoto(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  if (!clean.startsWith('/images/passport/')) return undefined;
  if (!clean.toLowerCase().endsWith('.png')) return undefined;
  return clean.slice(0, 180);
}

export function cleanPassportSharePayload(value: unknown): PassportSharePayload {
  const input =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    title: cleanString(input.title, DEFAULT_PAYLOAD.title, 72),
    characteristic: cleanString(
      input.characteristic,
      DEFAULT_PAYLOAD.characteristic,
      145,
    ),
    name: cleanString(input.name, DEFAULT_PAYLOAD.name, 52),
    handle: cleanString(input.handle, DEFAULT_PAYLOAD.handle, 52),
    mark: cleanString(input.mark, DEFAULT_PAYLOAD.mark, 42),
    streak: cleanString(input.streak, DEFAULT_PAYLOAD.streak, 12),
    rites: cleanString(input.rites, DEFAULT_PAYLOAD.rites, 12),
    power: cleanString(input.power, DEFAULT_PAYLOAD.power, 12),
    assets: cleanString(input.assets, DEFAULT_PAYLOAD.assets, 12),
    stamp: cleanString(input.stamp, DEFAULT_PAYLOAD.stamp, 32),
    mode: cleanString(input.mode, DEFAULT_PAYLOAD.mode, 32),
    photo: cleanPhoto(input.photo),
  };
}

export function createPassportShareId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20).toLowerCase();
}

export function parsePassportPngDataUrl(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Passport image is missing.');
  }

  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value);

  if (!match) {
    throw new Error('Passport image must be a PNG data URL.');
  }

  const buffer = Buffer.from(match[1], 'base64');

  if (buffer.length < 1_000) throw new Error('Passport image is empty.');
  if (buffer.length > 4_000_000) throw new Error('Passport image is too large.');

  return buffer;
}

export async function savePassportShare({
  id,
  payload,
  imageUrl,
}: {
  id: string;
  payload: PassportSharePayload;
  imageUrl: string;
}) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('tobyworld_passport_shares').insert({
    id,
    payload,
    image_url: imageUrl,
  });

  if (error) {
    throw new Error(`Passport share save failed: ${error.message}`);
  }
}

export async function getPassportShare(
  id: string,
): Promise<StoredPassportShare | null> {
  const safeId = id.trim().toLowerCase();
  if (!/^[a-z0-9]{12,24}$/.test(safeId)) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('tobyworld_passport_shares')
    .select('id, payload, image_url, created_at')
    .eq('id', safeId)
    .maybeSingle<{
      id: string;
      payload: unknown;
      image_url: string | null;
      created_at: string | null;
    }>();

  if (error) throw new Error(`Passport share read failed: ${error.message}`);
  if (!data?.payload || !data.image_url) return null;

  return {
    id: data.id,
    payload: cleanPassportSharePayload(data.payload),
    imageUrl: data.image_url,
    createdAt: data.created_at,
  };
}
