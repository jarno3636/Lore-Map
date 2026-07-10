import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import {
  getPassportShare,
  type PassportSharePayload,
} from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

const DEFAULT_PHOTO = '/images/passport/frog-lily-agent.png';

function compactText(value: string, maxLength: number) {
  const clean = value.trim().replace(/\s+/g, ' ');

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

function getTitleFontSize(title: string) {
  if (title.length > 62) return 48;
  if (title.length > 50) return 54;
  if (title.length > 38) return 60;

  return 68;
}

function getNameFontSize(name: string) {
  if (name.length > 28) return 40;
  if (name.length > 20) return 47;

  return 55;
}

function getMarkFontSize(mark: string) {
  if (mark.length > 30) return 20;
  if (mark.length > 23) return 23;

  return 27;
}

function getSafePhotoPath(photo?: string) {
  if (!photo) return DEFAULT_PHOTO;

  const clean = photo.trim();

  if (!clean.startsWith('/images/passport/')) {
    return DEFAULT_PHOTO;
  }

  if (!/\.(png|jpg|jpeg|webp)$/i.test(clean)) {
    return DEFAULT_PHOTO;
  }

  if (clean.includes('..')) {
    return DEFAULT_PHOTO;
  }

  return clean;
}

function getImageMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  return 'image/png';
}

async function loadPhotoDataUrl(photo?: string) {
  const safePublicPath = getSafePhotoPath(photo);
  const relativePath = safePublicPath.replace(/^\/+/, '');
  const absolutePath = path.join(process.cwd(), 'public', relativePath);

  try {
    const file = await readFile(absolutePath);
    const mimeType = getImageMimeType(absolutePath);

    return `data:${mimeType};base64,${file.toString('base64')}`;
  } catch (error) {
    console.error('Passport photo load failed:', {
      safePublicPath,
      absolutePath,
      error,
    });

    if (safePublicPath !== DEFAULT_PHOTO) {
      return loadPhotoDataUrl(DEFAULT_PHOTO);
    }

    return null;
  }
}

function getContentDisposition(request: Request, shareId: string) {
  const requestUrl = new URL(request.url);

  if (requestUrl.searchParams.get('download') !== '1') {
    return 'inline';
  }

  return `attachment; filename="tobyworld-pond-passport-${shareId}.png"`;
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
        display: 'flex',
        width: 142,
        height: 72,
        flexDirection: 'column',
        justifyContent: 'center',
        border: '1px solid rgba(91,53,26,0.15)',
        borderRadius: 17,
        padding: '0 18px',
        background: 'rgba(255,248,230,0.58)',
      }}
    >
      <div
        style={{
          display: 'flex',
          color: '#2f1f15',
          fontFamily: 'Georgia',
          fontSize: 27,
          fontWeight: 700,
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
          fontFamily: 'Arial',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ErrorArtwork({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 20% 0%, rgba(141,233,255,0.22), transparent 36%), linear-gradient(135deg, #061419, #352413)',
        color: '#fff8e6',
        fontFamily: 'Arial',
      }}
    >
      <div
        style={{
          display: 'flex',
          color: '#8de9ff',
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
          marginTop: 24,
          color: '#fff8e6',
          fontFamily: 'Georgia',
          fontSize: 58,
          fontWeight: 700,
        }}
      >
        {message}
      </div>
    </div>
  );
}

function PassportArtwork({
  payload,
  photoDataUrl,
}: {
  payload: PassportSharePayload;
  photoDataUrl: string | null;
}) {
  const title = compactText(payload.title, 72);
  const characteristic = compactText(payload.characteristic, 145);
  const name = compactText(payload.name, 44);
  const handle = compactText(payload.handle, 46);
  const mark = compactText(payload.mark, 40);
  const mode = compactText(payload.mode, 26);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 12% 5%, rgba(141,233,255,0.35), transparent 32%), radial-gradient(circle at 90% 8%, rgba(248,215,125,0.34), transparent 34%), linear-gradient(135deg, #08232b 0%, #132d2a 48%, #372511 100%)',
        color: '#2f1f15',
        fontFamily: 'Arial',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          opacity: 0.44,
          backgroundImage:
            'radial-gradient(circle, rgba(232,251,255,0.75) 0 1px, transparent 1.7px)',
          backgroundPosition: '16px 19px',
          backgroundSize: '92px 78px',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: 1050,
          height: 506,
          overflow: 'hidden',
          border: '3px solid rgba(248,215,125,0.85)',
          borderRadius: 47,
          background:
            'linear-gradient(135deg, #fff8e6 0%, #f4e2b8 55%, #e5c884 100%)',
          boxShadow: '0 28px 70px rgba(0,0,0,0.38)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 10,
            display: 'flex',
            border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: 36,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            opacity: 0.34,
            backgroundImage:
              'linear-gradient(rgba(91,53,26,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(91,53,26,0.035) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 18,
            bottom: 66,
            display: 'flex',
            color: 'rgba(91,53,26,0.055)',
            fontFamily: 'Georgia',
            fontSize: 146,
            fontWeight: 700,
            lineHeight: 1,
            transform: 'rotate(-12deg)',
          }}
        >
          POND
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: 744,
            height: '100%',
            flexDirection: 'column',
            padding: '42px 38px 34px 55px',
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#7b3f23',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 4.5,
            }}
          >
            TOBYWORLD POND PASSPORT
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 9,
              color: '#2f1f15',
              fontFamily: 'Georgia',
              fontSize: getNameFontSize(name),
              fontWeight: 700,
              lineHeight: 0.94,
              letterSpacing: -1.4,
            }}
          >
            {name}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 7,
              color: '#7b3f23',
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {handle}
          </div>

          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 2,
              marginTop: 23,
              background: 'rgba(91,53,26,0.14)',
            }}
          />

          <div
            style={{
              display: 'flex',
              marginTop: 24,
              color: '#7b3f23',
              fontSize: 17,
              fontWeight: 900,
            }}
          >
            POND TITLE
          </div>

          <div
            style={{
              display: 'flex',
              width: 650,
              marginTop: 2,
              color: '#2f1f15',
              fontFamily: 'Georgia',
              fontSize: getTitleFontSize(title),
              fontWeight: 700,
              lineHeight: 0.89,
              letterSpacing: -2.4,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: 'flex',
              width: 640,
              marginTop: 16,
              color: '#3c281b',
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.16,
            }}
          >
            {characteristic}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 'auto',
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
            display: 'flex',
            width: 306,
            height: '100%',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '35px 30px 30px',
            borderLeft: '2px solid rgba(91,53,26,0.13)',
            background: 'rgba(232,197,125,0.08)',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              width: 168,
              height: 168,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '4px solid rgba(91,53,26,0.3)',
              borderRadius: 38,
              background: 'rgba(255,248,230,0.5)',
              fontSize: 78,
            }}
          >
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt=""
                width="168"
                height="168"
                style={{
                  width: 168,
                  height: 168,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{ display: 'flex' }}>FROG</div>
            )}

            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 8,
                display: 'flex',
                width: 100,
                height: 34,
                borderRadius: 999,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.65), transparent)',
                transform: 'rotate(-10deg)',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              width: 234,
              minHeight: 100,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 26,
              border: '4px double rgba(123,63,35,0.5)',
              borderRadius: 999,
              padding: '15px 18px',
              background: 'rgba(255,248,230,0.44)',
              transform: 'rotate(2deg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#2f1f15',
                fontSize: 21,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {payload.stamp}
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 10,
                color: '#7b3f23',
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: 1.6,
              }}
            >
              {mode}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              width: '100%',
              flexDirection: 'column',
              marginTop: 25,
              padding: '0 4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#9b6944',
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 2.4,
              }}
            >
              CURRENT MARK
            </div>

            <div
              style={{
                display: 'flex',
                width: '100%',
                marginTop: 7,
                color: '#2f1f15',
                fontFamily: 'Georgia',
                fontSize: getMarkFontSize(mark),
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {mark}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 2,
              marginTop: 20,
              background: 'rgba(91,53,26,0.14)',
            }}
          />

          <div
            style={{
              display: 'flex',
              width: '100%',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 'auto',
              color: '#7b3f23',
              fontFamily: 'Georgia',
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.28,
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex' }}>We move not by leaps.</div>
            <div style={{ display: 'flex' }}>We move by stillness.</div>
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 13,
              color: '#9b6944',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 2.2,
            }}
          >
            TOBYWORLD ATLAS
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
  const { shareId: rawShareId } = await context.params;
  const shareId = rawShareId.trim().toLowerCase();

  try {
    const payload = await getPassportShare(shareId);

    if (!payload) {
      return new ImageResponse(
        <ErrorArtwork message="Passport not found" />,
        {
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Disposition': 'inline',
          },
        },
      );
    }

    const photoDataUrl = await loadPhotoDataUrl(payload.photo);

    return new ImageResponse(
      <PassportArtwork
        payload={payload}
        photoDataUrl={photoDataUrl}
      />,
      {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        headers: {
          'Cache-Control':
            'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
          'Content-Disposition': getContentDisposition(request, shareId),
        },
      },
    );
  } catch (error) {
    console.error('Passport image route failed:', {
      shareId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    return new ImageResponse(
      <ErrorArtwork message="Passport image unavailable" />,
      {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': 'inline',
        },
      },
    );
  }
}
