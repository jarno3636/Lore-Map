import { TobyworldAtlas } from '@/components/TobyworldAtlas';
import { BackToTopButton } from '@/components/tobyworld/BackToTopButton';
import { DailyPondRite } from '@/components/tobyworld/DailyPondRite';
import { TobyworldPondPassport } from '@/components/tobyworld/TobyworldPondPassport';
import { TobyworldSignalProfile } from '@/components/tobyworld/TobyworldSignalProfile';
import { TobyworldSwapGateway } from '@/components/tobyworld/TobyworldSwapGateway';

const quickPaths = [
  {
    eyebrow: 'SWAP GATE',
    title: 'Choose your token',
    copy: 'Open Toby, Taboshi, or Patience through native Farcaster swap or Sushi on web.',
    href: '#swap-gateway',
    icon: '⇄',
  },
  {
    eyebrow: 'DAILY RITE',
    title: 'Build echo power',
    copy: 'Return daily. Streaks increase the weight your rite adds toward relic milestones.',
    href: '#daily-rite',
    icon: '△',
  },
  {
    eyebrow: 'PASSPORT',
    title: 'Get your stamp',
    copy: 'Generate a funny Tobyworld title, trait, warning, and share quote from your activity.',
    href: '#pond-passport',
    icon: '🪪',
  },
  {
    eyebrow: 'RELICS',
    title: 'Unlock milestones',
    copy: 'Weighted echoes open Tobyworld relics that eligible frogs can claim onchain.',
    href: '/milestones',
    icon: '🏺',
  },
  {
    eyebrow: 'ATLAS',
    title: 'Explore the pond',
    copy: 'Touch the runes, follow the lore, and move through the living Tobyworld flywheel.',
    href: '#atlas',
    icon: '☷',
  },
];

function TravelerPackIcon() {
  return (
    <svg
      className="traveler-pack-icon"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Explorer backpack"
    >
      <defs>
        <linearGradient
          id="traveler-pack-canvas"
          x1="10"
          y1="8"
          x2="52"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#b88550" />
          <stop offset="0.55" stopColor="#8a5f38" />
          <stop offset="1" stopColor="#5d3c26" />
        </linearGradient>

        <linearGradient
          id="traveler-pack-leather"
          x1="18"
          y1="16"
          x2="47"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7b5132" />
          <stop offset="1" stopColor="#3e281d" />
        </linearGradient>

        <radialGradient
          id="traveler-pack-glow"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#d8a84e" stopOpacity="0" />
        </radialGradient>

        <filter
          id="traveler-pack-shadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.5"
            floodColor="#000000"
            floodOpacity="0.35"
          />
        </filter>
      </defs>

      <g filter="url(#traveler-pack-shadow)">
        <path
          d="M21 16.5C21 10.7 25.6 6 31.5 6S42 10.7 42 16.5"
          fill="none"
          stroke="#4b3020"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <path
          d="M17 18.5C13.7 22.7 12 28 12 34v15.5c0 4.7 3.8 8.5 8.5 8.5h23c4.7 0 8.5-3.8 8.5-8.5V34c0-6-1.7-11.3-5-15.5H17Z"
          fill="url(#traveler-pack-canvas)"
          stroke="#3f291d"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        <path
          d="M16.5 20.5C21.7 16.8 26.8 15 32 15s10.3 1.8 15.5 5.5v9.2c-4.8 2.8-10 4.3-15.5 4.3s-10.7-1.5-15.5-4.3v-9.2Z"
          fill="#9a6a40"
          stroke="#4a3020"
          strokeWidth="2.4"
        />

        <path
          d="M20 35.5h24v16.2c0 2.3-1.8 4.1-4.1 4.1H24.1c-2.3 0-4.1-1.8-4.1-4.1V35.5Z"
          fill="#6f492f"
          stroke="#3e281c"
          strokeWidth="2.3"
        />

        <path
          d="M24 35.5v-4.3c0-1.8 1.5-3.2 3.2-3.2h9.6c1.8 0 3.2 1.5 3.2 3.2v4.3"
          fill="none"
          stroke="#3e281c"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        <path
          d="M23.5 19.7v11.8M40.5 19.7v11.8"
          stroke="url(#traveler-pack-leather)"
          strokeWidth="4.6"
          strokeLinecap="round"
        />

        <rect
          x="20.8"
          y="26"
          width="5.4"
          height="5.8"
          rx="1.2"
          fill="#d7aa55"
          stroke="#5e3b21"
          strokeWidth="1.3"
        />

        <rect
          x="37.8"
          y="26"
          width="5.4"
          height="5.8"
          rx="1.2"
          fill="#d7aa55"
          stroke="#5e3b21"
          strokeWidth="1.3"
        />

        <path
          d="M17.7 43.5h-4.3c-2 0-3.6 1.6-3.6 3.6v4.2c0 2 1.6 3.6 3.6 3.6h5.2"
          fill="#7e5635"
          stroke="#3e281c"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <path
          d="M46.3 43.5h4.3c2 0 3.6 1.6 3.6 3.6v4.2c0 2-1.6 3.6-3.6 3.6h-5.2"
          fill="#7e5635"
          stroke="#3e281c"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <circle
          cx="32"
          cy="44"
          r="6.2"
          fill="#47624d"
          stroke="#d8b863"
          strokeWidth="2"
        />

        <path
          d="M28.5 44.5c1.1-2 2.3-3 3.5-3s2.4 1 3.5 3c-1.2 1.8-2.3 2.7-3.5 2.7s-2.3-.9-3.5-2.7Z"
          fill="#83a867"
        />

        <circle cx="30.4" cy="42.8" r="0.9" fill="#1e2d20" />
        <circle cx="33.6" cy="42.8" r="0.9" fill="#1e2d20" />

        <circle
          cx="48"
          cy="20"
          r="8"
          fill="url(#traveler-pack-glow)"
          opacity="0.45"
        />

        <path
          d="m48 15.5 1.2 3.2 3.3 1.2-3.3 1.2-1.2 3.2-1.2-3.2-3.3-1.2 3.3-1.2L48 15.5Z"
          fill="#f4d77e"
        />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <main id="page-top" className="home-shell">
      <div className="home-background" aria-hidden="true">
        <div className="home-orb home-orb-one" />
        <div className="home-orb home-orb-two" />
        <div className="home-orb home-orb-three" />
        <div className="home-grid" />
        <div className="home-stars" />
      </div>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker">TOBYWORLD · LIVING POND</p>

          <h1>
            Enter the pond.
            <br />
            Follow the wheel.
          </h1>

          <p>
            Toby waits at the center. Patience falls. Taboshi grows. Sato returns.
            Open the Swap Gate, complete the Daily Rite, build echo power, stamp
            your Pond Passport, and help unlock milestone relics.
          </p>

          <div className="home-hero-actions">
            <a href="#swap-gateway" className="home-primary-link">
              Open Swap Gate
            </a>

            <a href="#daily-rite" className="home-secondary-link">
              Daily Rite
            </a>

            <a href="#pond-passport" className="home-secondary-link">
              Pond Passport
            </a>
          </div>

          <div className="home-ritual-line" aria-label="Tobyworld path">
            <span>△</span>
            <i />
            <span>🐸</span>
            <i />
            <span>🍃</span>
            <i />
            <span>🌀</span>
            <i />
            <span>✦</span>
          </div>
        </div>

        <div className="home-hero-card" aria-label="Tobyworld pond preview">
          <div className="home-phone-frame">
            <div className="home-phone-top">
              <span />
              <span />
            </div>

            <div className="home-map-preview">
              <div className="home-map-glow" aria-hidden="true" />

              <img
                className="home-preview-image"
                src="/images/atlas/toby-pond-guardian.png"
                alt="Toby guarding a glowing mythic pond"
              />

              <div className="home-map-rings" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              <div className="home-floating-runes" aria-hidden="true">
                <b className="rune-red">△</b>
                <b className="rune-green">🍃</b>
                <b className="rune-blue">🌀</b>
                <b className="rune-gold">✦</b>
              </div>
            </div>

            <div className="home-preview-copy">
              <strong>The pond remembers.</strong>
              <small>
                Swap Gate · Daily Rite · Passport · Traveler&apos;s Pack · Relics
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-quick-paths" aria-label="Tobyworld path">
        {quickPaths.map((path) => (
          <a
            href={path.href}
            className="home-quick-path-card"
            key={path.title}
          >
            <span>{path.icon}</span>

            <div>
              <p>{path.eyebrow}</p>
              <h2>{path.title}</h2>
              <small>{path.copy}</small>
            </div>
          </a>
        ))}
      </section>

      <section id="swap-gateway" className="home-section">
        <div className="home-section-heading">
          <p className="home-kicker">SWAP GATE</p>
          <h2>Choose your path.</h2>

          <p>
            Open a Base swap for Toby, Taboshi, or Patience. In Farcaster, the app
            uses the native swap flow when available. On web, it falls back to Sushi.
          </p>
        </div>

        <TobyworldSwapGateway />
      </section>

      <section id="daily-rite" className="home-section">
        <div className="home-section-heading">
          <p className="home-kicker">DAILY RITE</p>
          <h2>Return once a day.</h2>

          <p>
            Complete one small pond ritual, build your streak, earn your mark,
            and add weighted echo power toward community relic milestones.
          </p>
        </div>

        <DailyPondRite />
      </section>

      <section id="pond-passport" className="home-section">
        <div className="home-section-heading">
          <p className="home-kicker">POND PASSPORT</p>
          <h2>Get your stamp.</h2>

          <p>
            Generate a funny Tobyworld title, trait, strange habit, pond warning,
            and share quote based on your Daily Rite activity.
          </p>
        </div>

        <TobyworldPondPassport />

        <div className="traveler-pack-link">
          <a href="/pack" className="traveler-pack-button">
            <span className="traveler-pack-icon-wrap" aria-hidden="true">
              <TravelerPackIcon />
            </span>

            <span className="traveler-pack-copy">
              <small>Explorer&apos;s gear</small>
              <strong>Traveler&apos;s Pack</strong>
              <em>View your stitched patch collection</em>
            </span>

            <span className="traveler-pack-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </section>

      <section id="atlas" className="home-section">
        <div className="home-section-heading">
          <p className="home-kicker">ATLAS</p>
          <h2>The living flywheel.</h2>
          <p>Touch the runes. Wake the pond. Open the paths in order.</p>
        </div>

        <TobyworldAtlas />
      </section>

      <section id="pond-role" className="home-section home-signal-section">
        <div className="home-section-heading">
          <p className="home-kicker">SHRINE</p>
          <h2>Ask the pond.</h2>

          <p>
            Reveal the role your path carries, then cast your generated Tobyworld
            quote.
          </p>
        </div>

        <TobyworldSignalProfile />
      </section>

      <section className="home-lore-strip">
        <p>“We move not by leaps. We move by stillness.”</p>

        <div>
          <a href="/community" rel="noreferrer">
            Shrine ↗
          </a>

          <a href="/milestones" rel="noreferrer">
            Relics ↗
          </a>

          <a href="/pack">
            Pack ↗
          </a>

          <a href="#pond-passport">
            Passport ↗
          </a>

          <a href="https://toadgod.xyz" target="_blank" rel="noreferrer">
            Toadgod ↗
          </a>

          <a
            href="https://toadgod.xyz/rune3"
            target="_blank"
            rel="noreferrer"
          >
            Rune III ↗
          </a>

          <a
            href="https://x.com/toadgod1017"
            target="_blank"
            rel="noreferrer"
          >
            Toadgod X ↗
          </a>
        </div>
      </section>

      <BackToTopButton />
    </main>
  );
}
