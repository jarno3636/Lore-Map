import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  getPassportShare,
  type PassportSharePayload,
} from '@/lib/tobyworld-passport-share';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 800;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanId(value: string) {
  return value.trim().toLowerCase();
}

function clampText(value: string, maxLength: number) {
  const clean = value.trim().replace(/\s+/g, ' ');

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function splitLines(
  value: string,
  maxCharacters: number,
  maxLines: number,
) {
  const words = value.trim().replace(/\s+/g, ' ').split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxCharacters) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;

    if (lines.length >= maxLines - 1) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const joinedLength = lines.join(' ').length;
  const original = value.trim().replace(/\s+/g, ' ');

  if (joinedLength < original.length && lines.length > 0) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = clampText(lines[lastIndex], Math.max(4, maxCharacters - 1));
  }

  return lines;
}

function titleFontSize(value: string) {
  if (value.length > 48) return 46;
  if (value.length > 36) return 54;
  if (value.length > 26) return 62;

  return 70;
}

function nameFontSize(value: string) {
  if (value.length > 30) return 42;
  if (value.length > 22) return 50;

  return 58;
}

function safePhotoPath(photo?: string) {
  const fallback = '/images/passport/frog-lily-agent.png';

  if (!photo?.startsWith('/images/passport/')) {
    return fallback;
  }

  if (!/\.(png|jpg|jpeg|webp)$/i.test(photo)) {
    return fallback;
  }

  return photo;
}

async function getPhotoDataUri(photo?: string) {
  const relativePath = safePhotoPath(photo);
  const filePath = path.join(process.cwd(), 'public', relativePath);

  try {
    const source = await readFile(filePath);

    const png = await sharp(source)
      .resize(180, 180, {
        fit: 'cover',
        position: 'centre',
      })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (error) {
    console.warn('Passport photo could not be loaded:', {
      relativePath,
      error,
    });

    return null;
  }
}

function createPassportSvg({
  payload,
  photoDataUri,
}: {
  payload: PassportSharePayload;
  photoDataUri: string | null;
}) {
  const safeName = clampText(payload.name, 42);
  const safeHandle = clampText(payload.handle, 44);
  const safeTitle = clampText(payload.title, 68);
  const safeMark = clampText(payload.mark, 38);
  const safeMode = clampText(payload.mode, 28);

  const titleLines = splitLines(safeTitle, 23, 3);
  const characteristicLines = splitLines(payload.characteristic, 52, 3);

  const titleSize = titleFontSize(safeTitle);
  const titleLineHeight = Math.round(titleSize * 0.92);
  const characteristicStart =
    344 + titleLines.length * titleLineHeight + 18;

  const titleText = titleLines
    .map(
      (line, index) => `
        <text
          x="104"
          y="${344 + index * titleLineHeight}"
          fill="#2f1f15"
          font-family="Georgia, Times New Roman, serif"
          font-size="${titleSize}"
          font-weight="700"
        >${escapeXml(line)}</text>
      `,
    )
    .join('');

  const characteristicText = characteristicLines
    .map(
      (line, index) => `
        <text
          x="104"
          y="${characteristicStart + index * 34}"
          fill="#3c281b"
          font-family="Arial, Helvetica, sans-serif"
          font-size="26"
          font-weight="700"
        >${escapeXml(line)}</text>
      `,
    )
    .join('');

  const photoMarkup = photoDataUri
    ? `
      <defs>
        <clipPath id="photoClip">
          <rect x="888" y="104" width="180" height="180" rx="36" ry="36" />
        </clipPath>
      </defs>

      <image
        href="${photoDataUri}"
        x="888"
        y="104"
        width="180"
        height="180"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#photoClip)"
      />
    `
    : `
      <rect
        x="888"
        y="104"
        width="180"
        height="180"
        rx="36"
        fill="#d6eef0"
      />

      <text
        x="978"
        y="218"
        text-anchor="middle"
        fill="#164552"
        font-family="Arial, Helvetica, sans-serif"
        font-size="82"
        font-weight="900"
      >T</text>
    `;

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${WIDTH}"
  height="${HEIGHT}"
  viewBox="0 0 ${WIDTH} ${HEIGHT}"
>
  <defs>
    <linearGradient id="outside" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#061419" />
      <stop offset="52%" stop-color="#12303a" />
      <stop offset="100%" stop-color="#352413" />
    </linearGradient>

    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff8e6" />
      <stop offset="58%" stop-color="#f0ddb0" />
      <stop offset="100%" stop-color="#e5ca8e" />
    </linearGradient>

    <linearGradient id="stat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffaf0" stop-opacity="0.78" />
      <stop offset="100%" stop-color="#f5deb0" stop-opacity="0.72" />
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow
        dx="0"
        dy="20"
        stdDeviation="20"
        flood-color="#000000"
        flood-opacity="0.34"
      />
    </filter>

    <pattern id="paperGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path
        d="M 20 0 L 0 0 0 20"
        fill="none"
        stroke="#5b351a"
        stroke-opacity="0.045"
        stroke-width="1"
      />
    </pattern>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#outside)" />

  <circle cx="170" cy="90" r="240" fill="#8de9ff" opacity="0.12" />
  <circle cx="1050" cy="60" r="220" fill="#f8d77d" opacity="0.12" />

  <rect
    x="52"
    y="52"
    width="1096"
    height="696"
    rx="44"
    fill="url(#paper)"
    stroke="#ffe3a0"
    stroke-width="4"
    filter="url(#shadow)"
  />

  <rect
    x="52"
    y="52"
    width="1096"
    height="696"
    rx="44"
    fill="url(#paperGrid)"
  />

  <line
    x1="832"
    y1="52"
    x2="832"
    y2="748"
    stroke="#5b351a"
    stroke-opacity="0.18"
    stroke-width="2"
  />

  <text
    x="104"
    y="118"
    fill="#7b3f23"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22"
    font-weight="900"
    letter-spacing="4"
  >TOBYWORLD POND PASSPORT</text>

  <text
    x="104"
    y="190"
    fill="#2f1f15"
    font-family="Georgia, Times New Roman, serif"
    font-size="${nameFontSize(safeName)}"
    font-weight="700"
  >${escapeXml(safeName)}</text>

  <text
    x="104"
    y="230"
    fill="#7b3f23"
    font-family="Arial, Helvetica, sans-serif"
    font-size="23"
    font-weight="800"
  >${escapeXml(safeHandle)}</text>

  <text
    x="104"
    y="290"
    fill="#7b3f23"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="900"
    letter-spacing="3"
  >POND TITLE</text>

  ${titleText}
  ${characteristicText}

  <g transform="translate(104 614)">
    <rect width="154" height="84" rx="17" fill="url(#stat)" stroke="#5b351a" stroke-opacity="0.22" />
    <text x="16" y="39" fill="#2f1f15" font-family="Arial" font-size="29" font-weight="900">${escapeXml(payload.streak)}</text>
    <text x="16" y="65" fill="#7b3f23" font-family="Arial" font-size="13" font-weight="900" letter-spacing="1.4">STREAK</text>
  </g>

  <g transform="translate(270 614)">
    <rect width="154" height="84" rx="17" fill="url(#stat)" stroke="#5b351a" stroke-opacity="0.22" />
    <text x="16" y="39" fill="#2f1f15" font-family="Arial" font-size="29" font-weight="900">${escapeXml(payload.rites)}</text>
    <text x="16" y="65" fill="#7b3f23" font-family="Arial" font-size="13" font-weight="900" letter-spacing="1.4">RITES</text>
  </g>

  <g transform="translate(436 614)">
    <rect width="154" height="84" rx="17" fill="url(#stat)" stroke="#5b351a" stroke-opacity="0.22" />
    <text x="16" y="39" fill="#2f1f15" font-family="Arial" font-size="29" font-weight="900">${escapeXml(payload.power)}</text>
    <text x="16" y="65" fill="#7b3f23" font-family="Arial" font-size="13" font-weight="900" letter-spacing="1.4">POWER</text>
  </g>

  <g transform="translate(602 614)">
    <rect width="154" height="84" rx="17" fill="url(#stat)" stroke="#5b351a" stroke-opacity="0.22" />
    <text x="16" y="39" fill="#2f1f15" font-family="Arial" font-size="29" font-weight="900">${escapeXml(payload.assets)}</text>
    <text x="16" y="65" fill="#7b3f23" font-family="Arial" font-size="13" font-weight="900" letter-spacing="1.4">ASSETS</text>
  </g>

  <rect
    x="884"
    y="100"
    width="188"
    height="188"
    rx="40"
    fill="#fff8e6"
    fill-opacity="0.55"
    stroke="#5b351a"
    stroke-opacity="0.34"
    stroke-width="4"
  />

  ${photoMarkup}

  <rect
    x="866"
    y="330"
    width="224"
    height="112"
    rx="56"
    fill="#fff8e6"
    fill-opacity="0.43"
    stroke="#7b3f23"
    stroke-opacity="0.54"
    stroke-width="4"
  />

  <text
    x="978"
    y="374"
    text-anchor="middle"
    fill="#2f1f15"
    font-family="Arial, Helvetica, sans-serif"
    font-size="21"
    font-weight="900"
  >POND STAMP</text>

  <text
    x="978"
    y="408"
    text-anchor="middle"
    fill="#7b3f23"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="900"
    letter-spacing="2"
  >${escapeXml(safeMode)}</text>

  <text
    x="872"
    y="502"
    fill="#7b3f23"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    font-weight="900"
    letter-spacing="2"
  >MARK</text>

  <text
    x="872"
    y="544"
    fill="#2f1f15"
    font-family="Georgia, Times New Roman, serif"
    font-size="${safeMark.length > 24 ? 24 : 29}"
    font-weight="700"
  >${escapeXml(safeMark)}</text>

  <text
    x="978"
    y="660"
    text-anchor="middle"
    fill="#7b3f23"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="900"
  >We move not by leaps.</text>

  <text
    x="978"
    y="690"
    text-anchor="middle"
    fill="#7b3f23"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="900"
  >We move by stillness.</text>
</svg>
`;
}

function errorResponse(
  error: unknown,
  shareId: string,
) {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown passport image failure.';

  console.error('Passport PNG route failed:', {
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
  _request: Request,
  context: {
    params: Promise<{
      shareId: string;
    }>;
  },
) {
  const { shareId: rawShareId } = await context.params;
  const shareId = cleanId(rawShareId);

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

    const photoDataUri = await getPhotoDataUri(payload.photo);

    const svg = createPassportSvg({
      payload,
      photoDataUri,
    });

    const png = await sharp(Buffer.from(svg))
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.byteLength),
        'Content-Disposition': `inline; filename="tobyworld-passport-${shareId}.png"`,
        'Cache-Control':
          'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return errorResponse(error, shareId);
  }
}
