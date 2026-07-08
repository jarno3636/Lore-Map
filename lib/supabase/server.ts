import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function cleanSupabaseUrl(value: string) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '');
}

function cleanKey(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function validateSupabaseServerKey(key: string) {
  const isLegacyServiceRoleJwt = key.startsWith('eyJ');
  const isNewSecretKey = key.startsWith('sb_secret_');

  if (!isLegacyServiceRoleJwt && !isNewSecretKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must be either the legacy service_role key that starts with eyJ, or the new Supabase secret key that starts with sb_secret_. Do not use anon or sb_publishable keys here.',
    );
  }
}

export function getSupabaseAdmin() {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawServerKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!rawSupabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.');
  }

  if (!rawServerKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.');
  }

  const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
  const serverKey = cleanKey(rawServerKey);

  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must look like https://your-project-ref.supabase.co',
    );
  }

  validateSupabaseServerKey(serverKey);

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, serverKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'tobyworld-atlas',
        },
      },
    });
  }

  return cachedClient;
}
