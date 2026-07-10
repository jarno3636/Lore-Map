import { ImageResponse } from 'next/og';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getPhotoUrl(origin: string, photo?: string) {
  if (!photo) return '';

  if (!photo.startsWith('/images/passport/')) return '';

  return `${origin}${photo}`;
}

function fallbackImage(message = 'Passport image unavailable') {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '800px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          background:
            'radial-gradient(circle at 15% 5%, rgba(141,233,255,0.28), transparent 34%), linear-gradient(135deg, #061419, #352413)',
          color: '#fff8e6',
          fontFamily: 'Arial',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: '28px',
            fontWeight: 900,
            color: '#8de9ff',
            letterSpacing: '5px',
            textTransform: 'uppercase',
          }}
        >
          Tobyworld Pond Passport
        </div>
        <div
          style={{
            marginTop: '28px',
            fontSize: '62px',
            lineHeight: 1,
            fontFamily: 'Georgia',
            fontWeight: 900,
            textAlign: 'center',
          }}
        >
          {message}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
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
  try {
    const { shareId } = await context.params;
    const payload = await getPassportShare(shareId);
    const requestUrl = new URL(request.url);

    if (!payload) {
      return fallbackImage('Passport not found');
    }

    const photo = getPhotoUrl(requestUrl.origin, payload.photo);

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '800px',
            display: 'flex',
            padding: '58px',
            background:
              'radial-gradient(circle at 15% 5%, rgba(141,233,255,0.35), transparent 34%), radial-gradient(circle at 85% 8%, rgba(248,215,125,0.28), transparent 34%), linear-gradient(135deg, #061419, #152217 46%, #352413)',
            color: '#2f1f15',
            fontFamily: 'Arial',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              borderRadius: '48px',
              border: '4px solid rgba(255,227,160,0.72)',
              background: 'linear-gradient(135deg, #fff8e6, #e8cf99)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: '-18px',
                bottom: '118px',
                fontSize: '172px',
                fontFamily: 'Georgia',
                fontWeight: 900,
                color: 'rgba(91,53,26,0.065)',
                transform: 'rotate(-13deg)',
              }}
            >
              POND
            </div>

            <div
              style={{
                width: '72%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '64px 58px 54px',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  letterSpacing: '5px',
                  color: '#7b3f23',
                }}
              >
                TOBYWORLD POND PASSPORT
              </div>

              <div
                style={{
                  marginTop: '22px',
                  fontSize: payload.name.length > 24 ? '50px' : '62px',
                  lineHeight: 0.92,
                  fontFamily: 'Georgia',
                  fontWeight: 900,
                  color: '#2f1f15',
                }}
              >
                {payload.name}
              </div>

              <div
                style={{
                  marginTop: '12px',
                  fontSize: '25px',
                  fontWeight: 800,
                  color: '#7b3f23',
                }}
              >
                {payload.handle}
              </div>

              <div
                style={{
                  marginTop: '44px',
                  fontSize: '20px',
                  fontWeight: 900,
                  letterSpacing: '3px',
                  color: '#7b3f23',
                }}
              >
                POND TITLE
              </div>

              <div
                style={{
                  marginTop: '14px',
                  maxWidth: '720px',
                  fontSize: payload.title.length > 32 ? '54px' : '70px',
                  lineHeight: 0.9,
                  fontFamily: 'Georgia',
                  fontWeight: 900,
                  color: '#2f1f15',
                }}
              >
                {payload.title}
              </div>

              <div
                style={{
                  marginTop: '24px',
                  maxWidth: '725px',
                  fontSize: '27px',
                  lineHeight: 1.22,
                  fontWeight: 800,
                  color: '#3c281b',
                }}
              >
                {payload.characteristic}
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  gap: '14px',
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
                      width: '136px',
                      height: '76px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      borderRadius: '18px',
                      border: '1px solid rgba(91,53,26,0.18)',
                      background: 'rgba(255,248,230,0.42)',
                      padding: '0 16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '29px',
                        fontWeight: 900,
                        color: '#2f1f15',
                      }}
                    >
                      {value}
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        fontSize: '14px',
                        fontWeight: 900,
                        color: '#7b3f23',
                        letterSpacing: '1.4px',
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
                width: '28%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '64px 42px 54px',
                borderLeft: '2px solid rgba(91,53,26,0.16)',
              }}
            >
              <div
                style={{
                  width: '184px',
                  height: '184px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: '38px',
                  border: '4px solid rgba(91,53,26,0.3)',
                  background: 'rgba(255,248,230,0.44)',
                  fontSize: '88px',
                }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    width="184"
                    height="184"
                    style={{
                      width: '184px',
                      height: '184px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  '🐸'
                )}
              </div>

              <div
                style={{
                  marginTop: '42px',
                  width: '226px',
                  minHeight: '108px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '999px',
                  border: '5px double rgba(123,63,35,0.48)',
                  background: 'rgba(255,248,230,0.35)',
                  transform: 'rotate(3deg)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '25px',
                    fontWeight: 900,
                    color: '#2f1f15',
                  }}
                >
                  {payload.stamp}
                </div>
                <div
                  style={{
                    marginTop: '7px',
                    fontSize: '16px',
                    fontWeight: 900,
                    letterSpacing: '2.2px',
                    color: '#7b3f23',
                  }}
                >
                  {payload.mode}
                </div>
              </div>

              <div
                style={{
                  marginTop: '42px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '19px',
                  fontWeight: 900,
                  color: '#7b3f23',
                }}
              >
                <div>MARK</div>
                <div
                  style={{
                    fontSize: '29px',
                    lineHeight: 1.05,
                    fontFamily: 'Georgia',
                    fontWeight: 900,
                    color: '#2f1f15',
                  }}
                >
                  {payload.mark}
                </div>
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  fontSize: '18px',
                  fontWeight: 900,
                  color: '#7b3f23',
                  textAlign: 'center',
                  lineHeight: 1.22,
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
        width: 1200,
        height: 800,
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      },
    );
  } catch (error) {
    console.error('Passport image failed:', error);
    return fallbackImage('Passport image failed');
  }
}
