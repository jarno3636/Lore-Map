import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '800px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 50% 18%, rgba(100, 214, 255, 0.28), transparent 34%), radial-gradient(circle at 82% 28%, rgba(249, 201, 104, 0.18), transparent 28%), linear-gradient(180deg, #07151d 0%, #08242d 54%, #040c10 100%)',
          color: '#f5f0df',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
            backgroundImage:
              'radial-gradient(circle, rgba(237,255,255,.8) 0 2px, transparent 2.8px)',
            backgroundSize: '88px 104px',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '70px',
            right: '70px',
            top: '70px',
            bottom: '70px',
            display: 'flex',
            border: '2px solid rgba(151,232,248,.32)',
            borderRadius: '56px',
            padding: '64px',
            background:
              'radial-gradient(circle at 78% 12%, rgba(249,201,104,.14), transparent 30%), rgba(5, 26, 34, .72)',
            boxShadow: '0 28px 90px rgba(0,0,0,.35)',
          }}
        >
          <div
            style={{
              width: '250px',
              height: '250px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '62px',
              border: '2px solid rgba(220,250,255,.42)',
              background:
                'radial-gradient(circle at 50% 38%, rgba(118,224,255,.45), rgba(7,31,40,.92))',
              fontSize: '118px',
              boxShadow: '0 0 70px rgba(86,205,247,.32)',
            }}
          >
            🐸
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginLeft: '54px',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#9bdded',
                fontSize: '28px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 900,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Tobyworld Atlas
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: '24px',
                fontSize: '82px',
                lineHeight: 0.92,
                letterSpacing: '-0.06em',
                color: '#fff8e6',
              }}
            >
              The pond remembers.
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: '26px',
                color: '#c4dde2',
                fontSize: '36px',
                lineHeight: 1.25,
              }}
            >
              $Patience &lt;&gt; $toby &lt;&gt; $Taboshi
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: '42px',
                gap: '18px',
                color: '#f5f0df',
                fontSize: '34px',
              }}
            >
              <span>△</span>
              <span>🐸</span>
              <span>🍃</span>
              <span>🌀</span>
              <span>✦</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    },
  );
}
