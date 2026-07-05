import { ImageResponse } from 'next/og';
import { getLoreFragment } from '@/lib/lore';

export const alt = 'Tobyworld lore fragment';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type ImageProps = { params: Promise<{ slug: string }> };

const accentMap = {
  blue: ['#68c5ff', '#244eaa'],
  red: ['#ff5b45', '#9e2f22'],
  green: ['#b4e679', '#417f4a'],
  gold: ['#ffd37a', '#a86e23'],
};

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const fragment = getLoreFragment(slug) ?? getLoreFragment('stillness-is-motion')!;
  const [light, deep] = accentMap[fragment.accent];

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #061016 0%, #10202d 55%, #061016 100%)',
          color: '#eff7fa',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 840,
            height: 840,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${light}40 0%, ${deep}28 35%, transparent 70%)`,
            right: -250,
            top: -350,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '72px 80px',
            width: '100%',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 25, letterSpacing: 7, color: '#dceef4' }}>TOBYWORLD</div>
            <div style={{ fontSize: 18, letterSpacing: 3, color: light }}>{fragment.rune}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 890 }}>
            <div style={{ fontSize: 28, letterSpacing: 3, color: light, marginBottom: 16 }}>{fragment.title.toUpperCase()}</div>
            <div style={{ fontSize: 64, lineHeight: 1.08, fontWeight: 700 }}>{fragment.quote}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 23, color: '#c6d8de' }}>
            <div style={{ width: 58, height: 58, borderRadius: 9999, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#061016', fontFamily: 'sans-serif', fontWeight: 900 }}>T</div>
            <div>Plant stillness. Tend the world. Follow the runes.</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
