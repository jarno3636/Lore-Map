import { TobyworldAtlas } from '@/components/TobyworldAtlas';
import { TobyworldSignalProfile } from '@/components/tobyworld/TobyworldSignalProfile';

const featureCards = [
  {
    eyebrow: 'LIVING ATLAS',
    title: 'Follow the flywheel',
    copy: 'Move through the pond, the red grain, the green leaf, the blue current, Loreland, and the locked golden gate.',
    icon: '☷',
  },
  {
    eyebrow: 'STILL WATER',
    title: 'Plant patience',
    copy: 'The map is not meant to be rushed. Hold still, wake the ripple, and let the pond remember your path.',
    icon: '△',
  },
  {
    eyebrow: 'LORE IDENTITY',
    title: 'Share your role',
    copy: 'Create a Tobyworld identity shaped by your path through the Atlas, then cast it without exposing token amounts.',
    icon: '✦',
  },
];

const loreSteps = [
  {
    title: 'Toby holds the center',
    copy: 'The frog does not chase the loop. The world moves around the pond.',
    icon: '🐸',
  },
  {
    title: 'Patience begins the ritual',
    copy: 'A single red grain lands. The ripple expands, then sleeps.',
    icon: '△',
  },
  {
    title: 'Taboshi tends the garden',
    copy: 'The leaf gives the still water something to grow.',
    icon: '🍃',
  },
  {
    title: 'Sato returns the current',
    copy: 'The blue swirl carries motion back toward the pond.',
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
          <p className="home-kicker">TOBYWORLD · THE LIVING FLYWHEEL</p>

          <h1>
            Enter the pond.
            <br />
            Let the map remember.
          </h1>

          <p>
            A mobile-first lore Atlas for Tobyworld. Plant patience, tend the
            garden, follow the returning current, and discover the role the pond
            gives you.
          </p>

          <div className="home-hero-actions">
            <a href="#atlas" className="home-primary-link">
              Open Atlas
            </a>
            <a href="#pond-role" className="home-secondary-link">
              Find Your Pond Role
            </a>
          </div>

          <div className="home-ritual-line" aria-label="Tobyworld ritual path">
            <span>△ Patience</span>
            <i />
            <span>🐸 Toby</span>
            <i />
            <span>🍃 Taboshi</span>
            <i />
            <span>🌀 Sato</span>
          </div>
        </div>

        <div className="home-hero-card" aria-label="Tobyworld app preview">
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
                alt="Toby frog over a glowing fantasy map"
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
              <small>Plant stillness · Tend the world · Follow the runes</small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-feature-grid" aria-label="Tobyworld features">
        {featureCards.map((feature) => (
          <article className="home-feature-card" key={feature.title}>
            <span className="home-feature-icon">{feature.icon}</span>
            <p>{feature.eyebrow}</p>
            <h2>{feature.title}</h2>
            <span>{feature.copy}</span>
          </article>
        ))}
      </section>

      <section className="home-lore-path" aria-label="Tobyworld lore path">
        <div className="home-section-heading">
          <p className="home-kicker">THE RITUAL PATH</p>
          <h2>Stillness first. Motion after.</h2>
          <p>
            Tobyworld works best when the flywheel feels like a mythic place,
            not a dashboard. Each symbol should feel like a region of the pond.
          </p>
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
          <h2>The flywheel should feel alive.</h2>
          <p>
            Toby stays fixed at the center while the world moves around him.
            Touch the nodes, open lore panels, and move through the ritual path.
          </p>
        </div>

        <TobyworldAtlas />
      </section>

      <section id="pond-role" className="home-section home-signal-section">
        <div className="home-section-heading">
          <p className="home-kicker">POND ROLE</p>
          <h2>Your Tobyworld role, shaped by still water.</h2>
          <p>
            Connect your wallet privately, let the Atlas check which Tobyworld
            symbols are present, and create a cast-ready lore identity without
            posting token amounts.
          </p>
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
            Signal on X ↗
          </a>
        </div>
      </section>
    </main>
  );
}
