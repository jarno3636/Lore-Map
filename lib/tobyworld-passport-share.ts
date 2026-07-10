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
  id: string;
  payload: unknown;
  created_at?: string;
};

const DEFAULT_PAYLOAD: PassportSharePayload = {
  title: 'Awaiting Pond Stamp',
  characteristic:
    'The pond reviewed the file and became professionally concerned.',
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

function cleanString(
  value: unknown,
  fallback: string,
  maxLength: number,
) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const cleaned = value.trim().replace(/\s+/g, ' ');

  if (!cleaned) {
    return fallback;
  }

  return cleaned.slice(0, maxLength);
}

function cleanPhoto(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const cleaned = value.trim();

  if (!cleaned.startsWith('/images/passport/')) {
    return undefined;
  }

  if (!/\.(png|jpg|jpeg|webp)$/i.test(cleaned)) {
    return undefined;
  }

  if (cleaned.includes('..')) {
    return undefined;
  }

  return cleaned.slice(0, 180);
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
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

function cleanShareId(value: string) {
  return value.trim().toLowerCase();
}

function isValidShareId(value: string) {
  return /^[a-z0-9]{8,32}$/.test(value);
}

export async function createPassportShare(
  rawPayload: PassportSharePayload,
) {
  const supabase = getSupabaseAdmin();
  const payload = cleanPassportSharePayload(rawPayload);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = makeShareId();

    const { data, error } = await supabase
      .from('tobyworld_passport_shares')
      .insert({
        id,
        payload,
      })
      .select('id, payload, created_at')
      .single<PassportShareRow>();

    if (error) {
      if (error.code === '23505') {
        continue;
      }

      console.error('Passport share insert failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      throw new Error(
        `Passport share insert failed: ${error.message}`,
      );
    }

    if (!data?.id || data.id !== id) {
      throw new Error(
        'Passport share was inserted but the saved ID could not be confirmed.',
      );
    }

    /*
     * Verify that a separate query can immediately retrieve the row.
     * The API must never return a URL for an unreadable share.
     */
    const { data: verifiedRow, error: verifyError } =
      await supabase
        .from('tobyworld_passport_shares')
        .select('id')
        .eq('id', id)
        .maybeSingle<{ id: string }>();

    if (verifyError) {
      console.error('Passport share verification failed:', {
        id,
        code: verifyError.code,
        message: verifyError.message,
        details: verifyError.details,
        hint: verifyError.hint,
      });

      throw new Error(
        `Passport share verification failed: ${verifyError.message}`,
      );
    }

    if (!verifiedRow?.id) {
      throw new Error(
        'Passport share could not be read after it was created.',
      );
    }

    return id;
  }

  throw new Error(
    'Unable to create a unique passport share ID.',
  );
}

export async function getPassportShare(id: string) {
  const safeId = cleanShareId(id);

  if (!isValidShareId(safeId)) {
    console.warn('Rejected invalid passport share ID:', safeId);
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tobyworld_passport_shares')
    .select('id, payload, created_at')
    .eq('id', safeId)
    .maybeSingle<PassportShareRow>();

  if (error) {
    console.error('Passport share read failed:', {
      id: safeId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(
      `Passport share read failed: ${error.message}`,
    );
  }

  if (!data?.payload) {
    console.warn('Passport share row not found:', {
      id: safeId,
    });

    return null;
  }

  return cleanPassportSharePayload(data.payload);
}
