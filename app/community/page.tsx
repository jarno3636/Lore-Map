import { CommunityShrine } from '@/components/tobyworld/CommunityShrine';

export default function CommunityPage() {
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
        <p className="home-kicker">COMMUNITY SHRINE</p>

        <h1>
          The pond is
          <br />
          not empty.
        </h1>

        <p>
          Every echo here comes from a saved Farcaster FID. Complete the Daily Rite,
          build your streak, and leave your mark in the pond.
        </p>

        <div className="home-ritual-line" aria-label="Tobyworld community path">
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
          <a href="/#atlas">Open Atlas</a>
        </div>
      </section>

      <section className="home-section">
        <CommunityShrine />
      </section>

      <section className="home-lore-strip">
        <p>“Every still pond becomes louder when frogs return.”</p>

        <div>
          <a href="/" rel="noreferrer">
            Home ↗
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
