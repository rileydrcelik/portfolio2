'use client';

import { RefObject, useEffect, useState } from 'react';

export type HeroTone = 'light' | 'dark';

/**
 * 'light' means light-coloured text (the original white). It is also the
 * fallback everywhere below: the splash sits on a black backdrop before the
 * image resolves, so white is the safe answer whenever sampling is unavailable.
 */
const DEFAULT_TONE: HeroTone = 'light';

const RESIZE_DEBOUNCE_MS = 250;

// Answers are stable per image and layout, so keep them for the session rather
// than re-hitting the route on every remount or resize nudge.
const toneCache = new Map<string, HeroTone>();

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Picks a text tone that stays legible against the splash image.
 *
 * Measures where the text actually sits, so the sample tracks the heading
 * across breakpoints instead of averaging the whole photo -- a bright subject
 * behind the title matters, an unrelated dark sky above it does not.
 */
export function useHeroTone(
  imageUrl: string | null,
  containerRef: RefObject<HTMLElement | null>,
  textRef: RefObject<HTMLElement | null>,
): HeroTone {
  // Keyed by image URL so the fallback below applies automatically whenever the
  // featured image changes or disappears -- no reset pass needed.
  const [resolved, setResolved] = useState<{ url: string; tone: HeroTone } | null>(null);
  const tone = imageUrl && resolved?.url === imageUrl ? resolved.tone : DEFAULT_TONE;

  useEffect(() => {
    if (!imageUrl) return;

    let cancelled = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const measure = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return null;

      const box = container.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      if (box.width < 1 || box.height < 1 || textBox.width < 1 || textBox.height < 1) return null;

      return {
        ar: round(box.width / box.height),
        x: round((textBox.left - box.left) / box.width),
        y: round((textBox.top - box.top) / box.height),
        w: round(textBox.width / box.width),
        h: round(textBox.height / box.height),
      };
    };

    const resolve = async () => {
      const rect = measure();
      if (!rect) return;

      const query = new URLSearchParams({
        url: imageUrl,
        ar: String(rect.ar),
        x: String(rect.x),
        y: String(rect.y),
        w: String(rect.w),
        h: String(rect.h),
      });

      const key = query.toString();
      const cached = toneCache.get(key);
      if (cached) {
        if (!cancelled) setResolved({ url: imageUrl, tone: cached });
        return;
      }

      try {
        const response = await fetch(`/api/splash-luminance?${key}`, { signal: controller.signal });
        if (!response.ok) return; // Keep the fallback rather than guessing.

        const data = (await response.json()) as { tone?: HeroTone };
        if (data.tone !== 'light' && data.tone !== 'dark') return;

        toneCache.set(key, data.tone);
        if (!cancelled) setResolved({ url: imageUrl, tone: data.tone });
      } catch {
        // Network failure, abort, or bad payload: the splash keeps its default
        // white text, which is what it always used to do.
      }
    };

    // Wait for webfonts before measuring: the heading is set in a serif face,
    // and measuring while the fallback is still swapped in reports a different
    // height, which would sample the wrong band of the image.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) resolve();
      });
    } else {
      debounce = setTimeout(resolve, 0);
    }

    const onResize = () => {
      clearTimeout(debounce);
      debounce = setTimeout(resolve, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(debounce);
      window.removeEventListener('resize', onResize);
    };
  }, [imageUrl, containerRef, textRef]);

  return tone;
}

/**
 * Class names for each tone. The glow is the other half of the guarantee: on a
 * busy image the average can land mid-range, where neither colour is
 * comfortable, and an opposing halo keeps the letterforms separated from
 * whatever is directly behind them.
 */
export const HERO_TONE_STYLES: Record<
  HeroTone,
  { title: string; description: string; titleHover: string; descriptionHover: string }
> = {
  light: {
    title: 'text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]',
    description: 'text-white/60 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]',
    titleHover: 'group-hover:text-white group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]',
    descriptionHover: 'group-hover:text-white/85 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]',
  },
  dark: {
    title: 'text-neutral-950 drop-shadow-[0_2px_14px_rgba(255,255,255,0.6)]',
    description: 'text-neutral-900/70 drop-shadow-[0_1px_10px_rgba(255,255,255,0.55)]',
    titleHover: 'group-hover:text-black group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.85)]',
    descriptionHover: 'group-hover:text-black/90 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]',
  },
};
