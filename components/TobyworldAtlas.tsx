'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { loreFragments, type LoreFragment } from '@/lib/lore';

type NodeId = 'toby' | 'patience' | 'taboshi' | 'sato' | 'loreland' | 'gate' | 'share';
type MapNode = Exclude<NodeId, 'share'>;
type RitualState = 'dormant' | 'holding' | 'awakened';

type LinkItem = {
  label: string;
  href: string;
};

type NodeDetail = {
  title: string;
  eyebrow: string;
  description: string;
  action: string;
  howItFits: string;
  mechanics: string[];
  contractAddress?: string;
  basescanUrl?: string;
  links: LinkItem[];
};

const HOLD_DURATION = 1700;

/*
  Put the matching PNG files in:
  public/images/atlas/

  - toby-pond-guardian.png
  - patience-grain.png
  - taboshi-leaf.png
  - sato-koi-swirl.png
  - loreland-grove.png
  - scarce-asset.png
*/
const assets = {
  toby: {
    src: '/images/atlas/toby-pond-guardian.png',
    alt: 'Cute blue and white Toby frog in a blue glass orb',
    fallback: '🐸',
  },
  patience: {
    src: '/images/atlas/patience-grain.png',
    alt: 'Red Patience triangle inside a blue glass orb',
    fallback: '△',
  },
  taboshi: {
    src: '/images/atlas/taboshi-leaf.png',
    alt: 'Green Taboshi leaf inside a glass orb',
    fallback: '🍃',
  },
  sato: {
    src: '/images/atlas/sato-koi-swirl.png',
    alt: 'Blue Sato swirl inside a glass orb',
    fallback: '🌀',
  },
  loreland: {
    src: '/images/atlas/loreland-grove.png',
    alt: 'Loreland grove inside a green glass orb',
    fallback: '🌳',
  },
  gate: {
    src: '/images/atlas/scarce-asset.png',
    alt: 'Golden scarce asset in a glass plaque',
    fallback: '✦',
  },
} as const;

const nodeDetails: Record<MapNode, NodeDetail> = {
  toby: {
    title: '$TOBY · The Pond',
    eyebrow: 'FOUNDATION · GATHER THE FALLEN',
    description:
      'The blue frog holds the unmoving center of the map. Every energy line can travel through Toby, but Toby itself remains still.',
    action: 'Reveal pond lore',
    howItFits:
      'Rune III describes $TOBY as the core foundational base that gathers the fallen. In the atlas, it is the fixed pond that receives each returning current.',
    mechanics: [
      'Fixed center: the frog never orbits, spins, or slides.',
      'Blue energy returns to the pond after each outer-loop route.',
      'Tap the pond to open the official ecosystem context and a shareable lore fragment.',
    ],
    contractAddress: '0xb8D98a102b0079B69FFbc760C8d857A31653e56e',
    basescanUrl: 'https://basescan.org/token/0xb8D98a102b0079B69FFbc760C8d857A31653e56e',
    links: [
      { label: 'Official Tobyworld', href: 'https://toadgod.xyz/' },
      { label: 'Read Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Toadgod signal on X', href: 'https://x.com/toadgod1017' },
    ],
  },
  patience: {
    title: '$PATIENCE · Still Water',
    eyebrow: 'RUNE III · PLANT',
    description:
      'Press and hold the grain. The ritual only completes when the water is allowed to settle.',
    action: 'Hold to plant',
    howItFits:
      'Rune III frames $PATIENCE as the time-key of the Still-Water Garden: a grain creates one ripple, then rests until Lotus Spores appear.',
    mechanics: [
      'Hold for 1.7 seconds to reveal the Lotus Spore state.',
      'The red current becomes active only after the stillness ritual completes.',
      'This prototype visualizes the story; it does not check holdings, claim vaults, or calculate yield.',
    ],
    contractAddress: '0x6D96f18F00B815B2109A3766E79F6A7aD7785624',
    basescanUrl: 'https://basescan.org/token/0x6D96f18F00B815B2109A3766E79F6A7aD7785624',
    links: [
      { label: 'Rune III: Still-Water Garden', href: 'https://toadgod.xyz/rune3' },
      { label: 'Official Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  taboshi: {
    title: 'TABOSHI · Tend Plot',
    eyebrow: 'LEAF · GROWTH',
    description:
      'Bind leaves to the tend-plot. With every leaf, more of the outer flywheel comes alive.',
    action: 'Bind a leaf',
    howItFits:
      'Rune III places Taboshi Leaves in the tending layer: bind leaves to the plot after stillness, then let the garden become the growth bridge between pond and world.',
    mechanics: [
      'Bind up to three cosmetic leaves in this prototype.',
      'Two leaves make the Loreland path eligible to awaken after Sato is active.',
      'The green lane feeds toward Toby while the outer flywheel keeps circulating.',
    ],
    contractAddress: '0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f',
    basescanUrl: 'https://basescan.org/token/0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f',
    links: [
      { label: 'Read Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Official Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  sato: {
    title: 'SATO · Koi Flow',
    eyebrow: 'SWIRL · RETURN',
    description:
      'Wake the blue current. Its visual job is to make the return path obvious: it circles through the world and comes back to the pond.',
    action: 'Wake the current',
    howItFits:
      'Rune III describes Sato fees swirling back like koi bearing gold flakes. This screen treats Sato as a lore-flow connection, not as a live financial dashboard.',
    mechanics: [
      'Wake the canal to activate blue particles on the return lane.',
      'The particles move while the node positions remain stable.',
      'Sato has no contract address card in this atlas version.',
    ],
    links: [
      { label: 'Rune III: Returning Flow', href: 'https://toadgod.xyz/rune3' },
      { label: 'Official Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  loreland: {
    title: 'LORELAND · Bedrock',
    eyebrow: 'ROOTS · HORIZON',
    description:
      'The low green horizon is a lore chamber. It opens only after the ritual, tending, and returning-current states have all been discovered.',
    action: 'Study the roots',
    howItFits:
      'Rune III links patience and roots reaching bedrock with future Loreland deeds. The map keeps this intentionally speculative and does not present it as a claim screen.',
    mechanics: [
      'Unlock path: awaken Patience, bind two Taboshi leaves, then wake Sato.',
      'The root lane activates only after the three preceding discoveries.',
      'No contract address or eligibility logic is shown here.',
    ],
    links: [
      { label: 'Rune III: Loreland passage', href: 'https://toadgod.xyz/rune3' },
      { label: 'Official Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  gate: {
    title: 'SCARCE ASSET · Rune IV',
    eyebrow: 'RESERVE LAYER · AWAITING',
    description:
      'The gold shard is a visual placeholder for the future-facing scarcity layer shown in Tobyworld lore. It remains an omen, not a promise.',
    action: 'Study the reserve',
    howItFits:
      'Rune III connects Lotus Spores with a future scarce golden-coin idea after Rune IV. This card deliberately leaves the outcome unresolved until official lore says more.',
    mechanics: [
      'Gold particles travel only around the outer flywheel track.',
      'The asset stays informational: no contract address, price, or claim button.',
      'Use this panel as the home for future official Rune IV announcements.',
    ],
    links: [
      { label: 'Read Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Official Tobyworld', href: 'https://toadgod.xyz/' },
      { label: 'Toadgod signal on X', href: 'https://x.com/toadgod1017' },
    ],
  },
};

const stars = Array.from({ length: 54 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 19 + 6) % 92}%`,
  delay: `${(index % 12) * 0.42}s`,
  size: `${index % 7 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px`,
}));

export function TobyworldAtlas() {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [ritual, setRitual] = useState<RitualState>('dormant');
  const [holdProgress, setHoldProgress] = useState(0);
  const [gardenLevel, setGardenLevel] = useState(0);
  const [riverAwake, setRiverAwake] = useState(false);
  const [lorelandSeen, setLorelandSeen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [toast, setToast] = useState('Touch a symbol. The flywheel moves around Toby — never through him.');
  const [selectedFragment, setSelectedFragment] = useState<LoreFragment>(loreFragments[0]);

  const frameRef = useRef<number | null>(null);
  const holdStartedAt = useRef<number | null>(null);

  const lorelandUnlocked = ritual === 'awakened' && gardenLevel >= 2 && riverAwake;

  const discoveries = useMemo(() => {
    let total = 1;
    if (ritual === 'awakened') total += 1;
    if (gardenLevel > 0) total += 1;
    if (riverAwake) total += 1;
    if (lorelandSeen) total += 1;
    return total;
  }, [gardenLevel, lorelandSeen, ritual, riverAwake]);

  const nextObjective = useMemo(() => {
    if (ritual !== 'awakened') {
      return { label: 'Plant Stillness', detail: 'Hold the Patience grain until the pond becomes quiet.', node: 'patience' as const };
    }
    if (gardenLevel < 2) {
      return { label: 'Tend the Plot', detail: 'Bind two Taboshi leaves to deepen the roots.', node: 'taboshi' as const };
    }
    if (!riverAwake) {
      return { label: 'Wake Sato', detail: 'Send the blue current back toward the pond.', node: 'sato' as const };
    }
    if (!lorelandSeen) {
      return { label: 'Reach Bedrock', detail: 'The roots are ready to enter Loreland.', node: 'loreland' as const };
    }
    return { label: 'Share a Fragment', detail: 'Send a lore quote beyond the pond.', node: 'share' as const };
  }, [gardenLevel, lorelandSeen, ritual, riverAwake]);

  useEffect(() => {
    const saved = window.localStorage.getItem('tobyworld-atlas-v4');
    if (!saved) return;

    try {
      const state = JSON.parse(saved) as {
        ritual?: RitualState;
        gardenLevel?: number;
        riverAwake?: boolean;
        lorelandSeen?: boolean;
      };
      if (state.ritual) setRitual(state.ritual);
      if (typeof state.gardenLevel === 'number') setGardenLevel(Math.max(0, Math.min(3, state.gardenLevel)));
      if (typeof state.riverAwake === 'boolean') setRiverAwake(state.riverAwake);
      if (typeof state.lorelandSeen === 'boolean') setLorelandSeen(state.lorelandSeen);
    } catch {
      window.localStorage.removeItem('tobyworld-atlas-v4');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('tobyworld-atlas-v4', JSON.stringify({ ritual, gardenLevel, riverAwake, lorelandSeen }));
  }, [gardenLevel, lorelandSeen, ritual, riverAwake]);

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function getFragmentForNode(node: MapNode) {
    const indexByNode: Record<MapNode, number> = {
      toby: 0,
      patience: 1,
      taboshi: 2,
      sato: 2,
      loreland: 3,
      gate: 4,
    };
    return loreFragments[indexByNode[node]] ?? loreFragments[0];
  }

  function chooseNode(node: NodeId) {
    setSelectedNode(node);

    if (node === 'share') {
      setToast('Choose a quote, then send it into the world.');
      return;
    }

    setSelectedFragment(getFragmentForNode(node));

    if (node === 'loreland' && lorelandUnlocked) {
      setLorelandSeen(true);
      setToast('The roots found bedrock. Loreland remembers your route.');
      return;
    }

    setToast(node === 'loreland' ? 'Loreland is visible, but the roots are not ready yet.' : 'Asset card opened. The outer wheel keeps turning.');
  }

  function stopHold(reset = true) {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    holdStartedAt.current = null;

    if (reset && ritual !== 'awakened') {
      setRitual('dormant');
      setHoldProgress(0);
      setToast('The pond needs stillness. Hold the grain without rushing.');
    }
  }

  function beginHold() {
    if (ritual === 'awakened') {
      setToast('A Lotus Spore already floats above the fixed pond.');
      return;
    }

    setRitual('holding');
    setToast('Stay still… let the first ripple sleep.');
    holdStartedAt.current = performance.now();

    const tick = (now: number) => {
      if (!holdStartedAt.current) return;
      const progress = Math.min(100, ((now - holdStartedAt.current) / HOLD_DURATION) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        setRitual('awakened');
        setHoldProgress(100);
        setToast('Lotus Spore revealed. The red path is awake.');
        window.navigator.vibrate?.([15, 35, 35]);
        holdStartedAt.current = null;
        frameRef.current = null;
        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
  }

  function tendGarden() {
    if (gardenLevel >= 3) {
      setToast('The tend-plot is already glowing with Lotus light.');
      return;
    }

    const nextLevel = gardenLevel + 1;
    setGardenLevel(nextLevel);
    setToast(nextLevel >= 3 ? 'The garden blooms. Its roots have enough depth for Loreland.' : `A Taboshi leaf settles into the plot. ${nextLevel}/3 bound.`);
    window.navigator.vibrate?.(12);
  }

  function wakeRiver() {
    setRiverAwake(true);
    setToast('Sato wakes. Blue current returns around the wheel to Toby.');
    window.navigator.vibrate?.([10, 20, 20]);
  }

  async function shareFragment(fragment: LoreFragment) {
    const url = `${window.location.origin}/lore/${fragment.slug}`;
    const text = `${fragment.quote} — ${fragment.title} · Tobyworld`;

    try {
      if (navigator.share) {
        await navigator.share({ title: fragment.title, text, url });
        setToast('Lore fragment released into the world.');
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setToast('Lore link copied. Paste it into a Cast or post.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setToast('Sharing paused. The fragment is still waiting.');
    }
  }

  return (
    <main className={[
      'atlas-v4',
      `ritual-${ritual}`,
      `garden-${gardenLevel}`,
      riverAwake ? 'river-awake' : '',
      lorelandUnlocked ? 'loreland-unlocked' : '',
    ].join(' ')}>
      <div className="atlas-atmosphere" aria-hidden="true">
        {stars.map((star, index) => (
          <span key={index} className="atlas-star" style={{ left: star.left, top: star.top, '--size': star.size, '--delay': star.delay } as CSSProperties} />
        ))}
        <div className="atlas-moon" />
        <div className="atlas-mist atlas-mist-one" />
        <div className="atlas-mist atlas-mist-two" />
      </div>

      <header className="atlas-topbar">
        <div className="atlas-brand">
          <span className="atlas-brand-glyph">T</span>
          <div>
            <strong>TOBYWORLD</strong>
            <small>THE LIVING FLYWHEEL</small>
          </div>
        </div>
        <div className="atlas-topbar-actions">
          <a href="https://toadgod.xyz/rune3" target="_blank" rel="noreferrer" className="atlas-source-link">Rune III ↗</a>
          <button type="button" className={`atlas-sound ${soundOn ? 'is-on' : ''}`} onClick={() => {
            setSoundOn((value) => !value);
            setToast(soundOn ? 'The pond goes quiet.' : 'Ambient mode is ready for sound design.');
          }} aria-label={soundOn ? 'Mute ambient mode' : 'Enable ambient mode'}>◖))</button>
        </div>
      </header>

      <section className="atlas-hero">
        <p className="atlas-eyebrow">TOBYWORLD · LIVING FLYWHEEL</p>
        <h1>Everything moves.<br />Toby stays still.</h1>
        <p>Touch an asset to understand its lane. Energy moves around the world; the pond remains the fixed center.</p>
      </section>

      <section className="atlas-quest">
        <div className="atlas-quest-orb">✦</div>
        <div>
          <span>NEXT RITUAL</span>
          <strong>{nextObjective.label}</strong>
          <small>{nextObjective.detail}</small>
        </div>
        <button type="button" onClick={() => chooseNode(nextObjective.node)}>Enter ↗</button>
      </section>

      <section className="atlas-stage" aria-label="Interactive Tobyworld flywheel map">
        <div className="atlas-stage-light" aria-hidden="true" />
        <div className="atlas-continent atlas-continent-left" aria-hidden="true" />
        <div className="atlas-continent atlas-continent-right" aria-hidden="true" />
        <div className="atlas-continent atlas-continent-bottom" aria-hidden="true" />

        <FlywheelMotion ritual={ritual} gardenLevel={gardenLevel} riverAwake={riverAwake} lorelandUnlocked={lorelandUnlocked} />

        <button type="button" className="atlas-node atlas-node-gate" onClick={() => chooseNode('gate')}>
          <AssetImage asset="gate" className="atlas-node-image atlas-gate-image" priority />
          <span className="atlas-node-kicker">RUNE IV</span>
          <strong>SCARCE ASSET</strong>
          <small>reserve layer · awaiting</small>
        </button>

        <button type="button" className="atlas-node atlas-node-patience" onClick={() => chooseNode('patience')}>
          <AssetImage asset="patience" className="atlas-node-image" />
          <strong>$PATIENCE</strong>
          <small>{ritual === 'awakened' ? 'lotus awakened' : 'plant stillness'}</small>
        </button>

        <button type="button" className="atlas-node atlas-node-taboshi" onClick={() => chooseNode('taboshi')}>
          <AssetImage asset="taboshi" className="atlas-node-image" />
          <strong>$TABOSHI</strong>
          <small>{gardenLevel}/3 leaves bound</small>
        </button>

        <button type="button" className="atlas-node atlas-node-toby" onClick={() => chooseNode('toby')}>
          <span className="atlas-pond-ripple ripple-one" />
          <span className="atlas-pond-ripple ripple-two" />
          <span className="atlas-pond-ripple ripple-three" />
          {ritual === 'awakened' && <span className="atlas-lotus-spore" aria-hidden="true">✦</span>}
          <AssetImage asset="toby" className="atlas-node-image atlas-toby-image" priority />
          <strong>$TOBY</strong>
          <small>fixed pond · gather the fallen</small>
        </button>

        <button type="button" className="atlas-node atlas-node-sato" onClick={() => chooseNode('sato')}>
          <AssetImage asset="sato" className="atlas-node-image" />
          <strong>SATO</strong>
          <small>{riverAwake ? 'current awake' : 'koi return flow'}</small>
        </button>

        <button type="button" className={`atlas-node atlas-node-loreland ${lorelandUnlocked ? 'is-unlocked' : ''}`} onClick={() => chooseNode('loreland')}>
          <AssetImage asset="loreland" className="atlas-node-image" />
          <strong>LORELAND</strong>
          <small>{lorelandUnlocked ? 'roots reached bedrock' : 'roots seek bedrock'}</small>
        </button>

        {gardenLevel > 0 && <div className="atlas-garden-sprouts" aria-hidden="true"><span>⌇</span><span>⌇</span><span>⌇</span></div>}
      </section>

      <section className="atlas-progress" aria-live="polite">
        <div className="atlas-rune-badge">III</div>
        <div className="atlas-progress-copy"><strong>STILL WATER</strong><span>{toast}</span></div>
        <div className="atlas-progress-count"><strong>{discoveries}</strong><small>/5 found</small></div>
      </section>

      <nav className="atlas-nav" aria-label="Tobyworld atlas navigation">
        <button type="button" className={!selectedNode ? 'is-active' : ''} onClick={() => { setSelectedNode(null); setToast('The map is open. Follow the lights around the fixed pond.'); }}><span>◉</span>Map</button>
        <button type="button" className={selectedNode === 'toby' ? 'is-active' : ''} onClick={() => chooseNode('toby')}><span>☷</span>Assets</button>
        <button type="button" className={selectedNode === 'gate' ? 'is-active' : ''} onClick={() => chooseNode('gate')}><span>✦</span>Runes</button>
        <button type="button" className={selectedNode === 'share' ? 'is-active' : ''} onClick={() => chooseNode('share')}><span>↗</span>Share</button>
      </nav>

      {selectedNode && <>
        <button type="button" className="atlas-drawer-scrim" onClick={() => setSelectedNode(null)} aria-label="Close panel" />
        <aside className="atlas-drawer" aria-label="Tobyworld asset panel">
          <button type="button" className="atlas-drawer-close" onClick={() => setSelectedNode(null)} aria-label="Close asset panel">×</button>
          {selectedNode === 'share' ? (
            <ShareComposer selected={selectedFragment} onSelect={setSelectedFragment} onShare={shareFragment} />
          ) : (
            <NodePanel
              node={selectedNode}
              ritual={ritual}
              holdProgress={holdProgress}
              gardenLevel={gardenLevel}
              riverAwake={riverAwake}
              lorelandUnlocked={lorelandUnlocked}
              onHoldStart={beginHold}
              onHoldEnd={() => stopHold(true)}
              onTend={tendGarden}
              onWakeRiver={wakeRiver}
              onShareFragment={(fragment) => { setSelectedFragment(fragment); setSelectedNode('share'); }}
              onToast={setToast}
            />
          )}
        </aside>
      </>}
    </main>
  );
}

function FlywheelMotion({ ritual, gardenLevel, riverAwake, lorelandUnlocked }: {
  ritual: RitualState;
  gardenLevel: number;
  riverAwake: boolean;
  lorelandUnlocked: boolean;
}) {
  const outerLoop = 'M 102 260 C 148 175 247 175 290 260 C 346 347 328 471 261 534 C 218 574 166 574 116 534 C 49 472 44 347 102 260 Z';

  return (
    <svg className="atlas-flow-svg" viewBox="0 0 390 690" aria-hidden="true">
      <defs>
        <marker id="atlas-flywheel-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(175, 230, 242, .7)" />
        </marker>
      </defs>

      <path className="atlas-flow atlas-flow-loop" d={outerLoop} markerEnd="url(#atlas-flywheel-arrow)" />
      <path className={`atlas-flow atlas-flow-patience ${ritual === 'awakened' ? 'is-active' : ''}`} d="M 111 302 C 138 343 161 377 184 404" />
      <path className={`atlas-flow atlas-flow-taboshi ${gardenLevel > 0 ? 'is-active' : ''}`} d="M 280 302 C 253 343 229 377 207 404" />
      <path className={`atlas-flow atlas-flow-sato ${riverAwake ? 'is-active' : ''}`} d="M 287 487 C 257 480 227 462 208 438" />
      <path className={`atlas-flow atlas-flow-loreland ${lorelandUnlocked ? 'is-active' : ''}`} d="M 195 468 C 195 531 195 572 195 620" />
      <path className="atlas-flow atlas-flow-gate" d="M 195 111 C 195 205 195 289 195 354" />

      <FlowDot path={outerLoop} dur="12s" begin="0s" fill="#f7cf77" />
      <FlowDot path={outerLoop} dur="12s" begin="-4s" fill="#88e4ff" />
      <FlowDot path={outerLoop} dur="12s" begin="-8s" fill="#a8e984" />

      {ritual === 'awakened' && <FlowDot path="M 111 302 C 138 343 161 377 184 404" dur="2.7s" begin="0s" fill="#ff887b" />}
      {gardenLevel > 0 && <FlowDot path="M 280 302 C 253 343 229 377 207 404" dur="2.7s" begin="-1.2s" fill="#b8ed90" />}
      {riverAwake && <FlowDot path="M 287 487 C 257 480 227 462 208 438" dur="2.2s" begin="-0.4s" fill="#8de9ff" />}
      {lorelandUnlocked && <FlowDot path="M 195 468 C 195 531 195 572 195 620" dur="2.8s" begin="-1s" fill="#f9d67e" />}
    </svg>
  );
}

function FlowDot({ path, dur, begin, fill }: { path: string; dur: string; begin: string; fill: string }) {
  return (
    <circle className="atlas-flow-dot" r="3.5" fill={fill}>
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} />
    </circle>
  );
}

function AssetImage({ asset, className, priority = false }: { asset: keyof typeof assets; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const config = assets[asset];

  return (
    <span className={`atlas-asset ${className ?? ''} ${failed ? 'is-missing' : ''}`}>
      {!failed ? (
        <img src={config.src} alt={config.alt} draggable={false} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className="atlas-asset-fallback">{config.fallback}</span>
      )}
    </span>
  );
}

function NodePanel({ node, ritual, holdProgress, gardenLevel, riverAwake, lorelandUnlocked, onHoldStart, onHoldEnd, onTend, onWakeRiver, onShareFragment, onToast }: {
  node: MapNode;
  ritual: RitualState;
  holdProgress: number;
  gardenLevel: number;
  riverAwake: boolean;
  lorelandUnlocked: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onTend: () => void;
  onWakeRiver: () => void;
  onShareFragment: (fragment: LoreFragment) => void;
  onToast: (message: string) => void;
}) {
  const detail = nodeDetails[node];
  const fragmentIndex: Record<MapNode, number> = { toby: 0, patience: 1, taboshi: 2, sato: 2, loreland: 3, gate: 4 };
  const fragment = loreFragments[fragmentIndex[node]] ?? loreFragments[0];

  return (
    <div className="atlas-drawer-content">
      <div className="atlas-panel-heading">
        <AssetImage asset={node} className="atlas-panel-asset" priority />
        <div>
          <p className="atlas-eyebrow">{detail.eyebrow}</p>
          <h2>{detail.title}</h2>
        </div>
      </div>
      <p className="atlas-drawer-description">{detail.description}</p>

      {node === 'patience' && (
        <button type="button" className="atlas-ritual-button" style={{ '--hold-progress': `${holdProgress}%` } as CSSProperties}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); onHoldStart(); }}
          onPointerUp={onHoldEnd} onPointerLeave={onHoldEnd} onPointerCancel={onHoldEnd}>
          <span className="atlas-ritual-ring" />
          <span className="atlas-ritual-glyph">△</span>
          <strong>{ritual === 'awakened' ? 'Lotus Spore Revealed' : detail.action}</strong>
          <small>{ritual === 'awakened' ? 'The pond remembers your stillness.' : `${Math.round(holdProgress)}% · keep holding`}</small>
        </button>
      )}

      {node === 'taboshi' && (
        <div className="atlas-action-stack">
          <div className="atlas-readout"><span>🍃</span><div><strong>Tend-plot</strong><small>{gardenLevel === 0 ? 'Waiting for its first leaf.' : `${gardenLevel}/3 leaves bound.`}</small></div></div>
          <button className="atlas-primary-action atlas-leaf-action" type="button" onClick={onTend} disabled={gardenLevel >= 3}>{gardenLevel >= 3 ? 'Garden in bloom' : detail.action}</button>
        </div>
      )}

      {node === 'sato' && (
        <div className="atlas-action-stack">
          <div className="atlas-readout"><span>🌀</span><div><strong>Canal signal</strong><small>{riverAwake ? 'The current has found its pond.' : 'The blue current is dormant.'}</small></div></div>
          <button className="atlas-primary-action atlas-river-action" type="button" onClick={onWakeRiver} disabled={riverAwake}>{riverAwake ? 'Current awakened' : detail.action}</button>
        </div>
      )}

      {node === 'loreland' && (
        <div className="atlas-loreland-readout"><span>{lorelandUnlocked ? '✦' : '⟋'}</span><p>{lorelandUnlocked ? 'The roots reached bedrock. Loreland is now part of your map.' : 'Awaken Patience, bind at least two Taboshi leaves, then wake Sato to reach this chamber.'}</p></div>
      )}

      {node === 'gate' && (
        <div className="atlas-gate-readout"><span>✦</span><p>This is the future-facing gold reserve layer. Keep it intentionally unresolved until an official Rune IV entry exists.</p></div>
      )}

      {node === 'toby' && (
        <div className="atlas-toby-readout"><span>🐸</span><p>$TOBY never physically moves in the map. The animation is everything else returning through the pond.</p></div>
      )}

      <AssetExplainer detail={detail} onToast={onToast} />

      <button type="button" className="atlas-quote-preview" onClick={() => onShareFragment(fragment)}>
        <span>LORE FRAGMENT</span>
        <strong>{fragment.quote}</strong>
        <small>Create share card ↗</small>
      </button>

      <p className="atlas-disclaimer">Prototype progression is cosmetic and saved only on this device. It does not verify holdings, calculate rewards, make transactions, or determine eligibility.</p>
    </div>
  );
}

function AssetExplainer({ detail, onToast }: { detail: NodeDetail; onToast: (message: string) => void }) {
  async function copyAddress() {
    if (!detail.contractAddress) return;
    try {
      await navigator.clipboard.writeText(detail.contractAddress);
      onToast('Contract address copied.');
    } catch {
      onToast('Copy was blocked. Open BaseScan to copy the address.');
    }
  }

  return (
    <section className="atlas-explainer">
      <p className="atlas-explainer-kicker">HOW THIS FITS</p>
      <p className="atlas-explainer-copy">{detail.howItFits}</p>
      <ul className="atlas-mechanics-list">
        {detail.mechanics.map((mechanic) => <li key={mechanic}>{mechanic}</li>)}
      </ul>

      {detail.contractAddress && (
        <div className="atlas-contract-card">
          <span>CONTRACT ADDRESS · BASE</span>
          <code>{shortAddress(detail.contractAddress)}</code>
          <div>
            <button type="button" onClick={copyAddress}>Copy CA</button>
            {detail.basescanUrl && <a href={detail.basescanUrl} target="_blank" rel="noreferrer">BaseScan ↗</a>}
          </div>
        </div>
      )}

      <div className="atlas-resource-links">
        {detail.links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>)}
      </div>
    </section>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 7)}…${address.slice(-5)}`;
}

function ShareComposer({ selected, onSelect, onShare }: { selected: LoreFragment; onSelect: (fragment: LoreFragment) => void; onShare: (fragment: LoreFragment) => void }) {
  return (
    <div className="atlas-drawer-content atlas-share-composer">
      <p className="atlas-eyebrow">SIGNAL FIRE · SHARE LORE</p>
      <h2>Send a fragment into the world.</h2>
      <p className="atlas-drawer-description">Every quote can point to its own lore page and become a polished share card for Farcaster, X, messages, and screenshots.</p>
      <div className={`atlas-mini-share-card accent-${selected.accent}`}>
        <span>{selected.rune}</span>
        <h3>{selected.title}</h3>
        <blockquote>{selected.quote}</blockquote>
        <small>TOBYWORLD · THE LIVING FLYWHEEL</small>
      </div>
      <div className="atlas-fragment-picker">
        {loreFragments.map((fragment) => (
          <button type="button" key={fragment.slug} className={selected.slug === fragment.slug ? 'selected' : ''} onClick={() => onSelect(fragment)}>
            <span className={`atlas-fragment-dot dot-${fragment.accent}`} />
            {fragment.title}
          </button>
        ))}
      </div>
      <button type="button" className="atlas-primary-action atlas-share-action" onClick={() => onShare(selected)}>Share lore fragment ↗</button>
      <a className="atlas-signal-link" href="https://x.com/toadgod1017" target="_blank" rel="noreferrer">Open Toadgod signal on X ↗</a>
    </div>
  );
}
