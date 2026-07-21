/**
 * Flatten a note's rich-text HTML body into plain text for feed-card excerpts.
 *
 * Ported deliberately from w_notes' own `src/lib/html-text.ts` so a note's
 * preview on the website reads the same as its preview in the app. Keep the two
 * in sync if the editor's tag subset changes.
 *
 * Runs on the server during SSR as well as in the browser, so it is pure string
 * work rather than DOM parsing.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    // Checkbox lists first, while the `data-type="checkbox"` wrapper is intact,
    // so their items get a box (☑/☐) instead of a plain bullet.
    .replace(/<ul\b[^>]*\bdata-type=["']?checkbox["']?[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) =>
      inner.replace(/<li\b[^>]*\bchecked\b[^>]*>/gi, '\n☑ ').replace(/<li\b[^>]*>/gi, '\n☐ '),
    )
    // Remaining (bulleted/ordered) list items get a bullet. Each starts a line.
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|blockquote|pre)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // `&amp;` goes last, always. Decoding it first would turn `&amp;lt;` — the
    // escaped form of the literal text "&lt;" — into `&lt;`, which the rules
    // above would then decode a second time into "<".
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

/** A single-paragraph excerpt for a feed card, truncated on a word boundary. */
export function noteExcerpt(html: string, maxLength = 220): string {
  const text = htmlToPlainText(html).replace(/\n+/g, ' ');
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}
