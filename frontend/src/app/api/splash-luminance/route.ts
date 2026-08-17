/**
 * Measures how bright the featured splash image is *behind the hero text*, so
 * the client can pick a font colour that stays readable on any image.
 *
 * This runs server-side for one reason: the S3 bucket serves no CORS headers,
 * so a browser canvas reading those pixels would taint and throw. Fetching from
 * the server sidesteps that entirely, and the answer caches well because the
 * featured post changes rarely.
 */
import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 20 * 1024 * 1024;

// Downscale before sampling. An average over a 256px-wide thumbnail is
// indistinguishable from one over the full image, and it keeps the raw buffer
// under a megabyte no matter what gets uploaded.
const SAMPLE_EDGE = 256;

// Mirrors the remotePatterns in next.config.js. Without an allowlist this route
// would be an open image proxy pointed at anything on the network.
const ALLOWED_HOSTS = new Set(['images.unsplash.com', 'picsum.photos']);
const ALLOWED_HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/;

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  return ALLOWED_HOSTS.has(h) || ALLOWED_HOST_RE.test(h);
}

/** sRGB channel -> linear light, per WCAG 2.x. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function clamp01(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const raw = params.get('url');

  if (!raw) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'malformed url' }, { status: 400 });
  }

  if (target.protocol !== 'https:' || !hostAllowed(target.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 400 });
  }

  // The region the text occupies, in normalised container coordinates. The
  // client measures its own heading and sends it; the defaults cover the
  // left-aligned, vertically-centred title if it cannot.
  const rx = clamp01(Number(params.get('x')), 0);
  const ry = clamp01(Number(params.get('y')), 0.32);
  const rw = clamp01(Number(params.get('w')), 0.62);
  const rh = clamp01(Number(params.get('h')), 0.36);

  // Container aspect ratio, needed to reproduce object-cover's crop.
  const ar = Number(params.get('ar'));
  const containerAspect = Number.isFinite(ar) && ar > 0 ? ar : 16 / 9;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    }).finally(() => clearTimeout(timer));

    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }

    const declared = Number(upstream.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      return NextResponse.json({ error: 'image too large' }, { status: 413 });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'image too large' }, { status: 413 });
    }

    // .rotate() with no argument applies the EXIF orientation, so width/height
    // below are the dimensions as displayed rather than as stored.
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize({ width: SAMPLE_EDGE, height: SAMPLE_EDGE, fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: iw, height: ih, channels } = info;

    // Reproduce object-cover: scale so the image fills the container, centre it,
    // and crop the overflow. Only the visible window can sit behind the text.
    const scale = Math.max(containerAspect / iw, 1 / ih);
    const visibleW = Math.min(iw, containerAspect / scale);
    const visibleH = Math.min(ih, 1 / scale);
    const originX = (iw - visibleW) / 2;
    const originY = (ih - visibleH) / 2;

    const x0 = Math.max(0, Math.floor(originX + rx * visibleW));
    const y0 = Math.max(0, Math.floor(originY + ry * visibleH));
    const x1 = Math.min(iw, Math.ceil(x0 + Math.max(1, rw * visibleW)));
    const y1 = Math.min(ih, Math.ceil(y0 + Math.max(1, rh * visibleH)));

    let sum = 0;
    let count = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * iw + x) * channels;
        sum += 0.2126 * toLinear(data[i]) + 0.7152 * toLinear(data[i + 1]) + 0.0722 * toLinear(data[i + 2]);
        count++;
      }
    }

    if (count === 0) {
      return NextResponse.json({ error: 'empty sample region' }, { status: 422 });
    }

    const luminance = sum / count;
    const againstWhite = contrastRatio(luminance, 1);
    const againstBlack = contrastRatio(luminance, 0);

    // Whichever text colour wins on contrast wins outright. The crossover sits
    // near L=0.18, not 0.5 -- white text holds up over a surprisingly bright
    // background before black overtakes it.
    const tone = againstBlack >= againstWhite ? 'dark' : 'light';

    return NextResponse.json(
      {
        tone,
        luminance: Number(luminance.toFixed(4)),
        contrast: Number(Math.max(againstWhite, againstBlack).toFixed(2)),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        },
      },
    );
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      { error: aborted ? 'upstream timeout' : 'sampling failed' },
      { status: aborted ? 504 : 500 },
    );
  }
}
