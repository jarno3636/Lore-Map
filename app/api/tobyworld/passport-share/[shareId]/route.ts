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

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      shareId: string;
    }>;
  },
) {
  const { shareId } = await context.params;
  const payload = await getPassportShare(shareId);
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  if (!payload) {
    return new NextResponse('Passport share not found.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const shareUrl = `${origin}/api/tobyworld/passport-share/${shareId}`;
  const imageUrl = `${origin}/api/tobyworld/passport-image/${shareId}`;
  const appUrl = `${origin}/#pond-passport`;
  const splashImageUrl = `${origin}/miniapp/tobyworld-app-icon.png`;

  const miniAppEmbed = {
    version: '1',
    imageUrl,
    button: {
      title: 'Open Passport',
      action: {
        type: 'launch_frame',
        name: 'Tobyworld Atlas',
        url: appUrl,
        splashImageUrl,
        splashBackgroundColor: '#061419',
      },
    },
  };

  const miniAppEmbedJson = JSON.stringify(miniAppEmbed);
  const description = `${payload.title} · ${payload.mark} · The pond remains professionally concerned.`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(payload.name)} · Tobyworld Pond Passport</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="canonical" href="${escapeHtml(shareUrl)}" />

    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:title" content="${escapeHtml(payload.name)} received a Tobyworld Pond Passport" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(payload.name)} · Tobyworld Pond Passport" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

    <meta name="fc:miniapp" content="${escapeHtml(miniAppEmbedJson)}" />
    <meta name="fc:frame" content="${escapeHtml(miniAppEmbedJson)}" />
  </head>

  <body style="margin:0;background:#061419;color:#fff8e6;font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center;">
    <main style="width:min(92vw,760px);text-align:center;padding:28px;">
      <a href="${escapeHtml(appUrl)}" style="display:block;text-decoration:none;color:inherit;">
        <img
          src="${escapeHtml(imageUrl)}"
          alt="Tobyworld Pond Passport"
          width="1200"
          height="630"
          style="display:block;width:100%;height:auto;border-radius:24px;border:1px solid rgba(249,201,104,0.24);box-shadow:0 26px 70px rgba(0,0,0,0.35);"
        />
      </a>

      <p style="margin:22px 0 8px;color:#8de9ff;font-size:12px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;">
        ${escapeHtml(payload.mode)}
      </p>

      <h1 style="margin:0;color:#fff8e6;font-family:Georgia,serif;font-size:clamp(36px,7vw,64px);line-height:0.95;">
        Tobyworld Pond Passport
      </h1>

      <p style="margin:14px auto 0;max-width:620px;color:#c8e1e6;font-size:17px;line-height:1.45;">
        ${escapeHtml(payload.name)} ${escapeHtml(payload.handle)} received the title
        <strong style="color:#ffe3a0;">${escapeHtml(payload.title)}</strong>.
      </p>

      <p style="margin:22px 0 0;">
        <a
          href="${escapeHtml(appUrl)}"
          style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#f8d77d,#8de9ff);color:#061419;font-size:13px;font-weight:950;text-decoration:none;"
        >
          Open Tobyworld Atlas
        </a>
      </p>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
