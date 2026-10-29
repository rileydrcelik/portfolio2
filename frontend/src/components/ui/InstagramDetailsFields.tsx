'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { InstagramDetails } from '@/lib/api';

/** Pre-filled on every new photo going to Instagram; edit them per post. */
export const DEFAULT_INSTAGRAM_HASHTAGS = ['photography', 'sonyalpha', 'lightroom'];

// Instagram's own limit.
const MAX_HASHTAGS = 30;

/** The form's copy of the details. */
export interface InstagramDetailsValue {
  hashtags: string[];
}

export function instagramDetailsValue(post?: Partial<InstagramDetails> | null): InstagramDetailsValue {
  const hashtags = post?.instagram_hashtags ?? [];
  return {
    hashtags: hashtags.length ? hashtags : DEFAULT_INSTAGRAM_HASHTAGS,
  };
}

/** Instagram ends a hashtag at the first character that isn't a letter, digit or underscore. */
function cleanHashtag(tag: string): string {
  return tag.replace(/[^\p{L}\p{N}_]/gu, '');
}

/** The details as a post create/update payload. */
export function instagramDetailsPayload(value: InstagramDetailsValue): InstagramDetails {
  return { instagram_hashtags: value.hashtags };
}

interface ChipInputProps {
  label: string;
  hint: string;
  values: string[];
  onChange: (values: string[]) => void;
  clean: (raw: string) => string;
  prefix: string;
  max: number;
  placeholder: string;
}

/** Type and press Enter, comma or space to add; Backspace on empty removes the last. */
function ChipInput({ label, hint, values, onChange, clean, prefix, max, placeholder }: ChipInputProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commit = (raw: string) => {
    const next = [...values];
    for (const piece of raw.split(/[\s,]+/)) {
      const item = clean(piece);
      if (!item) continue;
      if (next.some((v) => v.toLowerCase() === item.toLowerCase())) continue;
      if (next.length >= max) {
        setError(`Instagram allows ${max} at most`);
        break;
      }
      next.push(item);
    }
    onChange(next);
    setDraft('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-white/90 mb-2">{label}</label>
      <div className="flex flex-wrap items-center gap-2 p-2 border border-white/30 bg-white/10 rounded-lg focus-within:ring-2 focus-within:ring-white/50">
        {values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 text-sm text-white bg-white/15 rounded-md">
            {prefix}{value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="p-0.5 rounded hover:bg-white/20"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {values.length < max && (
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setError(null);
              const text = e.target.value;
              if (/[\s,]$/.test(text)) commit(text);
              else setDraft(text);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit(draft);
              } else if (e.key === 'Backspace' && !draft && values.length) {
                onChange(values.slice(0, -1));
              }
            }}
            // A tag typed but not yet entered still counts when the form is saved.
            onBlur={() => draft && commit(draft)}
            className="flex-1 min-w-[8rem] p-1 bg-transparent text-white placeholder-white/50 focus:outline-none"
            placeholder={values.length ? '' : placeholder}
          />
        )}
      </div>
      <p className={`mt-1 text-xs ${error ? 'text-red-300' : 'text-white/50'}`}>{error ?? hint}</p>
    </div>
  );
}

interface InstagramDetailsFieldsProps {
  value: InstagramDetailsValue;
  onChange: (patch: Partial<InstagramDetailsValue>) => void;
}

/** Hashtags for a post going to Instagram. */
export default function InstagramDetailsFields({ value, onChange }: InstagramDetailsFieldsProps) {
  return (
    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <p className="text-white font-medium">Instagram details</p>

      <ChipInput
        label="Hashtags"
        hint="Added after the Aiko link. A few specific tags beat many generic ones."
        values={value.hashtags}
        onChange={(hashtags) => onChange({ hashtags })}
        clean={cleanHashtag}
        prefix="#"
        max={MAX_HASHTAGS}
        placeholder="photography"
      />
    </div>
  );
}
