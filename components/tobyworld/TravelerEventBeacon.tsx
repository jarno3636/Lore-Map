'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  TravelerEventInput,
  TravelerEventKey,
} from '@/lib/tobyworld-patches';

type TravelerEventBeaconProps = {
  pageKey?: string;
  enableSessionTracking?: boolean;
};

type BeaconDetail = {
  eventKey: TravelerEventKey;
  value?: number;
  uniqueKey?: string;
  context?: Record<string, unknown>;
};

declare global {
  interface WindowEventMap {
    'tobyworld:traveler-event': CustomEvent<BeaconDetail>;
  }

  interface Window {
    tobyworldTravelerEvent?: (detail: BeaconDetail) => void;
  }
}

const SESSION_ID_KEY = 'tobyworld:traveler-session-id';
const SESSION_PAGES_KEY = 'tobyworld:traveler-session-pages';

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;

  const next = randomId();
  sessionStorage.setItem(SESSION_ID_KEY, next);
  return next;
}

export async function emitTravelerEvent(detail: BeaconDetail) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('tobyworld:traveler-event', { detail }),
  );
}

export default function TravelerEventBeacon({
  pageKey,
  enableSessionTracking = true,
}: TravelerEventBeaconProps) {
  const queueRef = useRef<TravelerEventInput[]>([]);
  const flushingRef = useRef(false);
  const mountedAtRef = useRef(Date.now());

  const flush = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0) return;
    flushingRef.current = true;

    const next = queueRef.current.shift();

    try {
      await fetch('/api/tobyworld/traveler-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({
          action: 'record_event',
          event: next,
        }),
      });
    } catch {
      if (next) queueRef.current.unshift(next);
    } finally {
      flushingRef.current = false;
      if (queueRef.current.length > 0) {
        window.setTimeout(flush, 220);
      }
    }
  }, []);

  const enqueue = useCallback(
    (detail: BeaconDetail) => {
      const sessionId = getSessionId();
      const now = new Date();

      queueRef.current.push({
        eventKey: detail.eventKey,
        value: detail.value,
        uniqueKey: detail.uniqueKey,
        idempotencyKey: [
          sessionId,
          detail.eventKey,
          detail.uniqueKey ?? 'general',
          Date.now(),
          randomId(),
        ].join(':'),
        context: {
          ...detail.context,
          sessionId,
          localHour: now.getHours(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          path: window.location.pathname,
        },
        occurredAt: now.toISOString(),
      });

      void flush();
    },
    [flush],
  );

  useEffect(() => {
    window.tobyworldTravelerEvent = enqueue;

    const listener = (
      event: CustomEvent<BeaconDetail>,
    ) => enqueue(event.detail);

    window.addEventListener('tobyworld:traveler-event', listener);

    return () => {
      window.removeEventListener('tobyworld:traveler-event', listener);
      delete window.tobyworldTravelerEvent;
    };
  }, [enqueue]);

  useEffect(() => {
    if (!pageKey) return;

    const previousPages = JSON.parse(
      sessionStorage.getItem(SESSION_PAGES_KEY) ?? '[]',
    ) as string[];

    const nextPages = Array.from(new Set([...previousPages, pageKey]));
    sessionStorage.setItem(SESSION_PAGES_KEY, JSON.stringify(nextPages));

    enqueue({
      eventKey: 'page_visited',
      uniqueKey: pageKey,
      context: {
        pageKey,
        sessionPageCount: nextPages.length,
      },
    });
  }, [enqueue, pageKey]);

  useEffect(() => {
    if (!enableSessionTracking) return;

    const timers = [5, 15, 30].map((minutes) =>
      window.setTimeout(() => {
        enqueue({
          eventKey: 'session_duration_reached',
          uniqueKey: `${minutes}m`,
          context: {
            minutes,
            mountedAt: mountedAtRef.current,
          },
        });
      }, minutes * 60_000),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [enableSessionTracking, enqueue]);

  return null;
}
