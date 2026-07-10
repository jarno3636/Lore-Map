import { ImageResponse } from 'next/og';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

function getShareId(request: Request) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const shareId = segments.at(-1)?.trim().toLowerCase() ?? '';

  if (!/^[a-z0-9]{8,32}$/.test(shareId)) {
    return null;
  }

  return shareId;
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

function getPhotoUrl(origin: string, photo?: string) {
  if (!photo) return null;
  if (!photo.startsWith('/images/passport/')) return null;
  if (photo.includes('..')) return null;

  return `${origin}${photo}`;
}

function getTitleSize(title: string) {
  if (title.length > 46) return 48;
  if (title.length > 36) return 55;
  if (title.length > 26) return 62;

  return 70;
}

function getNameSize(name: string) {
  if (name.length > 28) return 42;
  if (name.length > 20) return 48;

  return 56;
}

function imageHeaders(cache = true) {
  return {
    'Cache-Control': cache
      ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
      : 'no-store',
    'Content-Type': 'image/png',
  };
}

function fallbackImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: `${IMAGE_WIDTH}px`,
          height: `${IMAGE_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '70px',
          color: '#fff8e6',
          background:
            'radial-gradient(circle at 14% 4%, rgba(141,233,255,0.22), transparent 34%), radial-gradient(circle at 90% 8%, rgba(249,201,104,0.16), transparent 34%), linear-gradient(135deg, #061419, #152217 52%, #352413)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            color: '#8de9ff',
            fontSize: '22px',
            fontWeight: 900,
            letterSpacing: '6px',
            textTransform: 'uppercase',
          }}
        >
          Tobyworld Pond Passport
        </div>

        <div
          style={{
            marginTop: '28px',
            maxWidth: '900px',
            color: '#fff8e6',
            fontFamily: 'Georgia, serif',
            fontSize: '62px',
            fontWeight: 900,
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          {message}
        </div>

        <div
          style={{
            marginTop: '24px',
            color: '#b5d7dd',
            fontSize: '22px',
          }}
        >
          The pond could not locate this passport.
        </div>
      </div>
    ),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      headers: imageHeaders(false),
    },
  );
}

export async function GET(request: Request) {
  try {
    const shareId = getShareId(request);

    if (!shareId) {
      return fallbackImage('Invalid passport link');
    }

    const payload = await getPassportShare(shareId);

    if (!payload) {
      console.error('Passport image payload not found:', {
        shareId,
        pathname: new URL(request.url).pathname,
      });

      return fallbackImage('Passport not found');
    }

    const origin = getPublicOrigin(request);
    const photoUrl = getPhotoUrl(origin, payload.photo);
    const titleSize = getTitleSize(payload.title);
    const nameSize = getNameSize(payload.name);

    return new ImageResponse(
      (
        <div
          style={{
            width: `${IMAGE_WIDTH}px`,
            height: `${IMAGE_HEIGHT}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '62px 74px',
            color: '#2f1f15',
            background:
              'radial-gradient(circle at 12% 0%, rgba(141,233,255,0.25), transparent 34%), radial-gradient(circle at 88% 0%, rgba(249,201,104,0.22), transparent 34%), linear-gradient(135deg, #09232b, #10231d 50%, #3a2817)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '1052px',
              height: '506px',
              display: 'flex',
              overflow: 'hidden',
              border: '3px solid rgba(249,201,104,0.76)',
              borderRadius: '46px',
              background:
                'linear-gradient(135deg, #fff8e6 0%, #f4e1b3 58%, #e4c982 100%)',
              boxShadow:
                '0 30px 75px rgba(0,0,0,0.36), inset 0 0 50px rgba(91,53,26,0.08)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '12px',
                display: 'flex',
                border: '1px solid rgba(255,255,255,0.58)',
                borderRadius: '36px',
              }}
            />

            <div
              style={{
                position: 'absolute',
                right: '-20px',
                bottom: '76px',
                color: 'rgba(91,53,26,0.055)',
                fontFamily: 'Georgia, serif',
                fontSize: '154px',
                fontWeight: 900,
                lineHeight: 1,
                transform: 'rotate(-12deg)',
              }}
            >
              POND
            </div>

            <div
              style={{
                width: '750px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '42px 44px 32px 54px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    color: '#7b3f23',
                    fontSize: '21px',
                    fontWeight: 900,
                    letterSpacing: '5px',
                    textTransform: 'uppercase',
                  }}
                >
                  Tobyworld Pond Passport
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: '#8de9ff',
                    }}
                  />
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: '#9cffb1',
                    }}
                  />
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: '#f8d77d',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: '10px',
                  color: '#2f1f15',
                  fontFamily: 'Georgia, serif',
                  fontSize: `${nameSize}px`,
                  fontWeight: 900,
                  lineHeight: 0.95,
                  letterSpacing: '-2px',
                }}
              >
                {payload.name}
              </div>

              <div
                style={{
                  marginTop: '7px',
                  color: '#7b3f23',
                  fontSize: '21px',
                  fontWeight: 800,
                }}
              >
                {payload.handle}
              </div>

              <div
                style={{
                  width: '100%',
                  height: '2px',
                  marginTop: '20px',
                  background: 'rgba(91,53,26,0.16)',
                }}
              />

              <div
                style={{
                  marginTop: '20px',
                  color: '#7b3f23',
                  fontSize: '17px',
                  fontWeight: 900,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                Pond title
              </div>

              <div
                style={{
                  marginTop: '5px',
                  maxWidth: '650px',
                  color: '#2f1f15',
                  fontFamily: 'Georgia, serif',
                  fontSize: `${titleSize}px`,
                  fontWeight: 900,
                  lineHeight: 0.88,
                  letterSpacing: '-3px',
                }}
              >
                {payload.title}
              </div>

              <div
                style={{
                  marginTop: '13px',
                  maxWidth: '650px',
                  color: '#3c281b',
                  fontSize: '22px',
                  fontWeight: 800,
                  lineHeight: 1.18,
                }}
              >
                {payload.characteristic}
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                {[
                  ['STREAK', payload.streak],
                  ['RITES', payload.rites],
                  ['POWER', payload.power],
                  ['ASSETS', payload.assets],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      width: '148px',
                      height: '66px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      padding: '0 16px',
                      border: '1px solid rgba(91,53,26,0.15)',
                      borderRadius: '16px',
                      background: 'rgba(255,248,230,0.54)',
                    }}
                  >
                    <div
                      style={{
                        color: '#2f1f15',
                        fontSize: '25px',
                        fontWeight: 900,
                        lineHeight: 1,
                      }}
                    >
                      {value}
                    </div>

                    <div
                      style={{
                        marginTop: '5px',
                        color: '#7b3f23',
                        fontSize: '11px',
                        fontWeight: 900,
                        letterSpacing: '1px',
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                width: '302px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'column',
                padding: '36px 28px 28px',
                borderLeft: '2px solid rgba(91,53,26,0.14)',
                background:
                  'linear-gradient(180deg, rgba(255,248,230,0.18), rgba(217,176,88,0.13))',
              }}
            >
              <div
                style={{
                  width: '154px',
                  height: '154px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '4px solid rgba(91,53,26,0.28)',
                  borderRadius: '34px',
                  background: 'rgba(255,248,230,0.56)',
                  boxShadow:
                    '0 15px 28px rgba(91,53,26,0.12), inset 0 0 20px rgba(141,233,255,0.15)',
                  fontSize: '76px',
                }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt=""
                    width="154"
                    height="154"
                    style={{
                      width: '154px',
                      height: '154px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  '🐸'
                )}
              </div>

              <div
                style={{
                  width: '228px',
                  minHeight: '92px',
                  marginTop: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  border: '5px double rgba(123,63,35,0.48)',
                  borderRadius: '999px',
                  background: 'rgba(255,248,230,0.4)',
                  transform: 'rotate(2deg)',
                }}
              >
                <div
                  style={{
                    color: '#2f1f15',
                    fontSize: '22px',
                    fontWeight: 900,
                    textAlign: 'center',
                  }}
                >
                  {payload.stamp}
                </div>

                <div
                  style={{
                    marginTop: '6px',
                    color: '#7b3f23',
                    fontSize: '13px',
                    fontWeight: 900,
                    letterSpacing: '2px',
                    textAlign: 'center',
                  }}
                >
                  {payload.mode}
                </div>
              </div>

              <div
                style={{
                  width: '100%',
                  marginTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px',
                  border: '1px solid rgba(91,53,26,0.14)',
                  borderRadius: '18px',
                  background: 'rgba(255,248,230,0.34)',
                }}
              >
                <div
                  style={{
                    color: '#7b3f23',
                    fontSize: '12px',
                    fontWeight: 900,
                    letterSpacing: '2px',
                  }}
                >
                  MARK
                </div>

                <div
                  style={{
                    marginTop: '6px',
                    color: '#2f1f15',
                    fontFamily: 'Georgia, serif',
                    fontSize: '25px',
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {payload.mark}
                </div>
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  color: '#7b3f23',
                  fontFamily: 'Georgia, serif',
                  fontSize: '17px',
                  fontWeight: 700,
                  lineHeight: 1.2,
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
      ),
      {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        headers: imageHeaders(true),
      },
    );
  } catch (error) {
    console.error('Passport image route failed:', error);

    return fallbackImage('Passport image unavailable');
  }
}
