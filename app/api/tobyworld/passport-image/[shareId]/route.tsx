import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  getPassportShare,
  type PassportSharePayload,
} from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 800;

const COLORS = {
  background: '#061419',
  backgroundLight: '#12333d',
  paper: '#fff8e6',
  paperMid: '#f2dfb1',
  paperDark: '#dfbd78',
  ink: '#2d1d13',
  brown: '#7b472b',
  mutedBrown: '#9b6944',
  gold: '#f8d77d',
  blue: '#8de9ff',
  green: '#a8e984',
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanShareId(value: string) {
  return value.trim().toLowerCase();
}

function compactText(value: string, maxLength: number) {
  const clean = value.trim().replace(/\s+/g, ' ');

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

function wrapText(
  value: string,
  maxCharacters: number,
  maxLines: number,
) {
  const words = value.trim().replace(/\s+/g, ' ').split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharacters) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length >= maxLines - 1) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  const originalText = value.trim().replace(/\s+/g, ' ');
  const renderedText = lines.join(' ');

  if (renderedText.length < originalText.length && lines.length > 0) {
    const finalIndex = lines.length - 1;
    lines[finalIndex] = compactText(
      lines[finalIndex],
      Math.max(4, maxCharacters - 1),
    );
  }

  return lines;
}

function getTitleFontSize(title: string) {
  if (title.length > 52) return 43;
  if (title.length > 40) return 49;
  if (title.length > 30) return 57;

  return 66;
}

function getNameFontSize(name: string) {
  if (name.length > 28) return 42;
  if (name.length > 20) return 49;

  return 57;
}

function getMarkFontSize(mark: string) {
  if (mark.length > 28) return 23;
  if (mark.length > 21) return 27;

  return 31;
}

function getSafePhotoPath(photo?: string) {
  const fallback = '/images/passport/frog-lily-agent.png';

  if (!photo?.startsWith('/images/passport/')) {
    return fallback;
  }

  if (!/\.(png|jpe?g|webp)$/i.test(photo)) {
    return fallback;
  }

  return photo;
}

async function createPhotoDataUri(photo?: string) {
  const relativePath = getSafePhotoPath(photo);
  const safeRelativePath = relativePath.replace(/^\/+/, '');
  const absolutePath = path.join(process.cwd(), 'public', safeRelativePath);

  try {
    const source = await readFile(absolutePath);

    const image = await sharp(source)
      .resize(188, 188, {
        fit: 'cover',
        position: 'centre',
      })
      .png()
      .toBuffer();

    return `data:image/png;base64,${image.toString('base64')}`;
  } catch (error) {
    console.warn('Passport photo fallback failed:', {
      relativePath,
      error,
    });

    return null;
  }
}

function createTextLines({
  lines,
  x,
  startY,
  lineHeight,
  fontSize,
  fontFamily,
  fontWeight,
  fill,
}: {
  lines: string[];
  x: number;
  startY: number;
  lineHeight: number;
  fontSize: number;
  fontFamily: 'display' | 'body';
  fontWeight: number;
  fill: string;
}) {
  const className = fontFamily === 'display' ? 'display-text' : 'body-text';

  return lines
    .map(
      (line, index) => `
        <text
          class="${className}"
          x="${x}"
          y="${startY + index * lineHeight}"
          fill="${fill}"
          font-size="${fontSize}"
          font-weight="${fontWeight}"
        >${escapeXml(line)}</text>
      `,
    )
    .join('');
}

function createStat({
  x,
  label,
  value,
}: {
  x: number;
  label: string;
  value: string;
}) {
  return `
    <g transform="translate(${x} 618)">
      <rect
        width="154"
        height="82"
        rx="18"
        fill="url(#statBackground)"
        stroke="${COLORS.brown}"
        stroke-opacity="0.18"
      />

      <path
        d="M 18 1 H 136"
        stroke="#ffffff"
        stroke-opacity="0.48"
        stroke-width="2"
        stroke-linecap="round"
      />

      <text
        class="display-text"
        x="18"
        y="38"
        fill="${COLORS.ink}"
        font-size="29"
        font-weight="700"
      >${escapeXml(value)}</text>

      <text
        class="body-text"
        x="18"
        y="64"
        fill="${COLORS.brown}"
        font-size="12"
        font-weight="900"
        letter-spacing="1.5"
      >${escapeXml(label)}</text>
    </g>
  `;
}

function createPhotoMarkup(photoDataUri: string | null) {
  if (!photoDataUri) {
    return `
      <rect
        x="889"
        y="105"
        width="178"
        height="178"
        rx="38"
        fill="#123943"
      />

      <circle
        cx="978"
        cy="194"
        r="58"
        fill="${COLORS.blue}"
        opacity="0.2"
      />

      <text
        class="display-text"
        x="978"
        y="218"
        text-anchor="middle"
        fill="${COLORS.blue}"
        font-size="76"
        font-weight="700"
      >T</text>
    `;
  }

  return `
    <image
      href="${photoDataUri}"
      x="884"
      y="100"
      width="188"
      height="188"
      preserveAspectRatio="xMidYMid slice"
      clip-path="url(#photoClip)"
    />
  `;
}

function createPassportSvg({
  payload,
  photoDataUri,
}: {
  payload: PassportSharePayload;
  photoDataUri: string | null;
}) {
  const name = compactText(payload.name, 42);
  const handle = compactText(payload.handle, 46);
  const title = compactText(payload.title, 72);
  const characteristic = compactText(payload.characteristic, 150);
  const mark = compactText(payload.mark, 40);
  const mode = compactText(payload.mode, 28);

  const titleFontSize = getTitleFontSize(title);
  const titleLineHeight = Math.round(titleFontSize * 0.96);
  const titleLines = wrapText(title, titleFontSize <= 49 ? 27 : 22, 3);

  const titleStartY = 332;
  const characteristicStartY =
    titleStartY + titleLines.length * titleLineHeight + 24;

  const characteristicLines = wrapText(
    characteristic,
    49,
    characteristicStartY > 500 ? 2 : 3,
  );

  const titleMarkup = createTextLines({
    lines: titleLines,
    x: 103,
    startY: titleStartY,
    lineHeight: titleLineHeight,
    fontSize: titleFontSize,
    fontFamily: 'display',
    fontWeight: 700,
    fill: COLORS.ink,
  });

  const characteristicMarkup = createTextLines({
    lines: characteristicLines,
    x: 105,
    startY: characteristicStartY,
    lineHeight: 33,
    fontSize: 25,
    fontFamily: 'body',
    fontWeight: 700,
    fill: '#49301f',
  });

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${IMAGE_WIDTH}"
  height="${IMAGE_HEIGHT}"
  viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}"
>
  <defs>
    <style>
      .display-text {
        font-family: "DejaVu Serif", "Liberation Serif", serif;
      }

      .body-text {
        font-family: "DejaVu Sans", "Liberation Sans", sans-serif;
      }
    </style>

    <linearGradient id="outerBackground" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.background}" />
      <stop offset="52%" stop-color="${COLORS.backgroundLight}" />
      <stop offset="100%" stop-color="#352515" />
    </linearGradient>

    <radialGradient id="blueGlow">
      <stop offset="0%" stop-color="${COLORS.blue}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${COLORS.blue}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="goldGlow">
      <stop offset="0%" stop-color="${COLORS.gold}" stop-opacity="0.34" />
      <stop offset="100%" stop-color="${COLORS.gold}" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="paperBackground" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.paper}" />
      <stop offset="52%" stop-color="${COLORS.paperMid}" />
      <stop offset="100%" stop-color="${COLORS.paperDark}" />
    </linearGradient>

    <linearGradient id="statBackground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffdf5" stop-opacity="0.82" />
      <stop offset="100%" stop-color="#efd49b" stop-opacity="0.58" />
    </linearGradient>

    <linearGradient id="stampBackground" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fffaf0" stop-opacity="0.78" />
      <stop offset="100%" stop-color="#e7c67e" stop-opacity="0.5" />
    </linearGradient>

    <pattern id="paperGrid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path
        d="M 22 0 L 0 0 0 22"
        fill="none"
        stroke="#5b351a"
        stroke-opacity="0.045"
      />
    </pattern>

    <pattern id="stars" width="82" height="82" patternUnits="userSpaceOnUse">
      <circle cx="13" cy="18" r="1.4" fill="#e8fbff" opacity="0.62" />
      <circle cx="59" cy="48" r="1" fill="#ffe9a8" opacity="0.48" />
      <circle cx="34" cy="70" r="0.8" fill="#e8fbff" opacity="0.4" />
    </pattern>

    <clipPath id="photoClip">
      <rect x="884" y="100" width="188" height="188" rx="40" />
    </clipPath>

    <filter id="cardShadow" x="-20%" y="-20%" width="150%" height="170%">
      <feDropShadow
        dx="0"
        dy="22"
        stdDeviation="22"
        flood-color="#000000"
        flood-opacity="0.38"
      />
    </filter>
  </defs>

  <rect width="1200" height="800" fill="url(#outerBackground)" />
  <rect width="1200" height="800" fill="url(#stars)" />

  <circle cx="130" cy="70" r="310" fill="url(#blueGlow)" />
  <circle cx="1080" cy="70" r="290" fill="url(#goldGlow)" />

  <path
    d="M0 680 C220 620 380 780 610 708 C830 640 985 680 1200 610 V800 H0 Z"
    fill="#07181d"
    opacity="0.44"
  />

  <rect
    x="42"
    y="42"
    width="1116"
    height="716"
    rx="48"
    fill="url(#paperBackground)"
    stroke="${COLORS.gold}"
    stroke-width="4"
    filter="url(#cardShadow)"
  />

  <rect
    x="42"
    y="42"
    width="1116"
    height="716"
    rx="48"
    fill="url(#paperGrid)"
  />

  <rect
    x="56"
    y="56"
    width="1088"
    height="688"
    rx="39"
    fill="none"
    stroke="#fff8dc"
    stroke-opacity="0.54"
    stroke-width="2"
  />

  <line
    x1="830"
    y1="44"
    x2="830"
    y2="756"
    stroke="${COLORS.brown}"
    stroke-opacity="0.16"
    stroke-width="2"
  />

  <text
    class="body-text"
    x="102"
    y="108"
    fill="${COLORS.brown}"
    font-size="21"
    font-weight="900"
    letter-spacing="4"
  >TOBYWORLD POND PASSPORT</text>

  <circle cx="744" cy="100" r="5" fill="${COLORS.blue}" opacity="0.8" />
  <circle cx="765" cy="100" r="5" fill="${COLORS.green}" opacity="0.8" />
  <circle cx="786" cy="100" r="5" fill="${COLORS.gold}" opacity="0.9" />

  <text
    class="display-text"
    x="102"
    y="184"
    fill="${COLORS.ink}"
    font-size="${getNameFontSize(name)}"
    font-weight="700"
  >${escapeXml(name)}</text>

  <text
    class="body-text"
    x="104"
    y="226"
    fill="${COLORS.brown}"
    font-size="22"
    font-weight="800"
  >${escapeXml(handle)}</text>

  <line
    x1="102"
    y1="254"
    x2="764"
    y2="254"
    stroke="${COLORS.brown}"
    stroke-opacity="0.17"
    stroke-width="2"
  />

  <text
    class="body-text"
    x="103"
    y="294"
    fill="${COLORS.mutedBrown}"
    font-size="17"
    font-weight="900"
    letter-spacing="3"
  >POND TITLE</text>

  ${titleMarkup}
  ${characteristicMarkup}

  <text
    class="display-text"
    x="756"
    y="558"
    text-anchor="end"
    fill="${COLORS.brown}"
    fill-opacity="0.065"
    font-size="148"
    font-weight="700"
    transform="rotate(-12 756 558)"
  >POND</text>

  ${createStat({
    x: 102,
    label: 'STREAK',
    value: payload.streak,
  })}

  ${createStat({
    x: 270,
    label: 'RITES',
    value: payload.rites,
  })}

  ${createStat({
    x: 438,
    label: 'POWER',
    value: payload.power,
  })}

  ${createStat({
    x: 606,
    label: 'ASSETS',
    value: payload.assets,
  })}

  <rect
    x="876"
    y="92"
    width="204"
    height="204"
    rx="46"
    fill="#fffaf0"
    fill-opacity="0.48"
    stroke="${COLORS.brown}"
    stroke-opacity="0.36"
    stroke-width="4"
  />

  <path
    d="M 898 94 H 1058"
    stroke="#ffffff"
    stroke-opacity="0.7"
    stroke-width="3"
    stroke-linecap="round"
  />

  ${createPhotoMarkup(photoDataUri)}

  <rect
    x="860"
    y="330"
    width="236"
    height="120"
    rx="60"
    fill="url(#stampBackground)"
    stroke="${COLORS.brown}"
    stroke-opacity="0.56"
    stroke-width="4"
  />

  <rect
    x="869"
    y="339"
    width="218"
    height="102"
    rx="51"
    fill="none"
    stroke="${COLORS.brown}"
    stroke-opacity="0.3"
    stroke-width="2"
  />

  <text
    class="display-text"
    x="978"
    y="380"
    text-anchor="middle"
    fill="${COLORS.ink}"
    font-size="25"
    font-weight="700"
  >POND STAMP</text>

  <text
    class="body-text"
    x="978"
    y="414"
    text-anchor="middle"
    fill="${COLORS.brown}"
    font-size="14"
    font-weight="900"
    letter-spacing="2"
  >${escapeXml(mode)}</text>

  <text
    class="body-text"
    x="872"
    y="503"
    fill="${COLORS.mutedBrown}"
    font-size="15"
    font-weight="900"
    letter-spacing="2.5"
  >CURRENT MARK</text>

  <text
    class="display-text"
    x="872"
    y="548"
    fill="${COLORS.ink}"
    font-size="${getMarkFontSize(mark)}"
    font-weight="700"
  >${escapeXml(mark)}</text>

  <line
    x1="872"
    y1="577"
    x2="1088"
    y2="577"
    stroke="${COLORS.brown}"
    stroke-opacity="0.18"
    stroke-width="2"
  />

  <text
    class="display-text"
    x="978"
    y="640"
    text-anchor="middle"
    fill="${COLORS.brown}"
    font-size="18"
    font-weight="700"
  >We move not by leaps.</text>

  <text
    class="display-text"
    x="978"
    y="670"
    text-anchor="middle"
    fill="${COLORS.brown}"
    font-size="18"
    font-weight="700"
  >We move by stillness.</text>

  <text
    class="body-text"
    x="978"
    y="713"
    text-anchor="middle"
    fill="${COLORS.mutedBrown}"
    font-size="12"
    font-weight="900"
    letter-spacing="2.5"
  >TOBYWORLD ATLAS</text>
</svg>
  `;
}

function createErrorResponse({
  shareId,
  error,
}: {
  shareId: string;
  error: unknown;
}) {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown passport image error.';

  console.error('Passport image route failed:', {
    shareId,
    message,
    error,
  });

  return Response.json(
    {
      ok: false,
      shareId,
      error: message,
    },
    {
      status: 500,
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
  const { shareId: rawShareId } = await context.params;
  const shareId = cleanShareId(rawShareId);

  try {
    const payload = await getPassportShare(shareId);

    if (!payload) {
      return Response.json(
        {
          ok: false,
          shareId,
          error: 'Passport share not found.',
        },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    const photoDataUri = await createPhotoDataUri(payload.photo);
    const svg = createPassportSvg({
      payload,
      photoDataUri,
    });

    const png = await sharp(Buffer.from(svg))
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: false,
      })
      .toBuffer();

    const requestUrl = new URL(request.url);
    const shouldDownload =
      requestUrl.searchParams.get('download') === '1';

    const disposition = shouldDownload
      ? `attachment; filename="tobyworld-passport-${shareId}.png"`
      : `inline; filename="tobyworld-passport-${shareId}.png"`;

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.byteLength),
        'Content-Disposition': disposition,
        'Cache-Control':
          'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return createErrorResponse({
      shareId,
      error,
    });
  }
}
