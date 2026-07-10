import { ImageResponse } from 'next/og';
import { getPassportShare } from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 800;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown passport image error.';
}

function getTitleSize(value: string) {
  if (value.length > 48) return 44;
  if (value.length > 34) return 52;
  if (value.length > 24) return 60;

  return 68;
}

function getNameSize(value: string) {
  if (value.length > 30) return 40;
  if (value.length > 22) return 48;

  return 56;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      shareId: string;
    }>;
  },
) {
  const { shareId } = await context.params;

  try {
    const payload = await getPassportShare(shareId);

    if (!payload) {
      return Response.json(
        {
          ok: false,
          error: 'Passport share not found.',
          shareId,
        },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

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

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            padding: 52,
            background:
              'linear-gradient(135deg, #061419 0%, #12303a 52%, #352413 100%)',
            fontFamily: 'Arial, sans-serif',
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
              borderRadius: 42,
              background:
                'linear-gradient(135deg, #fff8e6 0%, #f0ddb0 58%, #e5ca8e 100%)',
            }}
          >
            <div
              style={{
                width: 790,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '50px 46px 44px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  color: '#7b3f23',
                  fontSize: 21,
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
                  fontSize: 22,
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
                  fontSize: 17,
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
                  fontSize: getTitleSize(payload.title),
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
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.24,
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
                      marginRight: index === stats.length - 1 ? 0 : 12,
                      border: '1px solid rgba(91,53,26,0.22)',
                      borderRadius: 17,
                      padding: '0 15px',
                      background: 'rgba(255,248,230,0.45)',
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
                width: 306,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '50px 32px 42px',
                borderLeft: '2px solid rgba(91,53,26,0.18)',
              }}
            >
              <div
                style={{
                  width: 176,
                  height: 176,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid rgba(91,53,26,0.3)',
                  borderRadius: 38,
                  color: '#2f1f15',
                  background:
                    'linear-gradient(145deg, rgba(141,233,255,0.45), rgba(255,248,230,0.55))',
                  fontSize: 82,
                  fontWeight: 900,
                }}
              >
                T
              </div>

              <div
                style={{
                  width: 228,
                  minHeight: 104,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 34,
                  border: '5px double rgba(123,63,35,0.48)',
                  borderRadius: 80,
                  padding: '14px',
                  background: 'rgba(255,248,230,0.4)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    color: '#2f1f15',
                    fontSize: 20,
                    fontWeight: 900,
                  }}
                >
                  POND STAMP
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: 7,
                    color: '#7b3f23',
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 1.8,
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
                    fontSize: payload.mark.length > 24 ? 22 : 28,
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
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': `inline; filename="tobyworld-passport-${shareId}.png"`,
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    console.error('Passport image route failed:', {
      shareId,
      error,
    });

    return Response.json(
      {
        ok: false,
        error: getErrorMessage(error),
        shareId,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
