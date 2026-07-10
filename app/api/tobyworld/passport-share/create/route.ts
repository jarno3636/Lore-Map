import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  cleanPassportSharePayload,
  createPassportShareId,
  parsePassportPngDataUrl,
  savePassportShare,
} from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STORAGE_BUCKET = 'passport-shares';

function getPublicOrigin(request: Request) {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ''
  )
    .trim()
    .replace(/\/+$/, '');

  if (configured) return configured;

  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';

  return host ? `${protocol}://${host}` : new URL(request.url).origin;
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as {
      payload?: unknown;
      imageDataUrl?: unknown;
    };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  let storagePath: string | null = null;

  try {
    const body = await readBody(request);
    const payload = cleanPassportSharePayload(body.payload);
    const png = parsePassportPngDataUrl(body.imageDataUrl);
    const id = createPassportShareId();

    storagePath = `${id}.png`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, png, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Passport image upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;
    if (!imageUrl) throw new Error('Supabase did not return a public image URL.');

    await savePassportShare({ id, payload, imageUrl });

    const origin = getPublicOrigin(request);

    return NextResponse.json(
      {
        ok: true,
        id,
        shareUrl: `${origin}/api/tobyworld/passport-share/${id}`,
        imageUrl,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (storagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    }

    console.error('Passport share creation failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create passport share.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
