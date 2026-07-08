import { TobyworldAtlas } from '@/components/TobyworldAtlas';
import { TobyworldSignalProfile } from '@/components/tobyworld/TobyworldSignalProfile';

const featureCards = [
  {
    eyebrow: 'LIVING MAP',
    title: 'Explore the flywheel',
    copy: 'Move through Toby, Patience, Taboshi, Sato, Loreland, and the locked scarce asset gate.',
    icon: '☷',
  },
  {
    eyebrow: 'PRIVATE SIGNAL',
    title: 'Read asset presence',
    copy: 'Connect a wallet to detect Tobyworld signals without exposing token amounts in generated messages.',
    icon: '◉',
  },
  {
    eyebrow: 'SHAREABLE LORE',
    title: 'Cast your identity',
    copy: 'Generate a mythic Tobyworld profile from your holdings presence and Atlas activity.',
    icon: '↗',
  },
];

export default function Home() {
  return (
    <main className="home-shell">
      <div className="home-background" aria-hidden="true">
        <div className="home-orb home-orb-one" />
        <div className="home-orb home-orb-two" />
        <div className="home-grid" />
      </div>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker">TOBYWORLD · THE LIVING FLYWHEEL</p>

          <h1>
            Enter the map.
            <br />
            Wake the lore.
          </h1>

          <p>
            A mobile-first Atlas for the Tobyworld ecosystem. Explore the runes,
            discover your private asset signal, and share a lore identity without
            posting token amounts.
          </p>

          <div className="home-hero-actions">
            <a href="#atlas" className="home-primary-link">
              Open Atlas
            </a>
            <a href="#signal" className="home-secondary-link">
              Generate Signal
            </a>
          </div>
        </div>

        <div className="home-hero-card" aria-label="Tobyworld app preview">
          <div className="home-phone-frame">
            <div className="home-phone-top">
              <span />
              <span />
            </div>

            <div className="home-map-preview">
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

      <section id="atlas" className="home-section">
        <div className="home-section-heading">
          <p className="home-kicker">ATLAS</p>
          <h2>The flywheel should feel alive.</h2>
          <p>
            Toby stays fixed at the center while the energy moves around it.
            Touch the nodes, open lore panels, and move through the ritual path.
          </p>
        </div>

        <TobyworldAtlas />
      </section>

      <section id="signal" className="home-section home-signal-section">
        <div className="home-section-heading">
          <p className="home-kicker">SIGNAL PROFILE</p>
          <h2>Your Tobyworld identity, without exposing amounts.</h2>
          <p>
            Connect a wallet, detect whether Toby, Patience, and Taboshi signals
            are present, then generate a cast-ready identity using private,
            amount-free inputs.
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
