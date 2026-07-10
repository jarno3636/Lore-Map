import { NextResponse } from 'next/server';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

export async function GET(
  request: Request,
  context: { params: Promise<{ shareId: string }> },
) {
  try {
    const { shareId } = await context.params;
    const share = await getPassportShare(shareId);

    if (!share) {
      return new NextResponse('Passport share not found.', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const payload = share.payload;
    const origin = getPublicOrigin(request);
    const shareUrl = `${origin}/api/tobyworld/passport-share/${share.id}`;
    const appUrl = `${origin}/#pond-passport`;
    const splashImageUrl = `${origin}/miniapp/tobyworld-app-icon.png`;
    const description = `${payload.title} · ${payload.mark} · The pond remains professionally concerned.`;

    const embed = {
      version: 'next',
      imageUrl: share.imageUrl,
      button: {
        title: 'Open Passport',
        action: {
          type: 'launch_miniapp',
          name: 'Tobyworld Atlas',
          url: appUrl,
          splashImageUrl,
          splashBackgroundColor: '#061419',
        },
      },
    };

    const embedJson = JSON.stringify(embed);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(payload.name)} · Tobyworld Pond Passport</title>
    <link rel="canonical" href="${escapeHtml(shareUrl)}" />
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:title" content="${escapeHtml(payload.name)} received a Tobyworld Pond Passport" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(share.imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(share.imageUrl)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="800" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(payload.name)} · Tobyworld Pond Passport" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(share.imageUrl)}" />

    <meta name="fc:frame" content="${escapeHtml(embedJson)}" />
    <meta name="fc:miniapp" content="${escapeHtml(embedJson)}" />
  </head>

  <body style="margin:0;min-height:100vh;background:radial-gradient(circle at 20% 0%,#16424d,#061419 48%,#24180e);color:#fff8e6;font-family:Arial,sans-serif;">
    <main style="width:min(94vw,900px);margin:0 auto;padding:40px 0 64px;text-align:center;">
      <img src="${escapeHtml(share.imageUrl)}" alt="Tobyworld Pond Passport" width="1200" height="800" style="display:block;width:100%;height:auto;border:1px solid rgba(249,201,104,.34);border-radius:28px;box-shadow:0 32px 90px rgba(0,0,0,.45);" />

      <p style="margin:28px 0 8px;color:#8de9ff;font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;">${escapeHtml(payload.mode)}</p>
      <h1 style="margin:0;color:#fff8e6;font:900 clamp(38px,8vw,72px)/.94 Georgia,serif;">Tobyworld Pond Passport</h1>
      <p style="max-width:680px;margin:16px auto 0;color:#c8e1e6;font-size:18px;line-height:1.5;">${escapeHtml(payload.name)} received the title <strong style="color:#ffe3a0;">${escapeHtml(payload.title)}</strong>.</p>

      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:26px;">
        <a href="${escapeHtml(appUrl)}" style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:14px 20px;color:#061419;background:linear-gradient(135deg,#f8d77d,#8de9ff);font-size:14px;font-weight:900;text-decoration:none;">Open Tobyworld Atlas</a>
        <a href="${escapeHtml(share.imageUrl)}" download="tobyworld-pond-passport.png" style="display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(141,233,255,.28);border-radius:999px;padding:14px 20px;color:#e5faff;background:rgba(19,65,77,.72);font-size:14px;font-weight:900;text-decoration:none;">Open PNG</a>
      </div>
    </main>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control':
          'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Passport share page failed:', error);
    return new NextResponse('Passport share unavailable.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
}
