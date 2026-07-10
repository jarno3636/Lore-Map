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

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      shareId: string;
    }>;
  },
) {
  try {
    const { shareId } = await context.params;
    const payload =
      await getPassportShare(shareId);

    if (!payload) {
      return new NextResponse(
        'Passport share not found.',
        {
          status: 404,
          headers: {
            'Content-Type':
              'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        },
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

    const frameEmbed = {
      version: 'next',
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
      content="800"
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
      name="fc:frame"
      content="${escapeHtml(frameEmbedJson)}"
    />
  </head>

  <body
    style="
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      background:#061419;
      color:#fff8e6;
      font-family:Arial,sans-serif;
    "
  >
    <main
      style="
        width:min(92vw,820px);
        padding:28px;
        text-align:center;
      "
    >
      <img
        src="${escapeHtml(imageUrl)}"
        alt="Tobyworld Pond Passport"
        width="1200"
        height="800"
        style="
          display:block;
          width:100%;
          height:auto;
          border:1px solid rgba(249,201,104,0.24);
          border-radius:24px;
          box-shadow:0 26px 70px rgba(0,0,0,0.35);
        "
      />

      <p
        style="
          margin:22px 0 8px;
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
          font-size:clamp(36px,7vw,64px);
          line-height:0.95;
        "
      >
        Tobyworld Pond Passport
      </h1>

      <p
        style="
          max-width:620px;
          margin:14px auto 0;
          color:#c8e1e6;
          font-size:17px;
          line-height:1.45;
        "
      >
        ${escapeHtml(payload.name)}
        ${escapeHtml(payload.handle)}
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
          margin-top:22px;
        "
      >
        <a
          href="${escapeHtml(appUrl)}"
          style="
            display:inline-flex;
            align-items:center;
            justify-content:center;
            border-radius:999px;
            padding:13px 18px;
            color:#061419;
            background:linear-gradient(135deg,#f8d77d,#8de9ff);
            font-size:13px;
            font-weight:950;
            text-decoration:none;
          "
        >
          Open Tobyworld Atlas
        </a>

        <a
          href="${escapeHtml(imageUrl)}"
          download="tobyworld-pond-passport.png"
          style="
            display:inline-flex;
            align-items:center;
            justify-content:center;
            border:1px solid rgba(141,233,255,0.25);
            border-radius:999px;
            padding:13px 18px;
            color:#e5faff;
            background:rgba(19,65,77,0.65);
            font-size:13px;
            font-weight:950;
            text-decoration:none;
          "
        >
          Open PNG
        </a>
      </div>
    </main>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type':
          'text/html; charset=utf-8',
        'Cache-Control':
          'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        'X-Content-Type-Options':
          'nosniff',
      },
    });
  } catch (error) {
    console.error(
      'Passport share page failed:',
      error,
    );

    return new NextResponse(
      'Passport share unavailable.',
      {
        status: 500,
        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
