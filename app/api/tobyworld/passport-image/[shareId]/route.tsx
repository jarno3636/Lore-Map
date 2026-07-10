import { ImageResponse } from 'next/og';
import {
  getPassportShare,
  type PassportSharePayload,
} from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 800;

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

function getPhotoUrl(
  origin: string,
  photo?: string,
) {
  const safePhoto =
    photo?.startsWith('/images/passport/')
      ? photo
      : '/images/passport/frog-lily-agent.png';

  return new URL(
    safePhoto,
    origin,
  ).toString();
}

function getTitleSize(title: string) {
  if (title.length > 46) return 46;
  if (title.length > 34) return 54;
  if (title.length > 24) return 62;

  return 70;
}

function getNameSize(name: string) {
  if (name.length > 30) return 42;
  if (name.length > 22) return 50;

  return 58;
}

function imageHeaders(
  shareId: string,
  cache = true,
) {
  return {
    'Cache-Control': cache
      ? 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
      : 'no-store',
    'Content-Disposition':
      `inline; filename="tobyworld-passport-${shareId}.png"`,
    'X-Content-Type-Options':
      'nosniff',
  };
}

function fallbackImage(
  shareId: string,
  message: string,
) {
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: 70,
          color: '#fff8e6',
          background:
            'linear-gradient(135deg, #061419 0%, #12303a 50%, #352413 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#8de9ff',
            fontSize: 25,
            fontWeight: 900,
            letterSpacing: 5,
          }}
        >
          TOBYWORLD POND PASSPORT
        </div>

        <div
          style={{
            display: 'flex',
            maxWidth: 900,
            marginTop: 28,
            color: '#fff8e6',
            fontSize: 58,
            fontWeight: 900,
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          {message}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 30,
            color: '#ffe3a0',
            fontSize: 28,
          }}
        >
          △ · POND · 🍃
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: imageHeaders(
        shareId,
        false,
      ),
    },
  );
}

function PassportImage({
  payload,
  photoUrl,
}: {
  payload: PassportSharePayload;
  photoUrl: string;
}) {
  const stats = [
    {
      label: 'STREAK',
      value: payload.streak,
    },
    {
      label: 'RITES',
      value: payload.rites,
    },
    {
      label: 'POWER',
      value: payload.power,
    },
    {
      label: 'ASSETS',
      value: payload.assets,
    },
  ];

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        padding: 54,
        color: '#2f1f15',
        background:
          'linear-gradient(135deg, #061419 0%, #12303a 48%, #352413 100%)',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          overflow: 'hidden',
          border: '4px solid #ffe3a0',
          borderRadius: 44,
          background:
            'linear-gradient(135deg, #fff8e6 0%, #f2dfb1 55%, #e5c987 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -18,
            bottom: 86,
            display: 'flex',
            color: 'rgba(91,53,26,0.06)',
            fontSize: 170,
            fontWeight: 900,
            letterSpacing: -12,
            transform: 'rotate(-12deg)',
          }}
        >
          POND
        </div>

        <div
          style={{
            width: 780,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '54px 48px 46px',
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#7b3f23',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 4,
            }}
          >
            TOBYWORLD POND PASSPORT
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 18,
              color: '#2f1f15',
              fontSize: getNameSize(payload.name),
              fontWeight: 900,
              lineHeight: 0.95,
            }}
          >
            {payload.name}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 9,
              color: '#7b3f23',
              fontSize: 23,
              fontWeight: 800,
            }}
          >
            {payload.handle}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 34,
              color: '#7b3f23',
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 3,
            }}
          >
            POND TITLE
          </div>

          <div
            style={{
              display: 'flex',
              maxWidth: 680,
              marginTop: 10,
              color: '#2f1f15',
              fontSize: getTitleSize(
                payload.title,
              ),
              fontWeight: 900,
              lineHeight: 0.92,
            }}
          >
            {payload.title}
          </div>

          <div
            style={{
              display: 'flex',
              maxWidth: 680,
              marginTop: 20,
              color: '#3c281b',
              fontSize: 25,
              fontWeight: 700,
              lineHeight: 1.22,
            }}
          >
            {payload.characteristic}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
            }}
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                style={{
                  width: 154,
                  height: 82,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  marginRight:
                    index === stats.length - 1
                      ? 0
                      : 12,
                  border:
                    '1px solid rgba(91,53,26,0.20)',
                  borderRadius: 17,
                  padding: '0 15px',
                  background:
                    'rgba(255,248,230,0.42)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    color: '#2f1f15',
                    fontSize: 28,
                    fontWeight: 900,
                  }}
                >
                  {stat.value}
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: 4,
                    color: '#7b3f23',
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 1.3,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: 310,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '54px 34px 44px',
            borderLeft:
              '2px solid rgba(91,53,26,0.17)',
          }}
        >
          <div
            style={{
              width: 180,
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border:
                '4px solid rgba(91,53,26,0.30)',
              borderRadius: 38,
              background:
                'rgba(255,248,230,0.46)',
            }}
          >
            <img
              src={photoUrl}
              alt=""
              width={180}
              height={180}
              style={{
                width: 180,
                height: 180,
                objectFit: 'cover',
              }}
            />
          </div>

          <div
            style={{
              width: 230,
              minHeight: 105,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 34,
              border:
                '5px double rgba(123,63,35,0.48)',
              borderRadius: 80,
              padding: '15px 14px',
              background:
                'rgba(255,248,230,0.38)',
              transform: 'rotate(2deg)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#2f1f15',
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {payload.stamp}
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 6,
                color: '#7b3f23',
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              {payload.mode}
            </div>
          </div>

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              marginTop: 34,
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#7b3f23',
                fontSize: 16,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              MARK
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 8,
                color: '#2f1f15',
                fontSize:
                  payload.mark.length > 24
                    ? 23
                    : 28,
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              {payload.mark}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              color: '#7b3f23',
              fontSize: 17,
              fontWeight: 900,
              lineHeight: 1.3,
              textAlign: 'center',
            }}
          >
            We move not by leaps.
            <br />
            We move by stillness.
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      shareId: string;
    }>;
  },
) {
  const { shareId } =
    await context.params;

  try {
    const payload =
      await getPassportShare(shareId);

    if (!payload) {
      return fallbackImage(
        shareId,
        'Passport not found',
      );
    }

    const origin =
      getPublicOrigin(request);

    const photoUrl =
      getPhotoUrl(
        origin,
        payload.photo,
      );

    return new ImageResponse(
      <PassportImage
        payload={payload}
        photoUrl={photoUrl}
      />,
      {
        width: WIDTH,
        height: HEIGHT,
        headers: imageHeaders(
          shareId,
          true,
        ),
      },
    );
  } catch (error) {
    console.error(
      'Passport image route failed:',
      {
        shareId,
        error,
      },
    );

    return fallbackImage(
      shareId,
      'Passport image unavailable',
    );
  }
}
