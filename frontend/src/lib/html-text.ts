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
    // Closing `li` and the list wrappers break lines too, not just the opening
    // tags handled above. Without this, whatever follows a list runs into its
    // final item — "bagel" + "also apples" renders as "bagelalso apples".
    // Empty lines are filtered further down, so the extra break costs nothing.
    .replace(/<\/(p|div|h[1-6]|blockquote|pre|li|ul|ol)>/gi, '\n')
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

/**
 * A multi-line preview for a feed card: keeps the body's line structure and its
 * bullet/checkbox markers, unlike `noteExcerpt` which flattens everything to one
 * run-on line. A bulleted note read as "eggs milk bread" instead of a list,
 * which is worse than useless — it misrepresents what the note is.
 *
 * Render with `white-space: pre-line` so the newlines survive to the page.
 *
 * Reports whether it clipped anything, because a card has to say so — a
 * truncated note that looks complete misrepresents itself, and with a list or a
 * checklist the visible part can read as the whole thing.
 */
export function notePreview(
  html: string,
  maxLines = 8,
  maxLength = 320,
): { text: string; truncated: boolean } {
  const text = htmlToPlainText(html);
  if (!text) return { text: '', truncated: false };

  const allLines = text.split('\n');
  const lines = allLines.slice(0, maxLines);
  let out = lines.join('\n');
  // Either limit can clip: too many lines, or too many characters.
  let truncated = allLines.length > maxLines;

  if (out.length > maxLength) {
    const clipped = out.slice(0, maxLength);
    const cut = Math.max(clipped.lastIndexOf(' '), clipped.lastIndexOf('\n'));
    out = clipped.slice(0, cut > 0 ? cut : maxLength).trimEnd();
    truncated = true;
  }

  return { text: truncated ? `${out}…` : out, truncated };
}
