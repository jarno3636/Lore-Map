import { TobyworldAtlas } from '@/components/TobyworldAtlas';
import { DailyPondRite } from '@/components/tobyworld/DailyPondRite';
import { TobyworldSignalProfile } from '@/components/tobyworld/TobyworldSignalProfile';
import { TobyworldSwapGateway } from '@/components/tobyworld/TobyworldSwapGateway';

const featureCards = [
  {
    eyebrow: 'THE POND',
    title: 'Toby waits',
    copy: 'The still center.',
    icon: '🐸',
  },
  {
    eyebrow: 'RED GRAIN',
    title: 'Patience falls',
    copy: 'The first ripple.',
    icon: '△',
  },
  {
    eyebrow: 'LEAF GARDEN',
    title: 'Taboshi grows',
    copy: 'The quiet bloom.',
    icon: '🍃',
  },
  {
    eyebrow: 'BLUE CURRENT',
    title: 'Sato returns',
    copy: 'The moving water.',
    icon: '🌀',
  },
  {
    eyebrow: 'GOLDEN GATE',
    title: 'Be still',
    copy: 'Not all paths yet open.',
    icon: '✦',
  },
];

const quickPaths = [
  {
    eyebrow: 'STEP ONE',
    title: 'Choose a token',
    copy: 'Open the Swap Gate for Toby, Taboshi, or Patience on Base.',
    href: '#swap-gateway',
    icon: '⇄',
  },
  {
    eyebrow: 'STEP TWO',
    title: 'Return daily',
    copy: 'Complete the Daily Rite. Streaks build echo power for relic milestones.',
    href: '#daily-rite',
    icon: '△',
  },
  {
    eyebrow: 'STEP THREE',
    title: 'Unlock relics',
    copy: 'Community echoes open milestone NFT relics over time.',
    href: '/milestones',
    icon: '🏺',
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
            Open the Swap Gate, complete the Daily Rite, and help the pond unlock
            milestone relics.
          </p>

          <div className="home-hero-actions">
            <a href="#swap-gateway" className="home-primary-link">
              Open Swap Gate
            </a>
            <a href="#daily-rite" className="home-secondary-link">
              Daily Rite
            </a>
            <a href="/milestones" className="home-secondary-link">
              Relics
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
              <small>Swap Gate · Daily Rite · Echo Power · Relics</small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-feature-grid" aria-label="Tobyworld regions">
        {featureCards.map((feature) => (
          <article className="home-feature-card" key={feature.title}>
            <span className="home-feature-icon">{feature.icon}</span>
            <p>{feature.eyebrow}</p>
            <h2>{feature.title}</h2>
            <span>{feature.copy}</span>
          </article>
        ))}
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
            Open a Base swap for Toby, Taboshi, or Patience. The app sends you to
            the swap gate; your wallet handles the trade.
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
            Reveal the role your path carries, then cast your generated
            Tobyworld quote.
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
