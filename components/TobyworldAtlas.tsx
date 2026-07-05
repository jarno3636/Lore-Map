'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { loreFragments, type LoreFragment } from '@/lib/lore';

type NodeId = 'toby' | 'patience' | 'taboshi' | 'sato' | 'loreland' | 'gate' | 'share';
type RitualState = 'dormant' | 'holding' | 'awakened';

const HOLD_DURATION = 1700;

const nodeDetails: Record<Exclude<NodeId, 'share'>, { title: string; eyebrow: string; description: string; action: string }> = {
  toby: {
    title: '$TOBY · The Pond',
    eyebrow: 'FOUNDATION · GATHER',
    description: 'The blue frog holds the center. Select its lights to discover the threads that keep the world connected.',
    action: 'Reveal pond lore',
  },
  patience: {
    title: '$PATIENCE · Still Water',
    eyebrow: 'RUNE III · PLANT',
    description: 'Press and hold the red grain until the water settles. Do not rush the pond.',
    action: 'Hold to plant a grain',
  },
  taboshi: {
    title: 'TABOSHI · Tend Plot',
    eyebrow: 'LEAF · GROWTH',
    description: 'Bind a leaf to the garden and let the world remember what you tended.',
    action: 'Tend the garden',
  },
  sato: {
    title: 'SATO · Koi Flow',
    eyebrow: 'SWIRL · RETURN',
    description: 'Wake the blue canal. Watch the current trace its way back to the pond.',
    action: 'Release the river',
  },
  loreland: {
    title: 'LORELAND · Bedrock',
    eyebrow: 'ROOTS · HORIZON',
    description: 'Below the waterline, roots search for basalt. This is a future-facing lore chamber—not an eligibility or reward screen.',
    action: 'Study the roots',
  },
  gate: {
    title: 'THE GOLD GATE',
    eyebrow: 'RUNE IV · AWAITING',
    description: 'A silent gate above the archipelago. It stays locked on purpose: a piece of the story not yet written in the app.',
    action: 'Read the omen',
  },
};

const stars = Array.from({ length: 48 }, (_, index) => ({
  left: `${(index * 41 + 9) % 100}%`,
  top: `${(index * 23 + 7) % 82}%`,
  delay: `${(index % 9) * 0.35}s`,
  size: `${index % 5 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px`,
}));

export function TobyworldAtlas() {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>('toby');
  const [ritual, setRitual] = useState<RitualState>('dormant');
  const [holdProgress, setHoldProgress] = useState(0);
  const [gardenLevel, setGardenLevel] = useState(0);
  const [riverAwake, setRiverAwake] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [toast, setToast] = useState('Tap a rune to enter the map.');
  const [selectedFragment, setSelectedFragment] = useState<LoreFragment>(loreFragments[0]);
  const frameRef = useRef<number | null>(null);
  const holdStartedAt = useRef<number | null>(null);

  const discoveries = useMemo(() => {
    let total = 1;
    if (ritual === 'awakened') total += 1;
    if (gardenLevel > 0) total += 1;
    if (riverAwake) total += 1;
    return total;
  }, [gardenLevel, ritual, riverAwake]);

  useEffect(() => {
    const saved = window.localStorage.getItem('tobyworld-atlas-state');
    if (!saved) return;

    try {
      const state = JSON.parse(saved) as { ritual?: RitualState; gardenLevel?: number; riverAwake?: boolean };
      if (state.ritual) setRitual(state.ritual);
      if (typeof state.gardenLevel === 'number') setGardenLevel(Math.min(3, Math.max(0, state.gardenLevel)));
      if (typeof state.riverAwake === 'boolean') setRiverAwake(state.riverAwake);
    } catch {
      window.localStorage.removeItem('tobyworld-atlas-state');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      'tobyworld-atlas-state',
      JSON.stringify({ ritual, gardenLevel, riverAwake }),
    );
  }, [gardenLevel, ritual, riverAwake]);

  useEffect(() => {
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function chooseNode(node: NodeId) {
    setSelectedNode(node);
    const loreByNode: Partial<Record<NodeId, LoreFragment>> = {
      toby: loreFragments[1],
      patience: loreFragments[2],
      taboshi: loreFragments[3],
      sato: loreFragments[3],
      loreland: loreFragments[4],
      gate: loreFragments[4],
    };
    if (loreByNode[node]) setSelectedFragment(loreByNode[node]);
    setToast(node === 'share' ? 'Choose a lore fragment, then share it as a live link.' : 'Rune opened. The atlas remembers.');
  }

  function stopHold(reset = true) {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    holdStartedAt.current = null;
    if (reset && ritual !== 'awakened') {
      setHoldProgress(0);
      setRitual('dormant');
      setToast('The water needs stillness. Hold the grain until the ripple sleeps.');
    }
  }

  function beginHold() {
    if (ritual === 'awakened') {
      setToast('A lotus spore already floats at the pond. Tend the garden next.');
      return;
    }

    setRitual('holding');
    setToast('Stay still… let the circle sleep.');
    holdStartedAt.current = performance.now();

    const tick = (now: number) => {
      if (!holdStartedAt.current) return;
      const elapsed = now - holdStartedAt.current;
      const nextProgress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setHoldProgress(nextProgress);

      if (nextProgress >= 100) {
        setRitual('awakened');
        setHoldProgress(100);
        setToast('Lotus Spore revealed — a new lore fragment has entered your collection.');
        window.navigator.vibrate?.([20, 30, 40]);
        frameRef.current = null;
        holdStartedAt.current = null;
        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
  }

  function tendGarden() {
    setGardenLevel((level) => Math.min(3, level + 1));
    setToast(gardenLevel >= 2 ? 'Your plot is alive with lotus light.' : 'A Taboshi leaf settles into the tend-plot.');
  }

  function wakeRiver() {
    setRiverAwake(true);
    setToast('Sato wakes. Follow the blue current back to the pond.');
  }

  async function shareFragment(fragment: LoreFragment) {
    const url = `${window.location.origin}/lore/${fragment.slug}`;
    const text = `${fragment.quote} — ${fragment.title} / Tobyworld`;

    try {
      if (navigator.share) {
        await navigator.share({ title: fragment.title, text, url });
        setToast('Lore fragment sent into the world.');
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setToast('Lore link copied. Paste it into a Cast or post.');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setToast('Sharing paused. You can try again anytime.');
    }
  }

  return (
    <main className={`atlas-shell ritual-${ritual} ${riverAwake ? 'river-awake' : ''} garden-${gardenLevel}`}>
      <div className="atmosphere" aria-hidden="true">
        {stars.map((star, index) => (
          <span
            key={index}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              '--delay': star.delay,
              '--size': star.size,
            } as CSSProperties}
          />
        ))}
        <div className="moon-glow" />
        <div className="mist mist-one" />
        <div className="mist mist-two" />
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
      </div>

      <header className="atlas-header">
        <div className="brand-lockup">
          <span className="brand-mark">T</span>
          <div>
            <p className="brand-name">TOBYWORLD</p>
            <p className="brand-subtitle">THE LIVING FLYWHEEL</p>
          </div>
        </div>
        <div className="header-actions">
          <a className="source-link" href="https://toadgod.xyz/rune3" target="_blank" rel="noreferrer">
            Rune III ↗
          </a>
          <button
            className={`sound-toggle ${soundOn ? 'is-on' : ''}`}
            type="button"
            onClick={() => {
              setSoundOn((value) => !value);
              setToast(soundOn ? 'The pond goes quiet.' : 'Ambient mode is on — connect audio in a later build.');
            }}
            aria-label={soundOn ? 'Mute ambient mode' : 'Enable ambient mode'}
          >
            {soundOn ? '◖))' : '◖))'}
          </button>
        </div>
      </header>

      <section className="atlas-intro">
        <p className="eyebrow">RUNE III · STILL-WATER GARDEN</p>
        <h1>Plant stillness.<br />Tend the world.</h1>
        <p className="intro-copy">A lore-first atlas for the Tobyworld ecosystem. Touch the symbols. Wake the water. Follow the loop.</p>
      </section>

      <section className="atlas-stage" aria-label="Interactive Tobyworld flywheel map">
        <svg className="flow-lines" viewBox="0 0 390 650" role="presentation" aria-hidden="true">
          <path className="flow-line flow-toby-patience" d="M194 372 C140 338, 118 309, 113 268" />
          <path className="flow-line flow-patience-taboshi" d="M116 253 C150 198, 203 176, 264 190" />
          <path className="flow-line flow-taboshi-sato" d="M287 209 C330 258, 330 333, 280 391" />
          <path className="flow-line flow-sato-toby" d="M260 410 C240 440, 217 448, 193 432" />
          <path className="flow-line flow-toby-loreland" d="M192 429 C188 490, 193 535, 201 576" />
          <path className="flow-line flow-toby-gate" d="M195 365 C201 294, 206 160, 198 82" />
        </svg>

        <div className="gate-scene" aria-hidden="true">
          <div className="gate-ring gate-ring-a" />
          <div className="gate-ring gate-ring-b" />
          <div className="gate-core">✦</div>
        </div>
        <button className="map-node node-gate" type="button" onClick={() => chooseNode('gate')}>
          <span className="node-kicker">RUNE IV</span>
          <span className="node-label">GOLD GATE</span>
          <span className="node-note">awaiting</span>
        </button>

        <div className="floating-island island-left" aria-hidden="true"><span className="island-top" /><span className="island-rock" /></div>
        <div className="floating-island island-right" aria-hidden="true"><span className="island-top" /><span className="island-rock" /></div>
        <div className="floating-island island-lore" aria-hidden="true"><span className="island-top" /><span className="island-rock" /></div>

        <button className="map-node node-taboshi" type="button" onClick={() => chooseNode('taboshi')}>
          <span className="node-orb taboshi-orb">🍃</span>
          <span className="node-label">TABOSHI</span>
          <span className="node-note">tend plot</span>
          <span className="node-status">{gardenLevel}/3 leaves</span>
        </button>

        <button className="map-node node-patience" type="button" onClick={() => chooseNode('patience')}>
          <span className="node-orb patience-orb"><span className="triangle-glyph">△</span></span>
          <span className="node-label">PATIENCE</span>
          <span className="node-note">plant stillness</span>
        </button>

        <button className="map-node node-sato" type="button" onClick={() => chooseNode('sato')}>
          <span className="node-orb sato-orb">🌀</span>
          <span className="node-label">SATO</span>
          <span className="node-note">koi flow</span>
        </button>

        <button className="map-node node-toby" type="button" onClick={() => chooseNode('toby')}>
          <span className="pond-ripple ripple-one" />
          <span className="pond-ripple ripple-two" />
          <span className="pond-ripple ripple-three" />
          <span className="lotus-spore" aria-hidden="true">✦</span>
          <span className="toby-orb"><TobyFrog /></span>
          <span className="node-label">$TOBY</span>
          <span className="node-note">gather the fallen</span>
        </button>

        <button className="map-node node-loreland" type="button" onClick={() => chooseNode('loreland')}>
          <span className="node-orb lore-orb">⛰</span>
          <span className="node-label">LORELAND</span>
          <span className="node-note">roots seek bedrock</span>
        </button>

        <div className="sato-current" aria-hidden="true"><span>◌</span><span>◌</span><span>◌</span></div>
        <div className="garden-sprouts" aria-hidden="true"><span>⌇</span><span>⌇</span><span>⌇</span></div>
      </section>

      <section className="atlas-status" aria-live="polite">
        <div className="status-rune"><span>III</span><div><b>STILL WATER</b><small>atlas ritual</small></div></div>
        <div className="status-copy">{toast}</div>
        <div className="status-discovery"><b>{discoveries}</b><small>/4 discoveries</small></div>
      </section>

      <nav className="atlas-nav" aria-label="Atlas navigation">
        <button type="button" className={!selectedNode ? 'is-active' : ''} onClick={() => { setSelectedNode(null); setToast('The map is open. Tap any symbol.'); }}><span>◉</span>Map</button>
        <button type="button" className={selectedNode === 'toby' ? 'is-active' : ''} onClick={() => chooseNode('toby')}><span>☷</span>Lore</button>
        <button type="button" className={selectedNode === 'gate' ? 'is-active' : ''} onClick={() => chooseNode('gate')}><span>✦</span>Runes</button>
        <button type="button" className={selectedNode === 'share' ? 'is-active' : ''} onClick={() => chooseNode('share')}><span>↗</span>Share</button>
      </nav>

      {selectedNode && (
        <aside className="lore-drawer" aria-label="Tobyworld lore panel">
          <button type="button" className="drawer-close" onClick={() => setSelectedNode(null)} aria-label="Close lore panel">×</button>
          {selectedNode === 'share' ? (
            <ShareComposer
              selected={selectedFragment}
              onSelect={setSelectedFragment}
              onShare={shareFragment}
            />
          ) : (
            <NodePanel
              node={selectedNode}
              ritual={ritual}
              holdProgress={holdProgress}
              gardenLevel={gardenLevel}
              riverAwake={riverAwake}
              onHoldStart={beginHold}
              onHoldEnd={() => stopHold(true)}
              onTend={tendGarden}
              onWakeRiver={wakeRiver}
              onSelectFragment={(fragment) => {
                setSelectedFragment(fragment);
                setSelectedNode('share');
              }}
            />
          )}
        </aside>
      )}
    </main>
  );
}

function NodePanel({
  node,
  ritual,
  holdProgress,
  gardenLevel,
  riverAwake,
  onHoldStart,
  onHoldEnd,
  onTend,
  onWakeRiver,
  onSelectFragment,
}: {
  node: Exclude<NodeId, 'share'>;
  ritual: RitualState;
  holdProgress: number;
  gardenLevel: number;
  riverAwake: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onTend: () => void;
  onWakeRiver: () => void;
  onSelectFragment: (fragment: LoreFragment) => void;
}) {
  const detail = nodeDetails[node];
  const matchingFragment = node === 'toby'
    ? loreFragments[1]
    : node === 'patience'
      ? loreFragments[2]
      : node === 'taboshi' || node === 'sato'
        ? loreFragments[3]
        : loreFragments[4];

  return (
    <div className="drawer-content">
      <p className="eyebrow">{detail.eyebrow}</p>
      <h2>{detail.title}</h2>
      <p className="drawer-description">{detail.description}</p>

      {node === 'patience' && (
        <button
          className="ritual-button"
          type="button"
          style={{ '--hold-progress': `${holdProgress}%` } as CSSProperties}
          onPointerDown={onHoldStart}
          onPointerUp={onHoldEnd}
          onPointerLeave={onHoldEnd}
          onPointerCancel={onHoldEnd}
        >
          <span className="ritual-ring" />
          <span className="ritual-glyph">△</span>
          <strong>{ritual === 'awakened' ? 'Lotus Spore Revealed' : detail.action}</strong>
          <small>{ritual === 'awakened' ? 'The pond remembers your stillness.' : `${Math.round(holdProgress)}% · keep holding`}</small>
        </button>
      )}

      {node === 'taboshi' && (
        <div className="action-stack">
          <div className="garden-readout"><span>🍃</span><div><b>Tend-plot</b><small>{gardenLevel === 0 ? 'Waiting for its first leaf.' : `${gardenLevel} leaf ${gardenLevel === 1 ? 'bound' : 'marks bound'}.`}</small></div></div>
          <button className="primary-action leaf-action" type="button" onClick={onTend} disabled={gardenLevel >= 3}>
            {gardenLevel >= 3 ? 'Garden in bloom' : detail.action}
          </button>
        </div>
      )}

      {node === 'sato' && (
        <div className="action-stack">
          <div className="river-readout"><span>🌀</span><div><b>Canal signal</b><small>{riverAwake ? 'The current has found the pond.' : 'The koi current is dormant.'}</small></div></div>
          <button className="primary-action river-action" type="button" onClick={onWakeRiver} disabled={riverAwake}>
            {riverAwake ? 'River awakened' : detail.action}
          </button>
        </div>
      )}

      {node === 'loreland' && (
        <div className="root-readout"><span>⟋</span><span>⟍</span><span>⟋</span><p>Roots move slowly. This chamber is intentionally a horizon in the first release.</p></div>
      )}

      {node === 'gate' && (
        <div className="gate-readout"><span>✦</span><p>Rune IV is a deliberately locked scene. The first app should leave room for future official lore rather than inventing what has not been announced.</p></div>
      )}

      {node === 'toby' && (
        <div className="pond-readout"><TobyFrog /><p>The central node is an invitation to explore—not a trading panel. Every interaction in this starter is offchain and lore-first.</p></div>
      )}

      <button className="quote-preview" type="button" onClick={() => onSelectFragment(matchingFragment)}>
        <span>LORE FRAGMENT</span>
        <strong>{matchingFragment.quote}</strong>
        <small>Create a share card ↗</small>
      </button>

      <p className="disclaimer">Prototype behavior is cosmetic and stored only on this device. It does not verify holdings, calculate rewards, make transactions, or determine eligibility.</p>
    </div>
  );
}

function ShareComposer({ selected, onSelect, onShare }: { selected: LoreFragment; onSelect: (fragment: LoreFragment) => void; onShare: (fragment: LoreFragment) => void }) {
  return (
    <div className="drawer-content share-composer">
      <p className="eyebrow">SIGNAL FIRE · SHARE LORE</p>
      <h2>Send a fragment into the world.</h2>
      <p className="drawer-description">Each card has its own mobile-first page and Open Graph preview, so it can travel cleanly in a Cast, X post, or message.</p>
      <div className={`mini-share-card accent-${selected.accent}`}>
        <span>{selected.rune}</span>
        <h3>{selected.title}</h3>
        <blockquote>{selected.quote}</blockquote>
        <small>TOBYWORLD · THE LIVING FLYWHEEL</small>
      </div>
      <div className="fragment-picker" aria-label="Choose a lore fragment">
        {loreFragments.map((fragment) => (
          <button type="button" key={fragment.slug} className={selected.slug === fragment.slug ? 'selected' : ''} onClick={() => onSelect(fragment)}>
            <span className={`fragment-dot dot-${fragment.accent}`} />
            {fragment.title}
          </button>
        ))}
      </div>
      <button className="primary-action share-action" type="button" onClick={() => onShare(selected)}>Share lore fragment ↗</button>
      <a className="signal-source" href="https://x.com/toadgod1017" target="_blank" rel="noreferrer">Open Toadgod signal on X ↗</a>
    </div>
  );
}

function TobyFrog() {
  return (
    <svg className="toby-frog" viewBox="0 0 96 82" role="img" aria-label="Cute blue and white frog">
      <path d="M21 28 C12 10 32 4 40 20 C44 17 52 17 56 20 C64 4 84 10 75 28 C85 37 83 64 67 73 C56 79 40 79 29 73 C13 64 11 37 21 28Z" fill="#5db9ff" stroke="#071527" strokeWidth="4" />
      <ellipse cx="48" cy="52" rx="27" ry="20" fill="#effcff" stroke="#071527" strokeWidth="3" />
      <circle cx="35" cy="31" r="10" fill="#effcff" stroke="#071527" strokeWidth="3" />
      <circle cx="61" cy="31" r="10" fill="#effcff" stroke="#071527" strokeWidth="3" />
      <circle cx="37" cy="33" r="3.5" fill="#071527" />
      <circle cx="59" cy="33" r="3.5" fill="#071527" />
      <path d="M42 48 Q48 53 54 48" fill="none" stroke="#071527" strokeWidth="3" strokeLinecap="round" />
      <path d="M31 61 Q40 69 48 63 Q56 69 65 61" fill="none" stroke="#8fd1ff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
