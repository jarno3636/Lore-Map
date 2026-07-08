import { TobyworldAtlas } from '@/components/TobyworldAtlas';
import { TobyworldSignalProfile } from '@/components/tobyworld/TobyworldSignalProfile';

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
    title: 'The lock hums',
    copy: 'Not all paths open.',
    icon: '✦',
  },
];

const loreSteps = [
  {
    title: 'Still water',
    copy: 'Begin at the pond.',
    icon: '🐸',
  },
  {
    title: 'Red ripple',
    copy: 'Patience enters.',
    icon: '△',
  },
  {
    title: 'Green bloom',
    copy: 'The leaf awakens.',
    icon: '🍃',
  },
  {
    title: 'Blue return',
    copy: 'The current bends back.',
    icon: '🌀',
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
            Toby waits at the center. Patience falls. The leaf grows. The blue
            current returns.
          </p>

          <div className="home-hero-actions">
            <a href="#atlas" className="home-primary-link">
              Open Atlas
            </a>
            <a href="#pond-role" className="home-secondary-link">
              Reveal Role
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
              <small>Stillness · Bloom · Return</small>
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

      <section className="home-lore-path" aria-label="Tobyworld ritual path">
        <div className="home-section-heading">
          <p className="home-kicker">THE RITUAL</p>
          <h2>Stillness first.</h2>
          <p>Each symbol is a place. Each place remembers.</p>
        </div>

        <div className="home-lore-steps">
          {loreSteps.map((step) => (
            <article className="home-lore-step" key={step.title}>
              <span>{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="atlas" className="home-section">
        <div className="home-section-heading">
          <p className="home-kicker">ATLAS</p>
          <h2>The living flywheel.</h2>
          <p>Touch the runes. Wake the pond.</p>
        </div>

        <TobyworldAtlas />
      </section>

      <section id="pond-role" className="home-section home-signal-section">
        <div className="home-section-heading">
          <p className="home-kicker">SHRINE</p>
          <h2>Ask the pond.</h2>
          <p>Reveal the role your path carries.</p>
        </div>

        <TobyworldSignalProfile />
      </section>

      <section className="home-lore-strip">
        <p>“We move not by leaps. We move by stillness.”</p>

        <div>
          <a href="https://toadgod.xyz" target="_blank" rel="noreferrer">
            Toadgod ↗
          </a>
          <a href="https://toadgod.xyz/rune3" target="_blank" rel="noreferrer">
            Rune III ↗
          </a>
          <a href="https://x.com/toadgod1017" target="_blank" rel="noreferrer">
            Signal ↗
          </a>
        </div>
      </section>
    </main>
  );
}
