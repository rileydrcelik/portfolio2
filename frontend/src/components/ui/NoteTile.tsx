'use client';

/**
 * Feed card for a note. Notes are text-first — there is no image to lead with —
 * so the card is typographic: title, a flattened excerpt of the rich-text body,
 * and the date it was last edited (which is also its sort key in the feed).
 */

import { notePreview } from '@/lib/html-text';

interface NoteTileProps {
  item: {
    id: string;
    title: string;
    description: string;
    // The note body's sanitized HTML. Text posts store content inline rather
    // than as an S3 URL — the excerpt is derived from it, never rendered raw.
    contentUrl?: string;
    date?: string;
    isFavorite?: boolean;
  };
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NoteTile({ item }: NoteTileProps) {
  // Prefer an explicit description if one was ever set; otherwise derive the
  // preview from the body, the same way the notes app renders its own previews.
  const description = item.description?.trim();
  const preview = notePreview(item.contentUrl || '');
  const excerpt = description || preview.text;
  // Only the derived preview knows whether it clipped the body; an explicit
  // description is authored copy and stands on its own.
  const continues = !description && preview.truncated;
  const date = formatDate(item.date);

  return (
    <div className="group cursor-pointer h-full">
      <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 to-black shadow-lg transition-all duration-300 group-hover:border-white/25 group-hover:shadow-xl">
        <div className="flex h-full flex-col p-6 text-white">
          <h3 className="text-lg font-semibold leading-snug line-clamp-3">
            {item.title}
          </h3>

          {excerpt && (
            <div className="relative mt-3 flex-1 overflow-hidden">
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/60 line-clamp-[8]">
                {excerpt}
              </p>
              {/* Fade the last line into the card so a clipped note reads as
                  clipped. The CSS clamp can cut mid-line independently of the
                  string-level truncation, so the cue is visual, not just an
                  ellipsis in the text. */}
              {continues && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black to-transparent" />
              )}
            </div>
          )}

          <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
            {date ? (
              <span className="text-xs uppercase tracking-wide text-white/40">{date}</span>
            ) : (
              <span />
            )}
            {continues && (
              <span className="text-xs font-medium text-white/50 transition-colors group-hover:text-white/80">
                Read more
              </span>
            )}
          </div>
        </div>

        {item.isFavorite && (
          <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-white/70" />
        )}
      </div>
    </div>
  );
}
