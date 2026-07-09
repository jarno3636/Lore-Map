import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function cleanParam(
  url: URL,
  key: string,
  fallback: string,
  maxLength = 120,
) {
  const value = url.searchParams.get(key)?.trim().replace(/\s+/g, ' ');

  if (!value) return fallback;

  return value.slice(0, maxLength);
}

function getPhotoUrl(requestUrl: URL) {
  const rawPhoto = requestUrl.searchParams.get('photo')?.trim();

  if (!rawPhoto) return '';

  if (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://')) {
    return rawPhoto;
  }

  if (rawPhoto.startsWith('/')) {
    return `${requestUrl.origin}${rawPhoto}`;
  }

  return '';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const title = cleanParam(requestUrl, 'title', 'Awaiting Pond Stamp', 72);
  const characteristic = cleanParam(
    requestUrl,
    'characteristic',
    'The pond reviewed the file and became professionally concerned.',
    150,
  );
  const name = cleanParam(requestUrl, 'name', 'Unstamped Frog', 52);
  const handle = cleanParam(requestUrl, 'handle', 'Tobyworld traveler', 52);
  const mark = cleanParam(requestUrl, 'mark', 'Unstamped Frog', 42);
  const streak = cleanParam(requestUrl, 'streak', '0d', 12);
  const rites = cleanParam(requestUrl, 'rites', '0', 12);
  const power = cleanParam(requestUrl, 'power', '1x', 12);
  const assets = cleanParam(requestUrl, 'assets', '0/3', 12);
  const stamp = cleanParam(requestUrl, 'stamp', '△ · 🐸 · 🍃', 32);
  const mode = cleanParam(requestUrl, 'mode', 'APPROVED', 32);
  const photo = getPhotoUrl(requestUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          padding: '54px',
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
              right: '-20px',
              bottom: '76px',
              fontSize: '156px',
              fontFamily: 'Georgia',
              fontWeight: 900,
              color: 'rgba(91,53,26,0.08)',
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
              padding: '58px 56px',
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
                fontSize: '56px',
                lineHeight: 0.92,
                fontFamily: 'Georgia',
                fontWeight: 900,
                color: '#2f1f15',
              }}
            >
              {name}
            </div>

            <div
              style={{
                marginTop: '12px',
                fontSize: '25px',
                fontWeight: 800,
                color: '#7b3f23',
              }}
            >
              {handle}
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
                marginTop: '16px',
                maxWidth: '725px',
                fontSize: title.length > 34 ? '52px' : '66px',
                lineHeight: 0.9,
                fontFamily: 'Georgia',
                fontWeight: 900,
                color: '#2f1f15',
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: '24px',
                maxWidth: '730px',
                fontSize: '26px',
                lineHeight: 1.22,
                fontWeight: 800,
                color: '#3c281b',
              }}
            >
              {characteristic}
            </div>

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                gap: '14px',
              }}
            >
              {[
                ['STREAK', streak],
                ['RITES', rites],
                ['POWER', power],
                ['ASSETS', assets],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    width: '132px',
                    height: '72px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderRadius: '18px',
                    border: '1px solid rgba(91,53,26,0.18)',
                    background: 'rgba(255,248,230,0.38)',
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
              padding: '58px 40px',
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
                marginTop: '34px',
                width: '220px',
                minHeight: '104px',
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
                {stamp}
              </div>
              <div
                style={{
                  marginTop: '7px',
                  fontSize: '17px',
                  fontWeight: 900,
                  letterSpacing: '2.5px',
                  color: '#7b3f23',
                }}
              >
                {mode}
              </div>
            </div>

            <div
              style={{
                marginTop: '34px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '20px',
                fontWeight: 900,
                color: '#2f1f15',
              }}
            >
              <div>MARK</div>
              <div
                style={{
                  fontSize: '27px',
                  lineHeight: 1.05,
                  fontFamily: 'Georgia',
                  fontWeight: 900,
                }}
              >
                {mark}
              </div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                fontSize: '18px',
                fontWeight: 900,
                color: '#7b3f23',
                textAlign: 'center',
                lineHeight: 1.2,
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
