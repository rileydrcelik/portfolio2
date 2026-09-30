'use client';

/**
 * The now-playing card: what is playing in mariposa right now, or what played
 * last, live. The post it sits in is only a marker; everything drawn here
 * comes from /api/presence/now-playing (see lib/now-playing.ts).
 *
 * `tile` is the feed card; `modal` is the same card opened, with the songs
 * played before it underneath.
 */

import Image from 'next/image';

import type { NowPlayingState, PresenceSong } from '@/lib/api';
import { agoLabel, clock, positionAt, useNowPlaying, useServerNow } from '@/lib/now-playing';

const RECENT_SHOWN = 8;

function Cover({ song, className, sizes }: { song: PresenceSong; className: string; sizes: string }) {
  const [from, to] = song.gradient ?? ['#262626', '#0a0a0a'];
  return (
    <div
      className={`relative overflow-hidden ${className}`}
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
          className="h-full rounded-[2px] bg-white/80 transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
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

function statusLine(data: NowPlayingState, serverNow: number): string {
  if (data.state === 'playing') return 'Now playing';
  if (data.state === 'paused') return 'Paused';
  return `Last played · ${agoLabel(data.last_active_at, serverNow)}`;
}

function StatusRow({ data, serverNow }: { data: NowPlayingState; serverNow: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-wide text-white/80">
      <span className="shrink-0">
        <Bars moving={data.state === 'playing'} />
      </span>
      <span className="min-w-0 truncate">{statusLine(data, serverNow)}</span>
    </div>
  );
}

function hasProgress(data: NowPlayingState): boolean {
  return (data.state === 'playing' || data.state === 'paused') && (data.track?.duration_s ?? 0) > 0;
}

export default function NowPlayingTile({ size = 'tile' }: { size?: 'tile' | 'modal' }) {
  const { data, offsetMs, failed } = useNowPlaying();
  // Ticks every second while playing (the bar), and every second otherwise
  // too so "N min ago" does not freeze -- it is one cheap re-render.
  const serverNow = useServerNow(offsetMs, data !== null);
  const modal = size === 'modal';

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
    // foot, like an image tile. `group` is on the outer div and the hover on
    // the card inside it, as in NoteTile.
    return (
      <div className="group h-full" role="group" aria-label="Now playing">
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 text-white shadow-lg transition-all duration-300 group-hover:border-white/25 group-hover:shadow-xl">
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
                className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85" />
              <div className="absolute inset-x-0 top-0 p-4">
                <StatusRow data={data} serverNow={serverNow} />
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

  const recent = data.recent.slice(0, RECENT_SHOWN);

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
        <StatusRow data={data} serverNow={serverNow} />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-48 shrink-0 sm:w-56">
            <Cover song={track} sizes="224px" className="aspect-square w-full rounded-xl shadow-2xl" />
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

        {recent.length > 0 && (
          <div>
            <h4 className="mb-3 text-xs uppercase tracking-wide text-white/60">Before that</h4>
            <ul className="flex flex-col gap-3">
              {recent.map((song, i) => (
                <li key={`${song.played_at}-${i}`} className="flex items-center gap-3">
                  <Cover song={song} sizes="40px" className="h-10 w-10 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{song.title}</p>
                    <p className="truncate text-xs text-white/60">{song.artists.join(', ')}</p>
                  </div>
                  <span className="shrink-0 text-xs text-white/60">{agoLabel(song.played_at, serverNow)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
