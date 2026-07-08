import { MilestoneBadges } from '@/components/tobyworld/MilestoneBadges';

export default function MilestonesPage() {
  return (
    <main className="home-shell community-page-shell">
      <div className="home-background" aria-hidden="true">
        <div className="home-orb home-orb-one" />
        <div className="home-orb home-orb-two" />
        <div className="home-orb home-orb-three" />
        <div className="home-grid" />
        <div className="home-stars" />
      </div>

      <section className="community-page-hero">
        <p className="home-kicker">MILESTONE RELICS</p>

        <h1>
          Echoes become
          <br />
          relics.
        </h1>

        <p>
          Every completed Daily Rite moves the whole pond closer to a claimable
          Tobyworld milestone NFT. First the community unlocks the relic. Then
          the claim gate opens.
        </p>

        <div className="home-ritual-line" aria-label="Tobyworld milestone path">
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

        <div className="community-page-actions">
          <a href="/#daily-rite">Complete Daily Rite</a>
          <a href="/community">Community Shrine</a>
        </div>
      </section>

      <section className="home-section">
        <MilestoneBadges />
      </section>

      <section className="home-lore-strip">
        <p>“The pond remembers together.”</p>

        <div>
          <a href="/" rel="noreferrer">
            Home ↗
          </a>
          <a href="/community" rel="noreferrer">
            Shrine ↗
          </a>
          <a href="https://x.com/toadgod1017" target="_blank" rel="noreferrer">
            Toadgod X ↗
          </a>
        </div>
      </section>
    </main>
  );
}
