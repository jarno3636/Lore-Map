import { ImageResponse } from 'next/og';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

function getPhotoUrl(origin: string, photo?: string) {
  if (!photo) return '';

  if (!photo.startsWith('/images/passport/')) return '';

  return `${origin}${photo}`;
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

  if (!payload) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#061419',
            color: '#fff8e6',
            fontSize: '56px',
            fontFamily: 'Georgia',
          }}
        >
          Passport not found
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  }

  const photo = getPhotoUrl(requestUrl.origin, payload.photo);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          padding: '52px',
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
            borderRadius: '46px',
            border: '4px solid rgba(255,227,160,0.7)',
            background: 'linear-gradient(135deg, #fff8e6, #e8cf99)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '-12px',
              bottom: '82px',
              fontSize: '150px',
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
              width: '73%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '54px 56px 44px',
            }}
          >
            <div
              style={{
                fontSize: '23px',
                fontWeight: 900,
                letterSpacing: '5px',
                color: '#7b3f23',
              }}
            >
              TOBYWORLD POND PASSPORT
            </div>

            <div
              style={{
                marginTop: '18px',
                fontSize: payload.name.length > 24 ? '48px' : '58px',
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
                marginTop: '10px',
                fontSize: '24px',
                fontWeight: 800,
                color: '#7b3f23',
              }}
            >
              {payload.handle}
            </div>

            <div
              style={{
                marginTop: '34px',
                fontSize: '19px',
                fontWeight: 900,
                letterSpacing: '3px',
                color: '#7b3f23',
              }}
            >
              POND TITLE
            </div>

            <div
              style={{
                marginTop: '12px',
                maxWidth: '720px',
                fontSize: payload.title.length > 32 ? '50px' : '64px',
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
                marginTop: '18px',
                maxWidth: '725px',
                fontSize: '25px',
                lineHeight: 1.2,
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
                    width: '132px',
                    height: '70px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderRadius: '18px',
                    border: '1px solid rgba(91,53,26,0.18)',
                    background: 'rgba(255,248,230,0.4)',
                    padding: '0 16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '27px',
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
              width: '27%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '54px 40px 44px',
              borderLeft: '2px solid rgba(91,53,26,0.16)',
            }}
          >
            <div
              style={{
                width: '172px',
                height: '172px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: '36px',
                border: '4px solid rgba(91,53,26,0.3)',
                background: 'rgba(255,248,230,0.44)',
                fontSize: '86px',
              }}
            >
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  width="172"
                  height="172"
                  style={{
                    width: '172px',
                    height: '172px',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                '🐸'
              )}
            </div>

            <div
              style={{
                marginTop: '32px',
                width: '220px',
                minHeight: '102px',
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
                marginTop: '32px',
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
                  fontSize: '27px',
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
                fontSize: '17px',
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
      height: 630,
    },
  );
}
