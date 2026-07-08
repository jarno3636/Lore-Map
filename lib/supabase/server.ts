import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function cleanSupabaseUrl(value: string) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '');
}

export function getSupabaseAdmin() {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawSupabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.');
  }

  if (!rawServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
  const serviceRoleKey = rawServiceRoleKey.trim().replace(/^['"]|['"]$/g, '');

  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must look like https://your-project-ref.supabase.co',
    );
  }

  if (supabaseUrl.includes('/rest/v1')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must be the project URL only, without /rest/v1.',
    );
  }

  if (!serviceRoleKey.startsWith('eyJ')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY does not look like a valid Supabase JWT key.');
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, serviceRoleKey, {
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
