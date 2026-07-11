'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { OwnedPatch } from '@/lib/tobyworld-patches';
import './traveler-patch-unlock-toast.css';

export function TravelerPatchUnlockToast() {
  const [queue, setQueue] = useState<OwnedPatch[]>([]);
  const activePatch = queue[0] ?? null;

  useEffect(() => {
    const listener = (event: CustomEvent<OwnedPatch[]>) => {
      setQueue((current) => [...current, ...event.detail]);
    };

    window.addEventListener('tobyworld:patch-unlocked', listener);

    return () => {
      window.removeEventListener('tobyworld:patch-unlocked', listener);
    };
  }, []);

  useEffect(() => {
    if (!activePatch) return;

    const timeout = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, 5200);

    return () => window.clearTimeout(timeout);
  }, [activePatch]);

  if (!activePatch) return null;

  return (
    <aside
      className={`traveler-unlock traveler-unlock--${activePatch.rarity}`}
      aria-live="polite"
    >
      <div className="traveler-unlock__glow" aria-hidden="true" />

      <div className="traveler-unlock__patch">
        <Image
          src={activePatch.imagePath}
          alt=""
          width={92}
          height={92}
        />
      </div>

      <div>
        <small>A memory was stitched</small>
        <strong>{activePatch.name}</strong>
        <p>{activePatch.shortDescription}</p>
      </div>

      <button
        type="button"
        aria-label="Dismiss patch notification"
        onClick={() => setQueue((current) => current.slice(1))}
      >
        ×
      </button>
    </aside>
  );
}
