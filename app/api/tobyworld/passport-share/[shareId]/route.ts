import { NextResponse } from 'next/server';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function getPublicOrigin(request: Request) {
  const configuredOrigin = normalizeOrigin(
    process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      '',
  );

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();

  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();

  if (forwardedHost) {
    return `${forwardedProtocol || 'https'}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function cleanShareId(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      shareId: string;
    }>;
  },
) {
  try {
    const { shareId: rawShareId } = await context.params;
    const shareId = cleanShareId(rawShareId);
    const payload = await getPassportShare(shareId);

    if (!payload) {
      return new NextResponse('Passport share not found.', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const origin = getPublicOrigin(request);

    const shareUrl = `${origin}/api/tobyworld/passport-share/${shareId}`;
    const imageUrl = `${origin}/api/tobyworld/passport-image/${shareId}`;
    const downloadUrl = `${imageUrl}?download=1`;
    const appUrl = `${origin}/#pond-passport`;
    const splashImageUrl = `${origin}/miniapp/tobyworld-app-icon.png`;

    const pageTitle = `${payload.name} · Tobyworld Pond Passport`;

    const socialTitle = `${payload.name} received a Tobyworld Pond Passport`;

    const description = [
      payload.title,
      payload.mark,
      'The pond remains professionally concerned.',
    ].join(' · ');

    /*
     * Keep the embed URL short. All passport details live in Supabase behind
     * the shareId, so Farcaster only needs this permanent share-page URL.
     */
    const miniAppEmbed = {
      version: '1',
      imageUrl,
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

    const miniAppEmbedJson = JSON.stringify(miniAppEmbed);
    const escapedEmbedJson = escapeHtml(miniAppEmbedJson);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />

    <title>${escapeHtml(pageTitle)}</title>

    <link
      rel="canonical"
      href="${escapeHtml(shareUrl)}"
    />

    <meta
      name="description"
      content="${escapeHtml(description)}"
    />

    <meta
      name="theme-color"
      content="#061419"
    />

    <meta
      property="og:type"
      content="website"
    />

    <meta
      property="og:url"
      content="${escapeHtml(shareUrl)}"
    />

    <meta
      property="og:site_name"
      content="Tobyworld Atlas"
    />

    <meta
      property="og:title"
      content="${escapeHtml(socialTitle)}"
    />

    <meta
      property="og:description"
      content="${escapeHtml(description)}"
    />

    <meta
      property="og:image"
      content="${escapeHtml(imageUrl)}"
    />

    <meta
      property="og:image:url"
      content="${escapeHtml(imageUrl)}"
    />

    <meta
      property="og:image:secure_url"
      content="${escapeHtml(imageUrl)}"
    />

    <meta
      property="og:image:type"
      content="image/png"
    />

    <meta
      property="og:image:width"
      content="${IMAGE_WIDTH}"
    />

    <meta
      property="og:image:height"
      content="${IMAGE_HEIGHT}"
    />

    <meta
      property="og:image:alt"
      content="Tobyworld Pond Passport for ${escapeHtml(payload.name)}"
    />

    <meta
      name="twitter:card"
      content="summary_large_image"
    />

    <meta
      name="twitter:title"
      content="${escapeHtml(pageTitle)}"
    />

    <meta
      name="twitter:description"
      content="${escapeHtml(description)}"
    />

    <meta
      name="twitter:image"
      content="${escapeHtml(imageUrl)}"
    />

    <meta
      name="twitter:image:alt"
      content="Tobyworld Pond Passport for ${escapeHtml(payload.name)}"
    />

    <meta
      name="fc:miniapp"
      content="${escapedEmbedJson}"
    />

    <meta
      name="fc:frame"
      content="${escapedEmbedJson}"
    />
  </head>

  <body
    style="
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      padding:24px 0;
      box-sizing:border-box;
      background:
        radial-gradient(
          circle at 15% 0%,
          rgba(141,233,255,0.16),
          transparent 32%
        ),
        radial-gradient(
          circle at 88% 0%,
          rgba(249,201,104,0.11),
          transparent 34%
        ),
        linear-gradient(
          180deg,
          #061419,
          #0a2229 58%,
          #040c10
        );
      color:#fff8e6;
      font-family:Arial,sans-serif;
    "
  >
    <main
      style="
        width:min(92vw,920px);
        margin:0 auto;
        padding:22px;
        box-sizing:border-box;
        text-align:center;
      "
    >
      <a
        href="${escapeHtml(imageUrl)}"
        style="
          display:block;
          color:inherit;
          text-decoration:none;
        "
      >
        <img
          src="${escapeHtml(imageUrl)}"
          alt="Tobyworld Pond Passport for ${escapeHtml(payload.name)}"
          width="${IMAGE_WIDTH}"
          height="${IMAGE_HEIGHT}"
          style="
            display:block;
            width:100%;
            height:auto;
            aspect-ratio:${IMAGE_WIDTH}/${IMAGE_HEIGHT};
            object-fit:contain;
            border:1px solid rgba(249,201,104,0.25);
            border-radius:24px;
            background:#061419;
            box-shadow:
              0 28px 76px rgba(0,0,0,0.42),
              0 0 40px rgba(141,233,255,0.06);
          "
        />
      </a>

      <p
        style="
          margin:24px 0 8px;
          color:#8de9ff;
          font-size:12px;
          font-weight:900;
          letter-spacing:0.18em;
          text-transform:uppercase;
        "
      >
        ${escapeHtml(payload.mode)}
      </p>

      <h1
        style="
          margin:0;
          color:#fff8e6;
          font-family:Georgia,serif;
          font-size:clamp(38px,7vw,68px);
          line-height:0.94;
          letter-spacing:-0.045em;
        "
      >
        Tobyworld Pond Passport
      </h1>

      <p
        style="
          max-width:650px;
          margin:16px auto 0;
          color:#c8e1e6;
          font-size:17px;
          line-height:1.5;
        "
      >
        <strong style="color:#fff8e6;">
          ${escapeHtml(payload.name)}
        </strong>

        ${
          payload.handle
            ? `<span style="color:#8de9ff;">
                ${escapeHtml(payload.handle)}
              </span>`
            : ''
        }

        received the title

        <strong style="color:#ffe3a0;">
          ${escapeHtml(payload.title)}
        </strong>.
      </p>

      <div
        style="
          display:flex;
          flex-wrap:wrap;
          justify-content:center;
          gap:10px;
          margin-top:24px;
        "
      >
        <a
          href="${escapeHtml(appUrl)}"
          style="
            display:inline-flex;
            min-height:46px;
            align-items:center;
            justify-content:center;
            box-sizing:border-box;
            border-radius:999px;
            padding:0 19px;
            color:#061419;
            background:linear-gradient(
              135deg,
              #f8d77d,
              #8de9ff
            );
            box-shadow:0 14px 32px rgba(141,233,255,0.14);
            font-size:13px;
            font-weight:900;
            text-decoration:none;
          "
        >
          Open Tobyworld Atlas
        </a>

        <a
          href="${escapeHtml(downloadUrl)}"
          download="tobyworld-pond-passport-${escapeHtml(shareId)}.png"
          style="
            display:inline-flex;
            min-height:46px;
            align-items:center;
            justify-content:center;
            box-sizing:border-box;
            border:1px solid rgba(141,233,255,0.27);
            border-radius:999px;
            padding:0 19px;
            color:#e5faff;
            background:rgba(19,65,77,0.67);
            font-size:13px;
            font-weight:900;
            text-decoration:none;
          "
        >
          Download PNG
        </a>

        <a
          href="${escapeHtml(imageUrl)}"
          style="
            display:inline-flex;
            min-height:46px;
            align-items:center;
            justify-content:center;
            box-sizing:border-box;
            border:1px solid rgba(249,201,104,0.24);
            border-radius:999px;
            padding:0 19px;
            color:#ffe3a0;
            background:rgba(75,54,25,0.48);
            font-size:13px;
            font-weight:900;
            text-decoration:none;
          "
        >
          Open Full Image
        </a>
      </div>

      <p
        style="
          max-width:560px;
          margin:18px auto 0;
          color:#789ba3;
          font-size:12px;
          line-height:1.5;
        "
      >
        On iPhone, open the full image and long-press it to save it to Photos.
      </p>
    </main>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control':
          'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
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
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}
