'use client';

import { useState, useRef, ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Italic,
  Heading2,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Code,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  placeholder?: string;
  disabled?: boolean;
}

type EditorTab = 'write' | 'preview';

const ensureProtocol = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/,'')}`;
};

export default function MarkdownEditor({
  value,
  onChange,
  onUploadImage,
  placeholder = 'Start writing your story...'
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('write');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const updateSelection = (start: number, end: number) => {
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, end);
      }
    });
  };

  const replaceSelection = (replacement: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const nextValue = `${before}${replacement}${after}`;
    onChange(nextValue);
    const cursorPosition = before.length + replacement.length;
    updateSelection(cursorPosition, cursorPosition);
  };

  const wrapSelection = (prefix: string, suffix = prefix) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = value.slice(start, end) || 'text';
    const before = value.slice(0, start);
    const after = value.slice(end);
    const nextValue = `${before}${prefix}${selected}${suffix}${after}`;
    onChange(nextValue);
    const selectionStart = start + prefix.length;
    const selectionEnd = selectionStart + selected.length;
    updateSelection(selectionStart, selectionEnd);
  };

  const insertHeading = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);
    const headingPrefix = after.startsWith('## ') ? '' : '## ';
    const nextValue = `${before}${headingPrefix}${after}`;
    onChange(nextValue);
    const newCursor = lineStart + headingPrefix.length;
    updateSelection(newCursor, newCursor);
  };

  const handleAddLink = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = value.slice(start, end) || 'link text';
    const urlInput = window.prompt('Enter URL for hyperlink:');
    if (!urlInput) return;
    const url = ensureProtocol(urlInput);
    if (!url) return;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const markdown = `[${selected}](${url})`;
    const nextValue = `${before}${markdown}${after}`;
    onChange(nextValue);
    const cursor = before.length + markdown.length;
    updateSelection(cursor, cursor);
  };

  const handleToolbarImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const url = await onUploadImage(file);
      const alt = window.prompt('Alt text for image:', file.name.replace(/\.[^/.]+$/, '')) || 'image';
      const markdown = `![${alt}](${url})`;
      replaceSelection(markdown);
    } catch (err) {
      console.error('[MarkdownEditor] Image upload failed:', err);
      window.alert(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const appendListPrefix = (prefix: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = value.slice(start, end);

    const lines = selected.split('\n');
    const transformed = lines
      .map((line, index) => {
        if (!line.trim()) return line;
        if (prefix === 'numbered') {
          return `${index + 1}. ${line.replace(/^\d+\.\s+/, '')}`;
        }
        return `- ${line.replace(/^-\s+/, '')}`;
      })
      .join('\n');

    const before = value.slice(0, start);
    const after = value.slice(end);
    const nextValue = `${before}${transformed}${after}`;
    onChange(nextValue);
    updateSelection(start, start + transformed.length);
  };

  const handleQuote = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = value.slice(start, end) || 'Quote';
    const before = value.slice(0, start);
    const after = value.slice(end);
    const quoteBlock = selected
      .split('\n')
      .map((line) => `> ${line || ''}`)
      .join('\n');
    const nextValue = `${before}${quoteBlock}${after}`;
    onChange(nextValue);
    updateSelection(start, start + quoteBlock.length);
  };

  const handleCodeBlock = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = value.slice(start, end) || 'code here';
    const before = value.slice(0, start);
    const after = value.slice(end);
    const block = `\n\n\`\`\`\n${selected}\n\`\`\`\n\n`;
    const nextValue = `${before}${block}${after}`;
    onChange(nextValue);
    const cursor = before.length + block.length;
    updateSelection(cursor, cursor);
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'write' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'preview' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-1 text-white/70 text-sm">
          <span>Supports Markdown •</span>
          <a
            href="https://www.markdownguide.org/basic-syntax/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
          >
            Syntax Reference
          </a>
        </div>
      </div>

      {activeTab === 'write' && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2 text-white/70">
            <button
              type="button"
              onClick={() => wrapSelection('**')}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection('*')}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={insertHeading}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleAddLink}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToolbarImageClick}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isUploadingImage}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => appendListPrefix('bullet')}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => appendListPrefix('numbered')}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleQuote}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCodeBlock}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Code className="h-4 w-4" />
            </button>
            {isUploadingImage && (
              <span className="text-xs text-white/60">Uploading image…</span>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelection}
            />
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="min-h-[320px] w-full resize-y bg-transparent px-4 py-4 text-base text-white placeholder-white/30 focus:outline-none"
          />
        </>
      )}

      {activeTab === 'preview' && (
        <div className="max-h-[480px] overflow-y-auto px-6 py-6 prose prose-invert prose-headings:font-serif prose-p:text-white/80">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-white/50">Start writing in the editor to see a preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
