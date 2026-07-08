'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TOBYWORLD_MILESTONES,
  formatMilestoneNumber,
  getMilestoneProgress,
  type TobyworldMilestone,
} from '@/lib/tobyworld-milestones';
import './milestone-badges.css';

type MilestoneWithProgress = TobyworldMilestone & {
  progress: {
    percent: number;
    remaining: number;
    unlocked: boolean;
  };
};

type MilestonesResponse = {
  totalEchoes: number;
  nextMilestone: TobyworldMilestone;
  milestones: MilestoneWithProgress[];
  error?: string;
};

function getFallbackData(): MilestonesResponse {
  return {
    totalEchoes: 0,
    nextMilestone: TOBYWORLD_MILESTONES[0],
    milestones: TOBYWORLD_MILESTONES.map((milestone) => ({
      ...milestone,
      progress: getMilestoneProgress(0, milestone.threshold),
    })),
  };
}

export function MilestoneBadges() {
  const [data, setData] = useState<MilestonesResponse>(() => getFallbackData());
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const totalEchoes = data.totalEchoes;
  const nextMilestone = data.nextMilestone;

  const nextProgress = useMemo(
    () => getMilestoneProgress(totalEchoes, nextMilestone.threshold),
    [nextMilestone.threshold, totalEchoes],
  );

  const fetchMilestones = useCallback(async () => {
    setIsLoading(true);
    setNotice(null);

    try {
      const response = await fetch('/api/tobyworld/milestones', {
        cache: 'no-store',
      });

      const nextData = (await response.json()) as MilestonesResponse;

      if (!response.ok) {
        throw new Error(nextData.error || 'Unable to read milestone tracker.');
      }

      setData(nextData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The relic tracker is resting.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMilestones();

    const interval = window.setInterval(() => {
      void fetchMilestones();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [fetchMilestones]);

  return (
    <section className="milestone-relics" aria-label="Tobyworld milestone relic tracker">
      <div className="milestone-relics-glow" aria-hidden="true" />
      <div className="milestone-relics-ring milestone-relics-ring-one" aria-hidden="true" />
      <div className="milestone-relics-ring milestone-relics-ring-two" aria-hidden="true" />

      <header className="milestone-relics-header">
        <div>
          <p>MILESTONE RELICS</p>
          <h2>Echoes become relics.</h2>
          <span>
            Community-wide Daily Rite milestones. Each unlocked relic is designed to become
            a future claimable Tobyworld NFT badge.
          </span>
        </div>

        <button type="button" onClick={fetchMilestones} disabled={isLoading}>
          {isLoading ? 'Reading…' : 'Refresh ↻'}
        </button>
      </header>

      <article className={`milestone-relics-hero accent-${nextMilestone.accent}`}>
        <div className="milestone-relics-hero-image">
          <img src={nextMilestone.imageSrc} alt="" aria-hidden="true" />
          <span>{nextMilestone.symbol}</span>
        </div>

        <div className="milestone-relics-hero-copy">
          <p>NEXT RELIC</p>
          <h3>{nextMilestone.title}</h3>
          <span>{nextMilestone.lore}</span>

          <div className="milestone-relics-progress-shell">
            <div className="milestone-relics-progress-topline">
              <strong>
                {formatMilestoneNumber(totalEchoes)} /{' '}
                {formatMilestoneNumber(nextMilestone.threshold)}
              </strong>
              <small>{Math.floor(nextProgress.percent)}%</small>
            </div>

            <div className="milestone-relics-progress-track">
              <i style={{ width: `${nextProgress.percent}%` }} />
            </div>

            <small>
              {nextProgress.unlocked
                ? 'Unlocked. Claim logic comes next.'
                : `${formatMilestoneNumber(nextProgress.remaining)} echoes remain.`}
            </small>
          </div>
        </div>
      </article>

      <div className="milestone-relics-grid">
        {data.milestones.map((milestone) => (
          <article
            className={`milestone-relic-card accent-${milestone.accent} ${
              milestone.progress.unlocked ? 'is-unlocked' : 'is-locked'
            }`}
            key={milestone.id}
          >
            <div className="milestone-relic-card-image">
              <img src={milestone.imageSrc} alt={milestone.title} />
              <span>{milestone.symbol}</span>
            </div>

            <div className="milestone-relic-card-copy">
              <p>{milestone.progress.unlocked ? 'UNLOCKED RELIC' : 'LOCKED RELIC'}</p>
              <h3>{milestone.title}</h3>
              <span>{milestone.description}</span>
            </div>

            <div className="milestone-relic-card-progress">
              <div>
                <strong>
                  {formatMilestoneNumber(totalEchoes)} /{' '}
                  {formatMilestoneNumber(milestone.threshold)}
                </strong>
                <small>
                  {milestone.progress.unlocked
                    ? 'Unlocked'
                    : `${formatMilestoneNumber(milestone.progress.remaining)} remain`}
                </small>
              </div>

              <div className="milestone-relic-mini-track">
                <i style={{ width: `${milestone.progress.percent}%` }} />
              </div>
            </div>

            <button type="button" disabled>
              {milestone.progress.unlocked ? 'Claim coming soon' : 'Locked'}
            </button>
          </article>
        ))}
      </div>

      {notice && (
        <p className="milestone-relics-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
