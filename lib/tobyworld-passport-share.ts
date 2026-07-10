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

  if (!clean) return fallback;

  return clean.slice(0, maxLength);
}

function cleanPhoto(value: unknown) {
  if (typeof value !== 'string') return undefined;

  const clean = value.trim();

  if (!clean.startsWith('/images/passport/')) return undefined;
  if (!clean.endsWith('.png')) return undefined;

  return clean.slice(0, 180);
}

export function cleanPassportSharePayload(value: unknown): PassportSharePayload {
  const input =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

  return {
    title: cleanString(input.title, DEFAULT_PAYLOAD.title, 72),
    characteristic: cleanString(input.characteristic, DEFAULT_PAYLOAD.characteristic, 145),
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

function makeShareId() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16)
    .toLowerCase();
}

export async function createPassportShare(payload: PassportSharePayload) {
  const supabase = getSupabaseAdmin();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = makeShareId();

    const { error } = await supabase.from('tobyworld_passport_shares').insert({
      id,
      payload,
    });

    if (!error) return id;

    if (error.code !== '23505') {
      throw new Error(error.message);
    }
  }

  throw new Error('Unable to create passport share.');
}

export async function getPassportShare(id: string) {
  const safeId = id.trim().toLowerCase();

  if (!/^[a-z0-9]{8,24}$/.test(safeId)) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_passport_shares')
    .select('payload')
    .eq('id', safeId)
    .maybeSingle();

  if (error || !data?.payload) {
    return null;
  }

  return cleanPassportSharePayload(data.payload);
}
