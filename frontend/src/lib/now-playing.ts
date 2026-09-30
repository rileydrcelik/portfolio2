'use client';

/**
 * Keeping the now-playing card live.
 *
 * The phone reports a song when it starts, pauses or seeks, and once a minute
 * while it plays. The card polls for that -- every 10 s while a song plays,
 * every minute otherwise, not at all while the tab is hidden -- and runs the
 * progress bar on by itself in between, from where the song was at a moment
 * on the server's clock. So a poll that brings nothing new costs a 304 and
 * the bar still moves every second.
 *
 * One poller for the page, however many cards are drawn: the feed tile and
 * the same card opened in the modal share it, so the modal opens already
 * showing what the tile shows.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';

import { getNowPlaying, type NowPlayingState } from './api';

const POLL_PLAYING_MS = 10_000;
const POLL_IDLE_MS = 60_000;

export type NowPlaying = {
  data: NowPlayingState | null;
  /** Server clock minus this browser's, in ms. */
  offsetMs: number;
  failed: boolean;
};

const INITIAL: NowPlaying = { data: null, offsetMs: 0, failed: false };

let snapshot: NowPlaying = INITIAL;
let etag: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
const listeners = new Set<() => void>();

function publish(next: NowPlaying) {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function poll(run: number) {
  clearTimeout(timer);
  if (document.visibilityState === 'hidden') return;
  try {
    const result = await getNowPlaying(etag);
    if (run !== generation) return;
    if (result) {
      etag = result.etag;
      publish({ data: result.data, offsetMs: Date.parse(result.data.server_now) - Date.now(), failed: false });
    }
  } catch {
    // Keep showing what we had; a card that blanks on one failed poll
    // flickers on every flaky connection.
    if (run !== generation) return;
    if (snapshot.data === null) publish({ ...snapshot, failed: true });
  }
  const playing = snapshot.data?.state === 'playing';
  timer = setTimeout(() => void poll(run), playing ? POLL_PLAYING_MS : POLL_IDLE_MS);
}

function onVisibility() {
  if (document.visibilityState === 'visible') void poll(generation);
  else clearTimeout(timer);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    generation += 1;
    document.addEventListener('visibilitychange', onVisibility);
    void poll(generation);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      // Stale answers from this run are dropped by the generation check.
      generation += 1;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}

export function useNowPlaying(): NowPlaying {
  return useSyncExternalStore(subscribe, () => snapshot, () => INITIAL);
}

/** The current time on the server's clock, ticking once a second while `active`. */
export function useServerNow(offsetMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now + offsetMs;
}

/** Where the song is at `serverNowMs`, in seconds. */
export function positionAt(data: NowPlayingState, serverNowMs: number): number {
  let position = data.position_s;
  if (data.state === 'playing' && data.position_at) {
    position += Math.max(0, (serverNowMs - Date.parse(data.position_at)) / 1000);
  }
  const duration = data.track?.duration_s;
  return duration ? Math.min(position, duration) : position;
}

/** "just now", "12 min ago", "3 h ago", "yesterday", "4 days ago". */
export function agoLabel(iso: string | null, serverNowMs: number): string {
  if (!iso) return '';
  const minutes = Math.floor((serverNowMs - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** 83 -> "1:23". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
