import { randomBytes } from 'node:crypto';
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

type PassportShareRow = {
  payload: unknown;
};

const DEFAULT_PHOTO = '/images/passport/frog-lily-agent.png';

const DEFAULT_PAYLOAD: PassportSharePayload = {
  title: 'Awaiting Pond Stamp',
  characteristic:
    'The pond reviewed the file and became professionally concerned.',
  name: 'Unstamped Frog',
  handle: 'Tobyworld traveler',
  mark: 'Unstamped Frog',
  streak: '0d',
  rites: '0',
  power: '1x',
  assets: '0/3',
  stamp: '△ · 🐸 · 🍃',
  mode: 'APPROVED',
  photo: DEFAULT_PHOTO,
};

function cleanString(
  value: unknown,
  fallback: string,
  maxLength: number,
) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const clean = value.trim().replace(/\s+/g, ' ');

  if (!clean) {
    return fallback;
  }

  return clean.slice(0, maxLength);
}

function cleanPhoto(value: unknown) {
  if (typeof value !== 'string') {
    return DEFAULT_PHOTO;
  }

  const clean = value.trim();

  if (!clean.startsWith('/images/passport/')) {
    return DEFAULT_PHOTO;
  }

  if (!/\.(png|jpg|jpeg|webp)$/i.test(clean)) {
    return DEFAULT_PHOTO;
  }

  return clean.slice(0, 220);
}

export function cleanPassportSharePayload(
  value: unknown,
): PassportSharePayload {
  const input =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    title: cleanString(
      input.title,
      DEFAULT_PAYLOAD.title,
      72,
    ),
    characteristic: cleanString(
      input.characteristic,
      DEFAULT_PAYLOAD.characteristic,
      145,
    ),
    name: cleanString(
      input.name,
      DEFAULT_PAYLOAD.name,
      52,
    ),
    handle: cleanString(
      input.handle,
      DEFAULT_PAYLOAD.handle,
      52,
    ),
    mark: cleanString(
      input.mark,
      DEFAULT_PAYLOAD.mark,
      42,
    ),
    streak: cleanString(
      input.streak,
      DEFAULT_PAYLOAD.streak,
      12,
    ),
    rites: cleanString(
      input.rites,
      DEFAULT_PAYLOAD.rites,
      12,
    ),
    power: cleanString(
      input.power,
      DEFAULT_PAYLOAD.power,
      12,
    ),
    assets: cleanString(
      input.assets,
      DEFAULT_PAYLOAD.assets,
      12,
    ),
    stamp: cleanString(
      input.stamp,
      DEFAULT_PAYLOAD.stamp,
      32,
    ),
    mode: cleanString(
      input.mode,
      DEFAULT_PAYLOAD.mode,
      32,
    ),
    photo: cleanPhoto(input.photo),
  };
}

function makeShareId() {
  return randomBytes(12)
    .toString('hex')
    .slice(0, 20);
}

export async function createPassportShare(
  payload: PassportSharePayload,
) {
  const supabase = getSupabaseAdmin();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = makeShareId();

    const { error } = await supabase
      .from('tobyworld_passport_shares')
      .insert({
        id,
        payload,
      });

    if (!error) {
      return id;
    }

    if (error.code !== '23505') {
      console.error(
        'Passport share database insert failed:',
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      );

      throw new Error(
        `Passport share database insert failed: ${error.message}`,
      );
    }
  }

  throw new Error(
    'Unable to create a unique passport share.',
  );
}

export async function getPassportShare(
  id: string,
): Promise<PassportSharePayload | null> {
  const safeId = id.trim().toLowerCase();

  if (!/^[a-f0-9]{8,32}$/.test(safeId)) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_passport_shares')
    .select('payload')
    .eq('id', safeId)
    .maybeSingle<PassportShareRow>();

  if (error) {
    console.error(
      'Passport share database read failed:',
      {
        id: safeId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      `Passport share database read failed: ${error.message}`,
    );
  }

  if (!data?.payload) {
    return null;
  }

  return cleanPassportSharePayload(data.payload);
}
