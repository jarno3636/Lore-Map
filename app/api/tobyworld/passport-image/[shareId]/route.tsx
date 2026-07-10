import { ImageResponse } from 'next/og';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

function cleanText(value: string | null | undefined, fallback: string, maxLength: number) {
  const cleaned = value?.trim().replace(/\s+/g, ' ');

  if (!cleaned) return fallback;

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function getTitleSize(title: string) {
  if (title.length > 48) return 48;
  if (title.length > 36) return 56;
  if (title.length > 25) return 64;

  return 72;
}

function getNameSize(name: string) {
  if (name.length > 28) return 38;
  if (name.length > 20) return 44;

  return 52;
}

function PassportFallback({ message }: { message: string }) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 15% 0%, rgba(105,220,245,0.22), transparent 34%), linear-gradient(135deg, #061419, #2b2115)',
        color: '#fff8e6',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: 920,
          height: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(249,201,104,0.42)',
          borderRadius: 42,
          background: 'rgba(4,21,28,0.82)',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#8de9ff',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 5,
          }}
        >
          TOBYWORLD POND PASSPORT
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 30,
            color: '#fff8e6',
            fontFamily: 'serif',
            fontSize: 58,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}

function FrogBadge() {
  return (
    <div
      style={{
        width: 174,
        height: 174,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '4px solid rgba(255,255,255,0.58)',
        borderRadius: 42,
        background:
          'radial-gradient(circle at 35% 20%, rgba(255,255,255,0.72), transparent 18%), linear-gradient(145deg, #8de9ff, #1d94d0 55%, #0b4869)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.7), 0 18px 34px rgba(30,116,151,0.28)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 122,
          height: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '54% 54% 48% 48%',
          background: 'linear-gradient(180deg, #b9f39d, #59bd69)',
          border: '4px solid rgba(28,92,62,0.55)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: 15,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: '#a6e98e',
            border: '4px solid rgba(28,92,62,0.55)',
          }}
        >
          <div
            style={{
              width: 14,
              height: 18,
              display: 'flex',
              borderRadius: 999,
              background: '#13261a',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            top: -20,
            right: 15,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: '#a6e98e',
            border: '4px solid rgba(28,92,62,0.55)',
          }}
        >
          <div
            style={{
              width: 14,
              height: 18,
              display: 'flex',
              borderRadius: 999,
              background: '#13261a',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 21,
            width: 68,
            height: 22,
            display: 'flex',
            borderBottom: '7px solid #194329',
            borderRadius: '0 0 999px 999px',
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        width: 142,
        height: 78,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        border: '1px solid rgba(91,53,26,0.17)',
        borderRadius: 18,
        paddingLeft: 18,
        background:
          'linear-gradient(145deg, rgba(255,255,255,0.56), rgba(255,248,230,0.28))',
      }}
    >
      <div
        style={{
          display: 'flex',
          color: '#2f1f15',
          fontSize: 29,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 7,
          color: '#7b3f23',
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: 1.5,
        }}
      >
        {label}
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
  try {
    const { shareId } = await context.params;

    const payload = await getPassportShare(shareId);

    if (!payload) {
      return new ImageResponse(
        <PassportFallback message="Passport not found" />,
        {
          width: WIDTH,
          height: HEIGHT,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    const name = cleanText(payload.name, 'Pond Visitor', 42);
    const handle = cleanText(payload.handle, 'Tobyworld traveler', 42);
    const title = cleanText(payload.title, 'Awaiting Pond Stamp', 72);
    const characteristic = cleanText(
      payload.characteristic,
      'The pond reviewed the file and became professionally concerned.',
      142,
    );
    const mark = cleanText(payload.mark, 'Unstamped Frog', 38);
    const mode = cleanText(payload.mode, 'APPROVED', 24);

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 56,
            background:
              'radial-gradient(circle at 12% 0%, rgba(101,211,246,0.28), transparent 32%), radial-gradient(circle at 92% 10%, rgba(249,201,104,0.25), transparent 34%), linear-gradient(135deg, #061419, #12291f 50%, #332313)',
            color: '#2f1f15',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 1088,
              height: 518,
              display: 'flex',
              overflow: 'hidden',
              border: '3px solid rgba(249,201,104,0.78)',
              borderRadius: 46,
              background:
                'linear-gradient(135deg, #fff8e6 0%, #f4e4b8 55%, #e9ca80 100%)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.85), 0 28px 70px rgba(0,0,0,0.32)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 1088,
                height: 518,
                display: 'flex',
                opacity: 0.22,
                backgroundImage:
                  'linear-gradient(rgba(91,53,26,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(91,53,26,0.06) 1px, transparent 1px)',
                backgroundSize: '26px 26px',
              }}
            />

            <div
              style={{
                position: 'absolute',
                right: 210,
                bottom: 40,
                display: 'flex',
                color: 'rgba(91,53,26,0.055)',
                fontFamily: 'serif',
                fontSize: 152,
                fontWeight: 900,
                transform: 'rotate(-12deg)',
              }}
            >
              POND
            </div>

            <div
              style={{
                position: 'relative',
                width: 790,
                height: 518,
                display: 'flex',
                flexDirection: 'column',
                padding: '46px 48px 38px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  color: '#7b3f23',
                  fontSize: 21,
                  fontWeight: 900,
                  letterSpacing: 5,
                }}
              >
                TOBYWORLD POND PASSPORT
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 16,
                  color: '#2f1f15',
                  fontFamily: 'serif',
                  fontSize: getNameSize(name),
                  fontWeight: 900,
                  lineHeight: 0.95,
                }}
              >
                {name}
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 8,
                  color: '#7b3f23',
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {handle}
              </div>

              <div
                style={{
                  width: 680,
                  height: 2,
                  display: 'flex',
                  marginTop: 20,
                  background: 'rgba(91,53,26,0.16)',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  marginTop: 24,
                  color: '#7b3f23',
                  fontSize: 17,
                  fontWeight: 900,
                  letterSpacing: 2,
                }}
              >
                POND TITLE
              </div>

              <div
                style={{
                  display: 'flex',
                  maxWidth: 700,
                  marginTop: 5,
                  color: '#2f1f15',
                  fontFamily: 'serif',
                  fontSize: getTitleSize(title),
                  fontWeight: 900,
                  lineHeight: 0.9,
                  letterSpacing: -2,
                }}
              >
                {title}
              </div>

              <div
                style={{
                  display: 'flex',
                  maxWidth: 690,
                  marginTop: 16,
                  color: '#3c281b',
                  fontSize: 23,
                  fontWeight: 700,
                  lineHeight: 1.22,
                }}
              >
                {characteristic}
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 'auto',
                  gap: 12,
                }}
              >
                <StatCard label="STREAK" value={payload.streak} />
                <StatCard label="RITES" value={payload.rites} />
                <StatCard label="POWER" value={payload.power} />
                <StatCard label="ASSETS" value={payload.assets} />
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                width: 298,
                height: 518,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '40px 30px 32px',
                borderLeft: '2px solid rgba(91,53,26,0.14)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(190,130,44,0.08))',
              }}
            >
              <FrogBadge />

              <div
                style={{
                  width: 224,
                  minHeight: 94,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 24,
                  border: '4px double rgba(123,63,35,0.47)',
                  borderRadius: 999,
                  background: 'rgba(255,248,230,0.4)',
                  transform: 'rotate(2deg)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    color: '#2f1f15',
                    fontSize: 17,
                    fontWeight: 900,
                    letterSpacing: 2,
                  }}
                >
                  POND STAMP
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: 7,
                    color: '#7b3f23',
                    fontSize: 14,
                    fontWeight: 900,
                    letterSpacing: 2,
                  }}
                >
                  {mode}
                </div>
              </div>

              <div
                style={{
                  width: 224,
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 25,
                  paddingTop: 20,
                  borderTop: '2px solid rgba(91,53,26,0.13)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    color: '#7b3f23',
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: 2,
                  }}
                >
                  CURRENT MARK
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: 8,
                    color: '#2f1f15',
                    fontFamily: 'serif',
                    fontSize: mark.length > 24 ? 25 : 31,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {mark}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 'auto',
                  color: '#7b3f23',
                  fontSize: 15,
                  fontWeight: 800,
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
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control':
            'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    console.error('Passport image route failed:', error);

    return new ImageResponse(
      <PassportFallback message="Passport image unavailable" />,
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
