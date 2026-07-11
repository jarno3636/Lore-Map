'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  RARITY_LABELS,
  TIER_LABELS,
  buildDefaultLayout,
  getTierProgress,
  type OwnedPatch,
  type PatchCategory,
  type PatchPlacement,
  type SafePatchDefinition,
  type TravelerPackPayload,
} from '@/lib/tobyworld-patches';
import './tobyworld-travelers-pack.css';

type ViewMode = 'backpack' | 'book';
type FilterMode =
  | 'all'
  | 'unlocked'
  | 'progress'
  | PatchCategory;

type ApiResponse = {
  ok: boolean;
  pack?: TravelerPackPayload;
  error?: string;
};

const filters: Array<{ key: FilterMode; label: string }> = [
  { key: 'all', label: 'All patches' },
  { key: 'unlocked', label: 'Unlocked' },
  { key: 'progress', label: 'In progress' },
  { key: 'daily_rite', label: 'Daily Rite' },
  { key: 'pond_passport', label: 'Pond Passport' },
  { key: 'atlas_exploration', label: 'Atlas' },
  { key: 'community', label: 'Community' },
  { key: 'milestone_relics', label: 'Relics' },
  { key: 'secret_discoveries', label: 'Secrets' },
  { key: 'seasonal', label: 'Seasonal' },
  { key: 'special', label: 'Special' },
];

function patchFallback(patch: SafePatchDefinition) {
  return patch.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
}

function BackpackPatch({
  patch,
  placement,
  onSelect,
}: {
  patch: OwnedPatch;
  placement: PatchPlacement;
  onSelect: () => void;
}) {
  return (
    <button
      className={`tw-pack-patch tw-rarity-${patch.rarity}`}
      style={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        zIndex: placement.zIndex,
        transform: `translate(-50%, -50%) rotate(${placement.rotation}deg) scale(${placement.scale})`,
      }}
      onClick={onSelect}
      aria-label={`Open ${patch.name} patch`}
      type="button"
    >
      <span className="tw-pack-patch__thread" />
      <Image
        src={patch.imagePath}
        alt=""
        width={150}
        height={150}
        draggable={false}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
          const fallback = event.currentTarget.nextElementSibling;
          if (fallback instanceof HTMLElement) fallback.hidden = false;
        }}
      />
      <span className="tw-pack-patch__fallback" hidden>
        {patchFallback(patch)}
      </span>
      <span className="tw-pack-patch__shine" />
    </button>
  );
}

function PatchDetail({
  patch,
  owned,
  progress,
  onClose,
  onFeature,
}: {
  patch: SafePatchDefinition;
  owned?: OwnedPatch;
  progress?: TravelerPackPayload['visibleProgress'][number];
  onClose: () => void;
  onFeature: (patchId: string) => Promise<void>;
}) {
  const [featuring, setFeaturing] = useState(false);

  return (
    <div className="tw-patch-dialog-backdrop" role="presentation">
      <section
        className={`tw-patch-dialog tw-rarity-panel-${patch.rarity}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patch-dialog-title"
      >
        <button
          className="tw-patch-dialog__close"
          type="button"
          onClick={onClose}
          aria-label="Close patch details"
        >
          ×
        </button>

        <div className="tw-patch-dialog__art">
          <Image
            src={patch.imagePath}
            alt=""
            width={280}
            height={280}
          />
          <span>{patchFallback(patch)}</span>
        </div>

        <div className="tw-patch-dialog__copy">
          <p className="tw-eyebrow">
            {CATEGORY_LABELS[patch.category]} · {RARITY_LABELS[patch.rarity]}
          </p>
          <h2 id="patch-dialog-title">{patch.name}</h2>
          <p className="tw-patch-dialog__description">
            {patch.shortDescription}
          </p>
          <blockquote>{patch.lore}</blockquote>

          {owned ? (
            <div className="tw-patch-dialog__earned">
              Earned{' '}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'long',
              }).format(new Date(owned.earnedAt))}
            </div>
          ) : progress ? (
            <div className="tw-patch-dialog__progress">
              <span>
                {progress.currentValue} / {progress.targetValue}
              </span>
              <div>
                <i
                  style={{
                    width: `${Math.min(
                      100,
                      (progress.currentValue / progress.targetValue) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="tw-patch-dialog__hint">
              {patch.publicHint ?? 'The path to this patch remains hidden.'}
            </p>
          )}

          {owned && (
            <button
              type="button"
              className="tw-primary-button"
              disabled={featuring || owned.featured}
              onClick={async () => {
                setFeaturing(true);
                await onFeature(patch.id);
                setFeaturing(false);
              }}
            >
              {owned.featured
                ? 'Featured on pack'
                : featuring
                  ? 'Stitching…'
                  : 'Feature this patch'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default function TobyworldTravelersPack() {
  const [pack, setPack] = useState<TravelerPackPayload | null>(null);
  const [view, setView] = useState<ViewMode>('backpack');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPack() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tobyworld/traveler-pack', {
        credentials: 'include',
        cache: 'no-store',
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.ok || !result.pack) {
        throw new Error(result.error ?? 'Unable to load traveler pack');
      }

      setPack(result.pack);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load traveler pack',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPack();
  }, []);

  const ownedById = useMemo(
    () => new Map(pack?.ownedPatches.map((patch) => [patch.id, patch]) ?? []),
    [pack],
  );

  const progressById = useMemo(
    () =>
      new Map(
        pack?.visibleProgress.map((progress) => [
          progress.id,
          progress,
        ]) ?? [],
      ),
    [pack],
  );

  const selectedPatch = useMemo(
    () => pack?.catalog.find((patch) => patch.id === selectedId) ?? null,
    [pack, selectedId],
  );

  const layout = useMemo(() => {
    if (!pack) return [];

    if (pack.backpackLayout.length > 0) return pack.backpackLayout;
    return buildDefaultLayout(pack.ownedPatches.map((patch) => patch.id));
  }, [pack]);

  const filteredCatalog = useMemo(() => {
    if (!pack) return [];

    if (filter === 'unlocked') {
      return pack.catalog.filter((patch) => ownedById.has(patch.id));
    }

    if (filter === 'progress') {
      return pack.catalog.filter((patch) => progressById.has(patch.id));
    }

    if (filter === 'all') return pack.catalog;

    return pack.catalog.filter((patch) => patch.category === filter);
  }, [filter, ownedById, pack, progressById]);

  async function featurePatch(patchId: string) {
    const response = await fetch('/api/tobyworld/traveler-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'feature_patch',
        patchId,
      }),
    });

    if (!response.ok) return;
    await loadPack();
  }

  async function sharePack() {
    await fetch('/api/tobyworld/traveler-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'record_share',
        platform: 'farcaster',
      }),
    });

    const text = pack
      ? `My Tobyworld Traveler's Pack holds ${pack.explorer.patchCount} embroidered memories.`
      : `My Tobyworld Traveler's Pack.`;

    if (navigator.share) {
      await navigator.share({
        title: `Tobyworld Traveler's Pack`,
        text,
        url: window.location.href,
      });
      return;
    }

    await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  }

  if (loading) {
    return (
      <main className="tw-pack-shell tw-pack-loading">
        <div className="tw-loader-lantern" />
        <p>Unrolling the field journal…</p>
      </main>
    );
  }

  if (error || !pack) {
    return (
      <main className="tw-pack-shell tw-pack-error">
        <p className="tw-eyebrow">The trail went quiet</p>
        <h1>Traveler’s Pack unavailable</h1>
        <p>{error ?? 'Please return to the Atlas and try again.'}</p>
        <button className="tw-primary-button" onClick={() => void loadPack()}>
          Try again
        </button>
      </main>
    );
  }

  const tierProgress = getTierProgress(pack.explorer.patchCount);

  return (
    <main className="tw-pack-shell">
      <div className="tw-ambient-fireflies" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <i key={index} />
        ))}
      </div>

      <header className="tw-pack-header">
        <div>
          <p className="tw-eyebrow">Tobyworld Atlas · Field Collection</p>
          <h1>Traveler’s Pack</h1>
          <p>
            Not achievements. Memories stitched into the road you took.
          </p>
        </div>

        <button className="tw-share-button" type="button" onClick={sharePack}>
          Share my pack
        </button>
      </header>

      <section className="tw-pack-stats" aria-label="Explorer pack statistics">
        <article>
          <span>Explorer rank</span>
          <strong>{TIER_LABELS[pack.explorer.tier]}</strong>
        </article>
        <article>
          <span>Patches carried</span>
          <strong>{pack.explorer.patchCount}</strong>
        </article>
        <article>
          <span>Secrets found</span>
          <strong>{pack.explorer.secretCount}</strong>
        </article>
        <article className="tw-tier-progress">
          <span>
            {tierProgress.next
              ? `${tierProgress.next - pack.explorer.patchCount} until the pack changes`
              : 'The Atlas remembers your name'}
          </span>
          <div>
            <i style={{ width: `${tierProgress.percentage}%` }} />
          </div>
        </article>
      </section>

      <nav className="tw-view-tabs" aria-label="Traveler pack view">
        <button
          type="button"
          aria-pressed={view === 'backpack'}
          onClick={() => setView('backpack')}
        >
          Explorer Backpack
        </button>
        <button
          type="button"
          aria-pressed={view === 'book'}
          onClick={() => setView('book')}
        >
          Patch Book
        </button>
      </nav>

      {view === 'backpack' ? (
        <section className="tw-backpack-stage">
          <div className={`tw-backpack tw-tier-${pack.explorer.tier}`}>
            <div className="tw-backpack__handle" />
            <div className="tw-backpack__body">
              <div className="tw-backpack__flap">
                <span className="tw-backpack__brand">TW</span>
              </div>
              <div className="tw-backpack__pocket" />
              <div className="tw-backpack__strap tw-backpack__strap--left" />
              <div className="tw-backpack__strap tw-backpack__strap--right" />
              <div className="tw-backpack__rope" />
              <div className="tw-backpack__journal" />
              <div className="tw-backpack__lantern" />

              {layout.map((placement) => {
                const patch = ownedById.get(placement.patchId);
                if (!patch) return null;

                return (
                  <BackpackPatch
                    key={patch.id}
                    patch={patch}
                    placement={placement}
                    onSelect={() => setSelectedId(patch.id)}
                  />
                );
              })}
            </div>
          </div>

          {pack.ownedPatches.length === 0 && (
            <div className="tw-empty-pack">
              <span>✦</span>
              <h2>The canvas is waiting</h2>
              <p>
                Complete a Daily Rite or open the Pond Passport to stitch in
                your first memory.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="tw-patch-book">
          <aside className="tw-patch-book__filters">
            <p className="tw-eyebrow">Field index</p>
            {filters.map((item) => (
              <button
                type="button"
                key={item.key}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <div className="tw-patch-book__pages">
            <div className="tw-patch-book__heading">
              <div>
                <p className="tw-eyebrow">Collected stories</p>
                <h2>{filters.find((item) => item.key === filter)?.label}</h2>
              </div>
              <span>{filteredCatalog.length} entries</span>
            </div>

            <div className="tw-patch-grid">
              {filteredCatalog.map((patch) => {
                const owned = ownedById.get(patch.id);
                const progress = progressById.get(patch.id);
                const progressPercent = progress
                  ? Math.min(
                      100,
                      (progress.currentValue / progress.targetValue) * 100,
                    )
                  : 0;

                return (
                  <button
                    type="button"
                    key={patch.id}
                    className={`tw-patch-card ${
                      owned ? 'is-owned' : 'is-locked'
                    } tw-rarity-card-${patch.rarity}`}
                    onClick={() => setSelectedId(patch.id)}
                  >
                    <div className="tw-patch-card__art">
                      <Image
                        src={patch.imagePath}
                        alt=""
                        width={180}
                        height={180}
                      />
                      <span>{patchFallback(patch)}</span>
                    </div>
                    <div className="tw-patch-card__copy">
                      <span>
                        {CATEGORY_LABELS[patch.category]} ·{' '}
                        {RARITY_LABELS[patch.rarity]}
                      </span>
                      <strong>{patch.name}</strong>
                      <p>
                        {owned
                          ? patch.shortDescription
                          : patch.publicHint ??
                            'Its story has not revealed itself.'}
                      </p>
                    </div>

                    {progress && !owned && (
                      <div className="tw-patch-card__meter">
                        <i style={{ width: `${progressPercent}%` }} />
                      </div>
                    )}

                    {owned && (
                      <span className="tw-patch-card__earned">Stitched</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {selectedPatch && (
        <PatchDetail
          patch={selectedPatch}
          owned={ownedById.get(selectedPatch.id)}
          progress={progressById.get(selectedPatch.id)}
          onClose={() => setSelectedId(null)}
          onFeature={featurePatch}
        />
      )}
    </main>
  );
}
