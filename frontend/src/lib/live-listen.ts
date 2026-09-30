'use client';

/**
 * Listening to the phone's live audio from the now-playing card.
 *
 * The backend relays it as HLS (see backend/app/lib/live_relay.py). Safari
 * plays HLS natively; everywhere else hls.js does, loaded only once someone
 * presses Listen. There is one audio element for the page, shared by every
 * card drawn (the feed tile and the same card opened), so there is never
 * more than one copy playing.
 *
 * The stream runs some seconds behind the phone: HLS buffers a couple of
 * two-second segments before it plays.
 */

import { useSyncExternalStore } from 'react';
import type Hls from 'hls.js';

import { liveStreamUrl } from './api';

export type ListenState = 'idle' | 'loading' | 'playing' | 'error';

let state: ListenState = 'idle';
let audio: HTMLAudioElement | null = null;
let hls: Hls | null = null;
// Bumped by every start and stop, so a start still loading hls.js when Stop
// is pressed does not carry on and play.
let run = 0;
const listeners = new Set<() => void>();

function setState(next: ListenState) {
  state = next;
  for (const listener of listeners) listener();
}

function teardown() {
  hls?.destroy();
  hls = null;
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
}

export function stopListening(): void {
  run += 1;
  teardown();
  if (state !== 'idle') setState('idle');
}

async function startListening(): Promise<void> {
  const mine = ++run;
  teardown();
  setState('loading');
  const src = liveStreamUrl();
  if (!audio) {
    audio = new Audio();
    audio.addEventListener('playing', () => {
      if (state === 'loading') setState('playing');
    });
    audio.addEventListener('waiting', () => {
      if (state === 'playing') setState('loading');
    });
    // The relay closed the stream (the phone stopped, or went quiet): the
    // player plays out what it has and ends. Back to Listen, not a Stop
    // button over silence.
    audio.addEventListener('ended', () => {
      if (state !== 'idle') {
        run += 1;
        teardown();
        setState('idle');
      }
    });
    audio.addEventListener('error', () => {
      if (state !== 'idle') {
        teardown();
        setState('error');
      }
    });
  }
  const element = audio;

  if (element.canPlayType('application/vnd.apple.mpegurl')) {
    element.src = src;
  } else {
    const { default: HlsJs } = await import('hls.js');
    if (mine !== run) return;
    if (!HlsJs.isSupported()) {
      setState('error');
      return;
    }
    const player = new HlsJs({
      // Start two segments behind the live edge, and jump back to it if
      // playback falls more than five behind.
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 5,
    });
    player.on(HlsJs.Events.ERROR, (_event, data) => {
      if (data.fatal && mine === run) {
        teardown();
        setState('error');
      }
    });
    player.loadSource(src);
    player.attachMedia(element);
    hls = player;
  }

  try {
    await element.play();
  } catch {
    if (mine !== run) return;
    teardown();
    setState('error');
  }
}

/**
 * Loads hls.js ahead of the first press, once there is something to listen
 * to. Loading it inside the press would leave play() waiting on a download,
 * and a browser only lets a press start audio for a few seconds after it.
 */
export function prepareListening(): void {
  if (typeof document === 'undefined') return;
  if (document.createElement('audio').canPlayType('application/vnd.apple.mpegurl')) return;
  void import('hls.js');
}

/** Listen if not listening, stop if listening (or trying to). */
export function toggleListening(): void {
  if (state === 'idle' || state === 'error') void startListening();
  else stopListening();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useListenState(): ListenState {
  return useSyncExternalStore(subscribe, () => state, () => 'idle');
}
