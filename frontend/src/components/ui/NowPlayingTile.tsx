'use client';

/**
 * The now-playing card: what is playing in mariposa right now, or what played
 * last, live. The post it sits in is only a marker; everything drawn here
 * comes from /api/presence/now-playing (see lib/now-playing.ts).
 *
 * `tile` is the feed card; `modal` is the same card opened, larger and with
 * the album. Only the one song, playing or last played: the recent plays the
 * API also returns are not shown.
 */

import Image from 'next/image';
import { useEffect } from 'react';
import { HeadphoneOff, Headphones, Loader2, RotateCcw } from 'lucide-react';

import type { NowPlayingState, PresenceSong } from '@/lib/api';
import { prepareListening, stopListening, toggleListening, useListenState } from '@/lib/live-listen';
import { clock, positionAt, useNowPlaying, useServerNow } from '@/lib/now-playing';

/**
 * The cover over the song's gradient. `className` must position it: the
 * image fills it, so it has to be `relative` or `absolute`. Setting
 * `relative` here as well would fight an `absolute` passed in, and CSS order,
 * not class order, decides which one wins.
 */
function Cover({ song, className, sizes }: { song: PresenceSong; className: string; sizes: string }) {
  const [from, to] = song.gradient ?? ['#262626', '#0a0a0a'];
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {song.artwork_url && (
        <Image src={song.artwork_url} alt="" fill sizes={sizes} className="object-cover" />
      )}
    </div>
  );
}

/** Three bars that move while a song plays. Scaled rather than resized, so it stays on the compositor. */
function Bars({ moving }: { moving: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-full w-[3px] origin-bottom rounded-[1px] bg-white/80 ${moving ? 'animate-now-playing' : ''}`}
          style={{ transform: moving ? undefined : `scaleY(${[0.4, 0.7, 0.55][i]})`, animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

function Progress({ position, duration }: { position: number; duration: number }) {
  return (
    <div className="mt-3" aria-hidden>
      <div className="h-[3px] w-full overflow-hidden rounded-[2px] bg-white/15">
        <div
          className="h-full rounded-[2px] bg-white/80"
          style={{ width: `${Math.min(100, (position / duration) * 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/60">
        <span>{clock(position)}</span>
        <span>{clock(duration)}</span>
      </div>
    </div>
  );
}

/**
 * Two things only: a song is playing, or one played. Paused is not said --
 * a paused song reads as the last one played, the same as a stopped one.
 */
function statusLine(data: NowPlayingState): string {
  return data.state === 'playing' ? 'Listening to' : 'Recently played';
}

function StatusRow({ data }: { data: NowPlayingState }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-wide text-white/80">
      <span className="shrink-0">
        <Bars moving={data.state === 'playing'} />
      </span>
      <span className="min-w-0 truncate">{statusLine(data)}</span>
    </div>
  );
}

/**
 * Listen to the phone's live audio. Shown only while the phone is streaming.
 * One audio element for the page, so the tile's and the modal's buttons are
 * the same control.
 */
function ListenButton() {
  const state = useListenState();
  const label =
    state === 'playing' ? 'Stop listening' : state === 'loading' ? 'Connecting' : state === 'error' ? 'Retry listening' : 'Listen live';
  return (
    <>
      <button
        type="button"
        onClick={toggleListening}
        aria-label={label}
        title={label}
        aria-busy={state === 'loading'}
        // A bare symbol, no chip behind it. The shadow is what keeps it
        // readable over a bright cover; the padding keeps a finger-sized target.
        className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-white/60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none"
      >
        {state === 'loading' ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : state === 'playing' ? (
          <HeadphoneOff className="h-5 w-5" aria-hidden />
        ) : state === 'error' ? (
          <RotateCcw className="h-5 w-5" aria-hidden />
        ) : (
          <Headphones className="h-5 w-5" aria-hidden />
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'loading' ? 'Connecting to the live audio' : state === 'error' ? 'Could not play the live audio' : ''}
      </span>
    </>
  );
}

function hasProgress(data: NowPlayingState): boolean {
  // Only while it plays: a bar stopped partway is the paused status again.
  return data.state === 'playing' && (data.track?.duration_s ?? 0) > 0;
}

export default function NowPlayingTile({ size = 'tile' }: { size?: 'tile' | 'modal' }) {
  const { data, offsetMs, failed } = useNowPlaying();
  // Ticks every second for the bar. It keeps ticking when nothing plays so
  // the clock is already current when a song starts, and the bar is drawn at
  // the song's position rather than jumping there a second later.
  const serverNow = useServerNow(offsetMs, data !== null);
  const modal = size === 'modal';
  const live = data?.live === true;

  // The phone stopped streaming: stop playing whatever is left buffered.
  // Started: get the player ready, so the first press plays at once.
  useEffect(() => {
    if (live) prepareListening();
    else stopListening();
  }, [live]);

  const track = data?.track ?? null;
  const message = !data
    ? failed
      ? 'Could not reach the music app.'
      : ''
    : data.state === 'hidden'
      ? 'Not sharing what’s playing right now.'
      : 'Nothing played yet.';

  if (!modal) {
    // The feed card: the cover full-bleed with the song over a gradient at its
    // foot, like an image tile. Not clickable, so no hover treatment either.
    return (
      <div className="h-full" role="group" aria-label="Now playing">
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 text-white shadow-lg">
          {!data || !track || data.state === 'hidden' ? (
            <>
              {/* Loading takes the loaded card's shape: a cover, and text at its foot. */}
              <div className={`absolute inset-0 bg-white/5 ${message ? '' : 'animate-pulse'}`} />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
                <span className="text-xs uppercase tracking-wide text-white/60">Listening</span>
                {message ? (
                  <p className="text-sm text-white/60">{message}</p>
                ) : (
                  <>
                    <div className="h-4 w-2/3 animate-pulse rounded-md bg-white/10" />
                    <div className="h-3 w-1/3 animate-pulse rounded-md bg-white/10" />
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Cover
                song={track}
                sizes="(max-width: 768px) 50vw, 25vw"
                className="absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4">
                <StatusRow data={data} />
                {live && <ListenButton />}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="truncate text-base font-semibold leading-snug">{track.title}</h3>
                <p className="truncate text-sm text-white/70">{track.artists.join(', ')}</p>
                {hasProgress(data) && (
                  <Progress position={positionAt(data, serverNow)} duration={track.duration_s ?? 0} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // The modal draws the chrome around this variant, so it has no border or
  // background of its own.
  if (!data || !track || data.state === 'hidden') {
    return (
      <div className="flex flex-col gap-6 p-8 text-white" role="group" aria-label="Now playing">
        <span className="text-xs uppercase tracking-wide text-white/60">Listening</span>
        {message ? (
          <p className="text-sm text-white/60">{message}</p>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="aspect-square w-48 shrink-0 animate-pulse rounded-xl bg-white/10 sm:w-56" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-6 w-2/3 animate-pulse rounded-md bg-white/10" />
              <div className="h-4 w-1/3 animate-pulse rounded-md bg-white/10" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl text-white" role="group" aria-label="Now playing">
      {/* The cover again, blurred, as the glass behind the card. */}
      {track.artwork_url && (
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <Image src={track.artwork_url} alt="" fill sizes="50vw" className="scale-125 object-cover blur-2xl" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />

      <div className="relative flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between gap-2">
          <StatusRow data={data} />
          {live && <ListenButton />}
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-48 shrink-0 sm:w-56">
            <Cover song={track} sizes="224px" className="relative aspect-square w-full rounded-xl shadow-2xl" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-2xl font-semibold leading-snug">{track.title}</h3>
            <p className="truncate text-sm text-white/70">{track.artists.join(', ')}</p>
            {track.album && <p className="truncate text-sm text-white/60">{track.album}</p>}
            {hasProgress(data) && (
              <Progress position={positionAt(data, serverNow)} duration={track.duration_s ?? 0} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
