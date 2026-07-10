import { NextResponse } from 'next/server';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getShareId(request: Request) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const shareId = segments.at(-1)?.trim().toLowerCase() ?? '';

  if (!/^[a-z0-9]{8,32}$/.test(shareId)) {
    return null;
  }

  return shareId;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getPublicOrigin(request: Request) {
  const configuredOrigin = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ''
  )
    .trim()
    .replace(/\/+$/, '');

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

function textResponse(
  message: string,
  status: number,
) {
  return new NextResponse(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(request: Request) {
  try {
    const shareId = getShareId(request);

    if (!shareId) {
      return textResponse(
        'Invalid passport share ID.',
        400,
      );
    }

    const payload = await getPassportShare(shareId);

    if (!payload) {
      console.error('Passport share payload not found:', {
        shareId,
        pathname: new URL(request.url).pathname,
      });

      return textResponse(
        'Passport share not found.',
        404,
      );
    }

    const origin = getPublicOrigin(request);

    const shareUrl =
      `${origin}/api/tobyworld/passport-share/${shareId}`;

    const imageUrl =
      `${origin}/api/tobyworld/passport-image/${shareId}`;

    const appUrl =
      `${origin}/#pond-passport`;

    const splashImageUrl =
      `${origin}/miniapp/tobyworld-app-icon.png`;

    const description =
      `${payload.title} · ${payload.mark} · ` +
      'The pond remains professionally concerned.';

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

    const frameEmbed = {
      version: 'next',
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

    const miniAppEmbedJson =
      JSON.stringify(miniAppEmbed);

    const frameEmbedJson =
      JSON.stringify(frameEmbed);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />

    <title>${escapeHtml(payload.name)} · Tobyworld Pond Passport</title>

    <link
      rel="canonical"
      href="${escapeHtml(shareUrl)}"
    />

    <meta
      name="description"
      content="${escapeHtml(description)}"
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
      content="${escapeHtml(payload.name)} received a Tobyworld Pond Passport"
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
      property="og:image:secure_url"
      content="${escapeHtml(imageUrl)}"
    />

    <meta
      property="og:image:type"
      content="image/png"
    />

    <meta
      property="og:image:width"
      content="1200"
    />

    <meta
      property="og:image:height"
      content="630"
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
      content="${escapeHtml(payload.name)} · Tobyworld Pond Passport"
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
      content="${escapeHtml(miniAppEmbedJson)}"
    />

    <meta
      name="fc:frame"
      content="${escapeHtml(frameEmbedJson)}"
    />
  </head>

  <body
    style="
      margin:0;
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:28px;
      box-sizing:border-box;
      color:#fff8e6;
      background:
        radial-gradient(circle at 12% 0%,rgba(141,233,255,0.18),transparent 34%),
        radial-gradient(circle at 88% 0%,rgba(249,201,104,0.13),transparent 34%),
        linear-gradient(135deg,#061419,#152217 52%,#352413);
      font-family:Arial,sans-serif;
    "
  >
    <main
      style="
        width:min(100%,900px);
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
          width="1200"
          height="630"
          style="
            display:block;
            width:100%;
            height:auto;
            border:1px solid rgba(249,201,104,0.3);
            border-radius:28px;
            background:#f4e1b3;
            box-shadow:0 30px 82px rgba(0,0,0,0.42);
          "
        />
      </a>

      <p
        style="
          margin:24px 0 8px;
          color:#8de9ff;
          font-size:12px;
          font-weight:900;
          letter-spacing:0.19em;
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
          line-height:0.95;
          letter-spacing:-0.04em;
        "
      >
        Tobyworld Pond Passport
      </h1>

      <p
        style="
          max-width:650px;
          margin:15px auto 0;
          color:#c8e1e6;
          font-size:17px;
          line-height:1.5;
        "
      >
        ${escapeHtml(payload.name)}
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
          gap:11px;
          margin-top:24px;
        "
      >
        <a
          href="${escapeHtml(appUrl)}"
          style="
            display:inline-flex;
            min-height:48px;
            align-items:center;
            justify-content:center;
            border-radius:999px;
            padding:0 20px;
            color:#061419;
            background:linear-gradient(135deg,#f8d77d,#8de9ff);
            font-size:13px;
            font-weight:900;
            text-decoration:none;
          "
        >
          Open Tobyworld Atlas
        </a>

        <a
          href="${escapeHtml(imageUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:inline-flex;
            min-height:48px;
            align-items:center;
            justify-content:center;
            border:1px solid rgba(141,233,255,0.28);
            border-radius:999px;
            padding:0 20px;
            color:#e5faff;
            background:rgba(19,65,77,0.66);
            font-size:13px;
            font-weight:900;
            text-decoration:none;
          "
        >
          Open PNG
        </a>
      </div>

      <p
        style="
          margin:18px 0 0;
          color:#7fa8b1;
          font-size:12px;
          line-height:1.45;
        "
      >
        Open the PNG, then long-press the image to save it on mobile.
      </p>
    </main>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control':
          'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Passport share page failed:', error);

    return textResponse(
      'Passport share unavailable.',
      500,
    );
  }
}
