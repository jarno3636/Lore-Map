import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;

type PassportSharePayload = {
  title: string;
  characteristic: string;
  name: string;
  handle: string;
  mark: string;
  streak: string;
  rites: string;
  power: string;
  assets: string;
  stamp: string;
  mode: string;
  photo?: string;
};

type PassportShareRow = {
  payload: PassportSharePayload | null;
};

function cleanText(
  value: unknown,
  fallback: string,
  maxLength: number,
) {
  if (typeof value !== 'string') return fallback;

  const cleaned = value.trim().replace(/\s+/g, ' ');

  if (!cleaned) return fallback;
  if (cleaned.length <= maxLength) return cleaned;

  return `${cleaned.slice(0, maxLength - 3).trim()}...`;
}

function getTitleSize(title: string) {
  if (title.length > 55) return 45;
  if (title.length > 42) return 51;
  if (title.length > 30) return 59;

  return 68;
}

function getNameSize(name: string) {
  if (name.length > 30) return 37;
  if (name.length > 22) return 43;

  return 51;
}

async function getPassportShare(
  shareId: string,
): Promise<PassportSharePayload | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error('Passport image missing Supabase environment variables.');
    return null;
  }

  const url = new URL(
    '/rest/v1/tobyworld_passport_shares',
    supabaseUrl,
  );

  url.searchParams.set('id', `eq.${shareId}`);
  url.searchParams.set('select', 'payload');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error(
      'Passport image Supabase read failed:',
      response.status,
      await response.text(),
    );

    return null;
  }

  const rows = (await response.json()) as PassportShareRow[];
  const payload = rows[0]?.payload;

  if (!payload) return null;

  return {
    title: cleanText(
      payload.title,
      'Awaiting Pond Stamp',
      72,
    ),
    characteristic: cleanText(
      payload.characteristic,
      'The pond reviewed the file and became professionally concerned.',
      145,
    ),
    name: cleanText(
      payload.name,
      'Pond Visitor',
      52,
    ),
    handle: cleanText(
      payload.handle,
      'Tobyworld traveler',
      52,
    ),
    mark: cleanText(
      payload.mark,
      'Unstamped Frog',
      42,
    ),
    streak: cleanText(payload.streak, '0d', 12),
    rites: cleanText(payload.rites, '0', 12),
    power: cleanText(payload.power, '1x', 12),
    assets: cleanText(payload.assets, '0/3', 12),
    stamp: cleanText(
      payload.stamp,
      'POND STAMP',
      32,
    ),
    mode: cleanText(
      payload.mode,
      'APPROVED',
      32,
    ),
  };
}

function Stat({
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
        height: 76,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        border: '1px solid rgba(91,53,26,0.16)',
        borderRadius: 17,
        paddingLeft: 18,
        background:
          'linear-gradient(145deg, rgba(255,255,255,0.58), rgba(255,248,230,0.25))',
      }}
    >
      <div
        style={{
          display: 'flex',
          color: '#2f1f15',
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 6,
          color: '#7b3f23',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 1.4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FrogMark() {
  return (
    <div
      style={{
        width: 164,
        height: 164,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '4px solid rgba(255,255,255,0.65)',
        borderRadius: 39,
        background:
          'radial-gradient(circle at 30% 18%, rgba(255,255,255,0.85), transparent 18%), linear-gradient(145deg, #9beeff, #269fd4 58%, #0c4c6c)',
        boxShadow:
          'inset 0 2px 0 rgba(255,255,255,0.65), 0 20px 38px rgba(26,100,134,0.28)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 116,
          height: 84,
          display: 'flex',
          border: '4px solid #2d7046',
          borderRadius: '54% 54% 48% 48%',
          background:
            'linear-gradient(180deg, #bff3a6, #62bf70)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -22,
            left: 12,
            width: 39,
            height: 39,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #2d7046',
            borderRadius: 999,
            background: '#b4eb9b',
          }}
        >
          <div
            style={{
              width: 13,
              height: 17,
              display: 'flex',
              borderRadius: 999,
              background: '#14291b',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            top: -22,
            right: 12,
            width: 39,
            height: 39,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #2d7046',
            borderRadius: 999,
            background: '#b4eb9b',
          }}
        >
          <div
            style={{
              width: 13,
              height: 17,
              display: 'flex',
              borderRadius: 999,
              background: '#14291b',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 23,
            bottom: 18,
            width: 64,
            height: 21,
            display: 'flex',
            borderBottom: '7px solid #214d30',
            borderRadius: '0 0 999px 999px',
          }}
        />
      </div>
    </div>
  );
}

function ErrorImage({
  message,
}: {
  message: string;
}) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 15% 0%, rgba(141,233,255,0.2), transparent 34%), linear-gradient(135deg, #061419, #312315)',
        color: '#fff8e6',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: 900,
          height: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(249,201,104,0.42)',
          borderRadius: 40,
          background: 'rgba(4,21,28,0.78)',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#8de9ff',
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: 5,
          }}
        >
          TOBYWORLD POND PASSPORT
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            color: '#fff8e6',
            fontFamily: 'Georgia, serif',
            fontSize: 56,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      shareId: string;
    }>;
  },
) {
  try {
    const { shareId } = await context.params;

    if (!/^[a-zA-Z0-9]{8,32}$/.test(shareId)) {
      return new ImageResponse(
        <ErrorImage message="Invalid passport" />,
        {
          width: WIDTH,
          height: HEIGHT,
        },
      );
    }

    const payload = await getPassportShare(shareId);

    if (!payload) {
      return new ImageResponse(
        <ErrorImage message="Passport not found" />,
        {
          width: WIDTH,
          height: HEIGHT,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 54,
            background:
              'radial-gradient(circle at 12% 0%, rgba(94,218,246,0.3), transparent 32%), radial-gradient(circle at 90% 0%, rgba(249,201,104,0.27), transparent 33%), linear-gradient(135deg, #061419, #13291f 52%, #352313)',
            color: '#2f1f15',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 1092,
              height: 522,
              display: 'flex',
              overflow: 'hidden',
              border: '3px solid rgba(249,201,104,0.82)',
              borderRadius: 47,
              background:
                'linear-gradient(135deg, #fff9e8 0%, #f4e3b5 58%, #e7c778 100%)',
              boxShadow:
                'inset 0 2px 0 rgba(255,255,255,0.75), 0 30px 74px rgba(0,0,0,0.34)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                opacity: 0.2,
                backgroundImage:
                  'linear-gradient(rgba(91,53,26,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(91,53,26,0.055) 1px, transparent 1px)',
                backgroundSize: '25px 25px',
              }}
            />

            <div
              style={{
                position: 'absolute',
                right: 188,
                bottom: 35,
                display: 'flex',
                color: 'rgba(91,53,26,0.055)',
                fontFamily: 'Georgia, serif',
                fontSize: 150,
                fontWeight: 800,
                transform: 'rotate(-12deg)',
              }}
            >
              POND
            </div>

            <div
              style={{
                position: 'relative',
                width: 792,
                height: 522,
                display: 'flex',
                flexDirection: 'column',
                padding: '43px 47px 36px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  color: '#7b3f23',
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 5,
                }}
              >
                TOBYWORLD POND PASSPORT
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 13,
                  color: '#2f1f15',
                  fontFamily: 'Georgia, serif',
                  fontSize: getNameSize(payload.name),
                  fontWeight: 800,
                  lineHeight: 0.95,
                }}
              >
                {payload.name}
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 7,
                  color: '#7b3f23',
                  fontSize: 21,
                  fontWeight: 700,
                }}
              >
                {payload.handle}
              </div>

              <div
                style={{
                  width: 690,
                  height: 2,
                  display: 'flex',
                  marginTop: 18,
                  background: 'rgba(91,53,26,0.15)',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  marginTop: 20,
                  color: '#7b3f23',
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: 2,
                }}
              >
                POND TITLE
              </div>

              <div
                style={{
                  display: 'flex',
                  maxWidth: 700,
                  marginTop: 4,
                  color: '#2f1f15',
                  fontFamily: 'Georgia, serif',
                  fontSize: getTitleSize(payload.title),
                  fontWeight: 800,
                  lineHeight: 0.9,
                  letterSpacing: -2,
                }}
              >
                {payload.title}
              </div>

              <div
                style={{
                  display: 'flex',
                  maxWidth: 690,
                  marginTop: 14,
                  color: '#3c281b',
                  fontSize: 22,
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
                <Stat
                  label="STREAK"
                  value={payload.streak}
                />

                <div style={{ width: 11 }} />

                <Stat
                  label="RITES"
                  value={payload.rites}
                />

                <div style={{ width: 11 }} />

                <Stat
                  label="POWER"
                  value={payload.power}
                />

                <div style={{ width: 11 }} />

                <Stat
                  label="ASSETS"
                  value={payload.assets}
                />
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                width: 300,
                height: 522,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '38px 31px 29px',
                borderLeft: '2px solid rgba(91,53,26,0.14)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(181,119,34,0.08))',
              }}
            >
              <FrogMark />

              <div
                style={{
                  width: 224,
                  minHeight: 91,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 23,
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
                    fontSize: 16,
                    fontWeight: 800,
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
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 2,
                  }}
                >
                  {payload.mode}
                </div>
              </div>

              <div
                style={{
                  width: 224,
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 23,
                  paddingTop: 18,
                  borderTop: '2px solid rgba(91,53,26,0.13)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    color: '#7b3f23',
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 2,
                  }}
                >
                  CURRENT MARK
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: 7,
                    color: '#2f1f15',
                    fontFamily: 'Georgia, serif',
                    fontSize:
                      payload.mark.length > 24 ? 24 : 30,
                    fontWeight: 800,
                    lineHeight: 1,
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
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  textAlign: 'center',
                }}
              >
                We move not by leaps.
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
          'Cache-Control':
            'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error(
      'Passport image Edge route failed:',
      error,
    );

    return new ImageResponse(
      <ErrorImage message="Passport unavailable" />,
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
