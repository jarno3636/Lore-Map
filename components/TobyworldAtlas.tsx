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

const assets = {
  toby: {
    src: '/images/atlas/toby-pond-guardian.png',
    alt: 'Cute blue and white Toby frog guarding a mythic pond',
    fallback: '🐸',
  },
  patience: {
    src: '/images/atlas/patience-grain.png',
    alt: 'Red Patience triangle glowing like a grain of still water',
    fallback: '△',
  },
  taboshi: {
    src: '/images/atlas/taboshi-leaf.png',
    alt: 'Green Taboshi leaf glowing in a pond garden',
    fallback: '🍃',
  },
  sato: {
    src: '/images/atlas/sato-koi-swirl.png',
    alt: 'Blue Sato swirl moving like koi water',
    fallback: '🌀',
  },
  loreland: {
    src: '/images/atlas/loreland-grove.png',
    alt: 'Ancient Loreland grove beneath the pond roots',
    fallback: '🌳',
  },
  gate: {
    src: '/images/atlas/scarce-asset.png',
    alt: 'Golden sealed gate glowing above the flywheel',
    fallback: '✦',
  },
} as const;

const nodeDetails: Record<MapNode, NodeDetail> = {
  toby: {
    title: '$TOBY · The Pond',
    eyebrow: 'THE STILL CENTER',
    description:
      'Toby waits in the oldest water. He does not chase the wheel. The wheel returns to him.',
    action: 'Listen to the pond',
    howItFits:
      '$TOBY is the center-region of the Atlas. Every current can move, bloom, bend, or return — but the pond remains still.',
    mechanics: [
      'The frog stays fixed at the center.',
      'All outer paths bend back toward the pond.',
      'The map begins and ends in still water.',
    ],
    contractAddress: '0xb8D98a102b0079B69FFbc760C8d857A31653e56e',
    basescanUrl: 'https://basescan.org/token/0xb8D98a102b0079B69FFbc760C8d857A31653e56e',
    links: [
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
      { label: 'Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Toadgod Signal', href: 'https://x.com/toadgod1017' },
    ],
  },
  patience: {
    title: '$PATIENCE · Red Grain',
    eyebrow: 'THE FIRST RIPPLE',
    description:
      'A single red grain falls into the pond. Hold still long enough, and the water remembers.',
    action: 'Plant stillness',
    howItFits:
      '$PATIENCE is the first rite. Nothing opens by force. The grain must rest before the next region wakes.',
    mechanics: [
      'Hold the grain until the ripple settles.',
      'Stillness wakes the Lotus Spore.',
      'The red lane opens before the garden can grow.',
    ],
    contractAddress: '0x6D96f18F00B815B2109A3766E79F6A7aD7785624',
    basescanUrl: 'https://basescan.org/token/0x6D96f18F00B815B2109A3766E79F6A7aD7785624',
    links: [
      { label: 'Still-Water Garden', href: 'https://toadgod.xyz/rune3' },
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  taboshi: {
    title: 'TABOSHI · Leaf Garden',
    eyebrow: 'THE QUIET BLOOM',
    description:
      'Leaves gather beside the pond. The roots deepen. The flywheel starts to feel alive.',
    action: 'Bind a leaf',
    howItFits:
      'Taboshi is the growing region. It turns still water into a garden and gives the outer wheel something to feed.',
    mechanics: [
      'Each leaf deepens the pond-root.',
      'Two leaves prepare the way to Loreland.',
      'The green lane carries growth back toward Toby.',
    ],
    contractAddress: '0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f',
    basescanUrl: 'https://basescan.org/token/0x3A1a33cf4553Db61F0db2c1e1721CD480b02789f',
    links: [
      { label: 'Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  sato: {
    title: 'SATO · Blue Current',
    eyebrow: 'THE RETURNING FLOW',
    description:
      'The blue current circles like koi beneath moonlight. It moves through the world and bends back to the pond.',
    action: 'Wake the current',
    howItFits:
      'Sato is the returning lane. It gives the map motion without moving the center.',
    mechanics: [
      'The blue lane wakes after touch.',
      'The current circles the outer world.',
      'Its path always bends back toward Toby.',
    ],
    links: [
      { label: 'Returning Flow', href: 'https://toadgod.xyz/rune3' },
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  loreland: {
    title: 'LORELAND · Rootbed',
    eyebrow: 'BENEATH THE POND',
    description:
      'Below the water, the roots search for bedrock. Loreland opens only when the pond has remembered enough.',
    action: 'Enter the roots',
    howItFits:
      'Loreland is not a button. It is a hidden region beneath the pond, reached through stillness, leaves, and return.',
    mechanics: [
      'Awaken the red grain.',
      'Bind two leaves.',
      'Wake the blue current.',
    ],
    links: [
      { label: 'Loreland Passage', href: 'https://toadgod.xyz/rune3' },
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
    ],
  },
  gate: {
    title: 'Golden Gate · Rune IV',
    eyebrow: 'THE SEALED LAYER',
    description:
      'A gold shard hums above the pond. It is seen, but not opened. An omen waiting for the next rune.',
    action: 'Study the gate',
    howItFits:
      'The Golden Gate is the future-facing region of the Atlas. It should feel scarce, mysterious, and unresolved.',
    mechanics: [
      'Gold light circles the outer track.',
      'The gate stays sealed.',
      'The next rune decides what opens.',
    ],
    links: [
      { label: 'Rune III', href: 'https://toadgod.xyz/rune3' },
      { label: 'Tobyworld', href: 'https://toadgod.xyz/' },
      { label: 'Toadgod Signal', href: 'https://x.com/toadgod1017' },
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
  const [toast, setToast] = useState('Touch a region. The pond will answer.');
  const [selectedFragment, setSelectedFragment] = useState<LoreFragment>(loreFragments[0]);

  const frameRef = useRef<number | null>(null);
  const holdStartedAt = useRef<number | null>(null);
  const awakenedRef = useRef(false);

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
      return {
        label: 'Plant Stillness',
        detail: 'Hold the red grain.',
        node: 'patience' as const,
      };
    }

    if (gardenLevel < 2) {
      return {
        label: 'Grow the Leaves',
        detail: 'Bind two Taboshi leaves.',
        node: 'taboshi' as const,
      };
    }

    if (!riverAwake) {
      return {
        label: 'Wake the Current',
        detail: 'Send Sato back to the pond.',
        node: 'sato' as const,
      };
    }

    if (!lorelandSeen) {
      return {
        label: 'Reach the Rootbed',
        detail: 'Loreland is ready below.',
        node: 'loreland' as const,
      };
    }

    return {
      label: 'Share the Rune',
      detail: 'Release a fragment.',
      node: 'share' as const,
    };
  }, [gardenLevel, lorelandSeen, ritual, riverAwake]);

  useEffect(() => {
    awakenedRef.current = ritual === 'awakened';
  }, [ritual]);

  useEffect(() => {
    const saved = window.localStorage.getItem('tobyworld-atlas-v5');
    if (!saved) return;

    try {
      const state = JSON.parse(saved) as {
        ritual?: RitualState;
        gardenLevel?: number;
        riverAwake?: boolean;
        lorelandSeen?: boolean;
      };

      if (state.ritual) setRitual(state.ritual);
      if (typeof state.gardenLevel === 'number') {
        setGardenLevel(Math.max(0, Math.min(3, state.gardenLevel)));
      }
      if (typeof state.riverAwake === 'boolean') setRiverAwake(state.riverAwake);
      if (typeof state.lorelandSeen === 'boolean') setLorelandSeen(state.lorelandSeen);
    } catch {
      window.localStorage.removeItem('tobyworld-atlas-v5');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      'tobyworld-atlas-v5',
      JSON.stringify({ ritual, gardenLevel, riverAwake, lorelandSeen }),
    );
  }, [gardenLevel, lorelandSeen, ritual, riverAwake]);

  useEffect(
    () => () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

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
      setToast('Choose a fragment. Send it beyond the pond.');
      return;
    }

    setSelectedFragment(getFragmentForNode(node));

    if (node === 'loreland' && lorelandUnlocked) {
      setLorelandSeen(true);
      setToast('The roots reached bedrock. Loreland remembers.');
      return;
    }

    if (node === 'loreland') {
      setToast('The rootbed waits. The pond is not ready yet.');
      return;
    }

    setToast(`${nodeDetails[node].eyebrow}. ${nodeDetails[node].description}`);
  }

  function stopHold(reset = true) {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    holdStartedAt.current = null;

    if (reset && !awakenedRef.current) {
      setRitual('dormant');
      setHoldProgress(0);
      setToast('The grain slipped. Hold still a little longer.');
    }
  }

  function beginHold() {
    if (ritual === 'awakened') {
      setToast('The Lotus Spore already floats above the pond.');
      return;
    }

    setRitual('holding');
    setToast('Stay still. Let the ripple sleep.');
    holdStartedAt.current = performance.now();

    const tick = (now: number) => {
      if (!holdStartedAt.current) return;

      const progress = Math.min(100, ((now - holdStartedAt.current) / HOLD_DURATION) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        awakenedRef.current = true;
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
      setToast('The Leaf Garden is already full of quiet light.');
      return;
    }

    const nextLevel = gardenLevel + 1;
    setGardenLevel(nextLevel);

    setToast(
      nextLevel >= 3
        ? 'The garden blooms. The roots are deep.'
        : `A leaf settles into the pond. ${nextLevel}/3 bound.`,
    );

    window.navigator.vibrate?.(12);
  }

  function wakeRiver() {
    if (riverAwake) {
      setToast('The blue current is already circling home.');
      return;
    }

    setRiverAwake(true);
    setToast('Sato wakes. The blue current returns to Toby.');
    window.navigator.vibrate?.([10, 20, 20]);
  }

  async function shareFragment(fragment: LoreFragment) {
    const url = `${window.location.origin}/lore/${fragment.slug}`;
    const text = `${fragment.quote} — ${fragment.title} · Tobyworld`;

    try {
      if (navigator.share) {
        await navigator.share({ title: fragment.title, text, url });
        setToast('The fragment left the pond.');
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      setToast('Lore copied. Cast it when ready.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setToast('The fragment waits.');
      }
    }
  }

  return (
    <main
      className={[
        'atlas-v4',
        `ritual-${ritual}`,
        `garden-${gardenLevel}`,
        riverAwake ? 'river-awake' : '',
        lorelandUnlocked ? 'loreland-unlocked' : '',
      ].join(' ')}
    >
      <div className="atlas-atmosphere" aria-hidden="true">
        {stars.map((star, index) => (
          <span
            key={index}
            className="atlas-star"
            style={
              {
                left: star.left,
                top: star.top,
                '--size': star.size,
                '--delay': star.delay,
              } as CSSProperties
            }
          />
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
            <small>THE LIVING POND</small>
          </div>
        </div>

        <div className="atlas-topbar-actions">
          <a
            href="https://toadgod.xyz/rune3"
            target="_blank"
            rel="noreferrer"
            className="atlas-source-link"
          >
            Rune III ↗
          </a>
        </div>
      </header>

      <section className="atlas-hero">
        <p className="atlas-eyebrow">LIVING FLYWHEEL</p>
        <h1>
          Everything moves.
          <br />
          Toby stays still.
        </h1>
        <p>
          A pond of regions. A wheel of return. Touch the runes and let the map remember.
        </p>
      </section>

      <section className="atlas-quest">
        <div className="atlas-quest-orb">✦</div>
        <div>
          <span>NEXT RITE</span>
          <strong>{nextObjective.label}</strong>
          <small>{nextObjective.detail}</small>
        </div>
        <button type="button" onClick={() => chooseNode(nextObjective.node)}>
          Enter ↗
        </button>
      </section>

      <section className="atlas-stage" aria-label="Interactive Tobyworld flywheel map">
        <div className="atlas-stage-light" aria-hidden="true" />
        <div className="atlas-continent atlas-continent-left" aria-hidden="true" />
        <div className="atlas-continent atlas-continent-right" aria-hidden="true" />
        <div className="atlas-continent atlas-continent-bottom" aria-hidden="true" />

        <FlywheelMotion
          ritual={ritual}
          gardenLevel={gardenLevel}
          riverAwake={riverAwake}
          lorelandUnlocked={lorelandUnlocked}
        />

        <button type="button" className="atlas-node atlas-node-gate" onClick={() => chooseNode('gate')}>
          <AssetImage asset="gate" className="atlas-node-image atlas-gate-image" priority />
          <span className="atlas-node-kicker">RUNE IV</span>
          <strong>GOLDEN GATE</strong>
          <small>sealed omen</small>
        </button>

        <button
          type="button"
          className="atlas-node atlas-node-patience"
          onClick={() => chooseNode('patience')}
        >
          <AssetImage asset="patience" className="atlas-node-image" />
          <strong>RED GRAIN</strong>
          <small>{ritual === 'awakened' ? 'lotus awake' : 'plant stillness'}</small>
        </button>

        <button
          type="button"
          className="atlas-node atlas-node-taboshi"
          onClick={() => chooseNode('taboshi')}
        >
          <AssetImage asset="taboshi" className="atlas-node-image" />
          <strong>LEAF GARDEN</strong>
          <small>{gardenLevel}/3 leaves</small>
        </button>

        <button type="button" className="atlas-node atlas-node-toby" onClick={() => chooseNode('toby')}>
          <span className="atlas-pond-ripple ripple-one" />
          <span className="atlas-pond-ripple ripple-two" />
          <span className="atlas-pond-ripple ripple-three" />

          {ritual === 'awakened' && (
            <span className="atlas-lotus-spore" aria-hidden="true">
              ✦
            </span>
          )}

          <AssetImage asset="toby" className="atlas-node-image atlas-toby-image" priority />
          <strong>THE POND</strong>
          <small>Toby waits</small>
        </button>

        <button type="button" className="atlas-node atlas-node-sato" onClick={() => chooseNode('sato')}>
          <AssetImage asset="sato" className="atlas-node-image" />
          <strong>BLUE CURRENT</strong>
          <small>{riverAwake ? 'returning' : 'sleeping'}</small>
        </button>

        <button
          type="button"
          className={`atlas-node atlas-node-loreland ${lorelandUnlocked ? 'is-unlocked' : ''}`}
          onClick={() => chooseNode('loreland')}
        >
          <AssetImage asset="loreland" className="atlas-node-image" />
          <strong>LORELAND</strong>
          <small>{lorelandUnlocked ? 'rootbed open' : 'beneath the roots'}</small>
        </button>

        {gardenLevel > 0 && (
          <div className="atlas-garden-sprouts" aria-hidden="true">
            <span>⌇</span>
            <span>⌇</span>
            <span>⌇</span>
          </div>
        )}
      </section>

      <section className="atlas-progress" aria-live="polite">
        <div className="atlas-rune-badge">III</div>
        <div className="atlas-progress-copy">
          <strong>THE POND SPEAKS</strong>
          <span>{toast}</span>
        </div>
        <div className="atlas-progress-count">
          <strong>{discoveries}</strong>
          <small>lights</small>
        </div>
      </section>

      {selectedNode && (
        <>
          <button
            type="button"
            className="atlas-drawer-scrim"
            onClick={() => setSelectedNode(null)}
            aria-label="Close panel"
          />

          <aside className="atlas-drawer" aria-label="Tobyworld lore panel">
            <button
              type="button"
              className="atlas-drawer-close"
              onClick={() => setSelectedNode(null)}
              aria-label="Close lore panel"
            >
              ×
            </button>

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
                lorelandUnlocked={lorelandUnlocked}
                onHoldStart={beginHold}
                onHoldEnd={() => stopHold(true)}
                onTend={tendGarden}
                onWakeRiver={wakeRiver}
                onShareFragment={(fragment) => {
                  setSelectedFragment(fragment);
                  setSelectedNode('share');
                }}
                onToast={setToast}
              />
            )}
          </aside>
        </>
      )}
    </main>
  );
}

function FlywheelMotion({
  ritual,
  gardenLevel,
  riverAwake,
  lorelandUnlocked,
}: {
  ritual: RitualState;
  gardenLevel: number;
  riverAwake: boolean;
  lorelandUnlocked: boolean;
}) {
  const outerLoop =
    'M 102 260 C 148 175 247 175 290 260 C 346 347 328 471 261 534 C 218 574 166 574 116 534 C 49 472 44 347 102 260 Z';

  return (
    <svg className="atlas-flow-svg" viewBox="0 0 390 690" aria-hidden="true">
      <defs>
        <marker
          id="atlas-flywheel-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(175, 230, 242, .7)" />
        </marker>
      </defs>

      <path className="atlas-flow atlas-flow-loop" d={outerLoop} markerEnd="url(#atlas-flywheel-arrow)" />
      <path
        className={`atlas-flow atlas-flow-patience ${ritual === 'awakened' ? 'is-active' : ''}`}
        d="M 111 302 C 138 343 161 377 184 404"
      />
      <path
        className={`atlas-flow atlas-flow-taboshi ${gardenLevel > 0 ? 'is-active' : ''}`}
        d="M 280 302 C 253 343 229 377 207 404"
      />
      <path
        className={`atlas-flow atlas-flow-sato ${riverAwake ? 'is-active' : ''}`}
        d="M 287 487 C 257 480 227 462 208 438"
      />
      <path
        className={`atlas-flow atlas-flow-loreland ${lorelandUnlocked ? 'is-active' : ''}`}
        d="M 195 468 C 195 531 195 572 195 620"
      />
      <path className="atlas-flow atlas-flow-gate" d="M 195 111 C 195 205 195 289 195 354" />

      <FlowDot path={outerLoop} dur="12s" begin="0s" fill="#f7cf77" />
      <FlowDot path={outerLoop} dur="12s" begin="-4s" fill="#88e4ff" />
      <FlowDot path={outerLoop} dur="12s" begin="-8s" fill="#a8e984" />

      {ritual === 'awakened' && (
        <FlowDot path="M 111 302 C 138 343 161 377 184 404" dur="2.7s" begin="0s" fill="#ff887b" />
      )}

      {gardenLevel > 0 && (
        <FlowDot
          path="M 280 302 C 253 343 229 377 207 404"
          dur="2.7s"
          begin="-1.2s"
          fill="#b8ed90"
        />
      )}

      {riverAwake && (
        <FlowDot
          path="M 287 487 C 257 480 227 462 208 438"
          dur="2.2s"
          begin="-0.4s"
          fill="#8de9ff"
        />
      )}

      {lorelandUnlocked && (
        <FlowDot
          path="M 195 468 C 195 531 195 572 195 620"
          dur="2.8s"
          begin="-1s"
          fill="#f9d67e"
        />
      )}
    </svg>
  );
}

function FlowDot({
  path,
  dur,
  begin,
  fill,
}: {
  path: string;
  dur: string;
  begin: string;
  fill: string;
}) {
  return (
    <circle className="atlas-flow-dot" r="3.5" fill={fill}>
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} />
    </circle>
  );
}

function AssetImage({
  asset,
  className,
  priority = false,
}: {
  asset: keyof typeof assets;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const config = assets[asset];

  return (
    <span className={`atlas-asset ${className ?? ''} ${failed ? 'is-missing' : ''}`}>
      {!failed ? (
        <img
          src={config.src}
          alt={config.alt}
          draggable={false}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="atlas-asset-fallback">{config.fallback}</span>
      )}
    </span>
  );
}

function NodePanel({
  node,
  ritual,
  holdProgress,
  gardenLevel,
  riverAwake,
  lorelandUnlocked,
  onHoldStart,
  onHoldEnd,
  onTend,
  onWakeRiver,
  onShareFragment,
  onToast,
}: {
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

  const fragmentIndex: Record<MapNode, number> = {
    toby: 0,
    patience: 1,
    taboshi: 2,
    sato: 2,
    loreland: 3,
    gate: 4,
  };

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
        <button
          type="button"
          className="atlas-ritual-button"
          style={{ '--hold-progress': `${holdProgress}%` } as CSSProperties}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            onHoldStart();
          }}
          onPointerUp={onHoldEnd}
          onPointerLeave={onHoldEnd}
          onPointerCancel={onHoldEnd}
        >
          <span className="atlas-ritual-ring" />
          <span className="atlas-ritual-glyph">△</span>
          <strong>{ritual === 'awakened' ? 'Lotus Revealed' : detail.action}</strong>
          <small>{ritual === 'awakened' ? 'The pond remembers.' : `${Math.round(holdProgress)}%`}</small>
        </button>
      )}

      {node === 'taboshi' && (
        <div className="atlas-action-stack">
          <div className="atlas-readout">
            <span>🍃</span>
            <div>
              <strong>Leaf Garden</strong>
              <small>{gardenLevel === 0 ? 'Waiting for the first leaf.' : `${gardenLevel}/3 leaves bound.`}</small>
            </div>
          </div>

          <button
            className="atlas-primary-action atlas-leaf-action"
            type="button"
            onClick={onTend}
            disabled={gardenLevel >= 3}
          >
            {gardenLevel >= 3 ? 'Garden Bloomed' : detail.action}
          </button>
        </div>
      )}

      {node === 'sato' && (
        <div className="atlas-action-stack">
          <div className="atlas-readout">
            <span>🌀</span>
            <div>
              <strong>Blue Current</strong>
              <small>{riverAwake ? 'Returning home.' : 'Sleeping under the surface.'}</small>
            </div>
          </div>

          <button
            className="atlas-primary-action atlas-river-action"
            type="button"
            onClick={onWakeRiver}
            disabled={riverAwake}
          >
            {riverAwake ? 'Current Awake' : detail.action}
          </button>
        </div>
      )}

      {node === 'loreland' && (
        <div className="atlas-loreland-readout">
          <span>{lorelandUnlocked ? '✦' : '⟋'}</span>
          <p>
            {lorelandUnlocked
              ? 'The roots reached bedrock. Loreland opens below the pond.'
              : 'Stillness. Two leaves. One returning current.'}
          </p>
        </div>
      )}

      {node === 'gate' && (
        <div className="atlas-gate-readout">
          <span>✦</span>
          <p>The gate is visible, not open. Let Rune IV decide what waits behind it.</p>
        </div>
      )}

      {node === 'toby' && (
        <div className="atlas-toby-readout">
          <span>🐸</span>
          <p>The pond does not move. The world moves around it.</p>
        </div>
      )}

      <AssetExplainer detail={detail} onToast={onToast} />

      <button type="button" className="atlas-quote-preview" onClick={() => onShareFragment(fragment)}>
        <span>LORE FRAGMENT</span>
        <strong>{fragment.quote}</strong>
        <small>Share fragment ↗</small>
      </button>
    </div>
  );
}

function AssetExplainer({
  detail,
  onToast,
}: {
  detail: NodeDetail;
  onToast: (message: string) => void;
}) {
  async function copyAddress() {
    if (!detail.contractAddress) return;

    try {
      await navigator.clipboard.writeText(detail.contractAddress);
      onToast('Seal copied.');
    } catch {
      onToast('Open BaseScan to copy the seal.');
    }
  }

  return (
    <section className="atlas-explainer">
      <p className="atlas-explainer-kicker">PLACE IN THE WHEEL</p>
      <p className="atlas-explainer-copy">{detail.howItFits}</p>

      <ul className="atlas-mechanics-list">
        {detail.mechanics.map((mechanic) => (
          <li key={mechanic}>{mechanic}</li>
        ))}
      </ul>

      {(detail.contractAddress || detail.links.length > 0) && (
        <details className="atlas-contract-card">
          <summary>Source seals</summary>

          {detail.contractAddress && (
            <>
              <span>BASE SEAL</span>
              <code>{shortAddress(detail.contractAddress)}</code>

              <div>
                <button type="button" onClick={copyAddress}>
                  Copy
                </button>

                {detail.basescanUrl && (
                  <a href={detail.basescanUrl} target="_blank" rel="noreferrer">
                    BaseScan ↗
                  </a>
                )}
              </div>
            </>
          )}

          <div className="atlas-resource-links">
            {detail.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label} ↗
              </a>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 7)}…${address.slice(-5)}`;
}

function ShareComposer({
  selected,
  onSelect,
  onShare,
}: {
  selected: LoreFragment;
  onSelect: (fragment: LoreFragment) => void;
  onShare: (fragment: LoreFragment) => void;
}) {
  return (
    <div className="atlas-drawer-content atlas-share-composer">
      <p className="atlas-eyebrow">SIGNAL FIRE</p>
      <h2>Release a fragment.</h2>
      <p className="atlas-drawer-description">A small piece of the pond, ready to travel.</p>

      <div className={`atlas-mini-share-card accent-${selected.accent}`}>
        <span>{selected.rune}</span>
        <h3>{selected.title}</h3>
        <blockquote>{selected.quote}</blockquote>
        <small>TOBYWORLD · THE LIVING POND</small>
      </div>

      <div className="atlas-fragment-picker">
        {loreFragments.map((fragment) => (
          <button
            type="button"
            key={fragment.slug}
            className={selected.slug === fragment.slug ? 'selected' : ''}
            onClick={() => onSelect(fragment)}
          >
            <span className={`atlas-fragment-dot dot-${fragment.accent}`} />
            {fragment.title}
          </button>
        ))}
      </div>

      <button type="button" className="atlas-primary-action atlas-share-action" onClick={() => onShare(selected)}>
        Share fragment ↗
      </button>

      <a className="atlas-signal-link" href="https://x.com/toadgod1017" target="_blank" rel="noreferrer">
        Toadgod Signal ↗
      </a>
    </div>
  );
}
