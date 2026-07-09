import { TobyworldAtlas } from '@/components/TobyworldAtlas';
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

export default function Home() {
  return (
    <main className="home-shell">
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
              <small>Swap Gate · Daily Rite · Passport · Relics</small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-quick-paths" aria-label="Tobyworld path">
        {quickPaths.map((path) => (
          <a href={path.href} className="home-quick-path-card" key={path.title}>
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
          <a href="#pond-passport" rel="noreferrer">
            Passport ↗
          </a>
          <a href="https://toadgod.xyz" target="_blank" rel="noreferrer">
            Toadgod ↗
          </a>
          <a href="https://toadgod.xyz/rune3" target="_blank" rel="noreferrer">
            Rune III ↗
          </a>
          <a href="https://x.com/toadgod1017" target="_blank" rel="noreferrer">
            Toadgod X ↗
          </a>
        </div>
      </section>
    </main>
  );
}
