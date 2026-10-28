import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Underline, Link2, X } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'kcoffee.entity_notes.v1';

export const TEXT_COLOR_PRESETS: Array<{ id: string; label: string; hex: string }> = [
  { id: 'blue', label: 'Xanh dương (Blue)', hex: '#3b82f6' },
  { id: 'emerald', label: 'Xanh lá (Emerald)', hex: '#10b981' },
  { id: 'amber', label: 'Vàng hổ phách (Amber)', hex: '#f59e0b' },
  { id: 'rose', label: 'Đỏ hồng (Rose)', hex: '#f43f5e' },
  { id: 'violet', label: 'Tím hoa cà (Violet)', hex: '#8b5cf6' },
  { id: 'cyan', label: 'Xanh ngọc (Cyan)', hex: '#06b6d4' },
];

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
};

interface RichSpan {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  link?: string;
}

/**
 * Parses markdown formatting tokens ([color], <u>, ***, **, *, [link](url)) into plain text + RichSpan[]
 */
function parseMarkdownToTextAndSpans(raw: string): { plainText: string; spans: RichSpan[] } {
  if (!raw) return { plainText: '', spans: [] };

  let plain = '';
  const charStyles: Array<{
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    link?: string;
  }> = [];

  function walk(
    text: string,
    currentStyle: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
      link?: string;
    }
  ) {
    const tokenRegex =
      /(\[color:([a-zA-Z0-9#]+)\]([\s\S]*?)\[\/color\])|(<u>([\s\S]*?)<\/u>)|(\*\*\*([\s\S]+?)\*\*\*)|(\*\*([\s\S]+?)\*\*)|(\*([\s\S]+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;

    while ((m = tokenRegex.exec(text)) !== null) {
      if (m.index > lastIdx) {
        const chunk = text.slice(lastIdx, m.index);
        for (const ch of chunk) {
          plain += ch;
          charStyles.push({ ...currentStyle });
        }
      }
      if (m[1]) {
        walk(m[3], { ...currentStyle, color: m[2] });
      } else if (m[4]) {
        walk(m[5], { ...currentStyle, underline: true });
      } else if (m[6]) {
        walk(m[7], { ...currentStyle, bold: true, italic: true });
      } else if (m[8]) {
        walk(m[9], { ...currentStyle, bold: true });
      } else if (m[10]) {
        walk(m[11], { ...currentStyle, italic: true });
      } else if (m[12]) {
        walk(m[13], { ...currentStyle, link: m[14] });
      }
      lastIdx = m.index + m[0].length;
    }

    if (lastIdx < text.length) {
      const chunk = text.slice(lastIdx);
      for (const ch of chunk) {
        plain += ch;
        charStyles.push({ ...currentStyle });
      }
    }
  }

  walk(raw, {});

  const spans: RichSpan[] = [];
  let cur: RichSpan | null = null;
  for (let i = 0; i < charStyles.length; i++) {
    const s = charStyles[i];
    const hasStyle = s.bold || s.italic || s.underline || s.color || s.link;
    if (!hasStyle) {
      if (cur) {
        spans.push(cur);
        cur = null;
      }
      continue;
    }

    const same =
      cur &&
      cur.bold === s.bold &&
      cur.italic === s.italic &&
      cur.underline === s.underline &&
      cur.color === s.color &&
      cur.link === s.link;

    if (same && cur) {
      cur.end = i + 1;
    } else {
      if (cur) spans.push(cur);
      cur = {
        start: i,
        end: i + 1,
        bold: s.bold,
        italic: s.italic,
        underline: s.underline,
        color: s.color,
        link: s.link,
      };
    }
  }
  if (cur) spans.push(cur);

  return { plainText: plain, spans };
}

/**
 * Adjust character-range spans when plain text changes
 */
function adjustSpansForTextEdit(
  spans: RichSpan[],
  oldText: string,
  newText: string
): RichSpan[] {
  if (!spans.length || !newText) return [];
  if (oldText === newText) return spans;

  let prefixLen = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
    prefixLen++;
  }

  let oldSuffix = oldText.length;
  let newSuffix = newText.length;
  while (
    oldSuffix > prefixLen &&
    newSuffix > prefixLen &&
    oldText[oldSuffix - 1] === newText[newSuffix - 1]
  ) {
    oldSuffix--;
    newSuffix--;
  }

  const delta = newText.length - oldText.length;

  return spans
    .map((sp) => {
      let s = sp.start;
      let e = sp.end;

      if (e <= prefixLen) return sp;
      if (s >= oldSuffix) return { ...sp, start: s + delta, end: e + delta };
      if (s > prefixLen) s = Math.max(prefixLen, s + delta);
      e = Math.max(s, e + delta);
      return { ...sp, start: s, end: e };
    })
    .filter((sp) => sp.end > sp.start);
}

/**
 * Serialize plain text + RichSpan[] into Markdown string
 */
function serializeTextWithRichSpans(text: string, spans: RichSpan[]): string {
  if (!text || spans.length === 0) return text;

  const points = new Set<number>([0, text.length]);
  spans.forEach((sp) => {
    points.add(Math.max(0, Math.min(text.length, sp.start)));
    points.add(Math.max(0, Math.min(text.length, sp.end)));
  });
  const sorted = Array.from(points).sort((a, b) => a - b);

  let out = '';
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i];
    const segEnd = sorted[i + 1];
    if (segEnd <= segStart) continue;
    const rawSeg = text.slice(segStart, segEnd);
    if (!rawSeg) continue;

    const active = spans.filter((sp) => sp.start <= segStart && sp.end >= segEnd);
    if (active.length === 0) {
      out += rawSeg;
      continue;
    }

    const isBold = active.some((a) => a.bold);
    const isItalic = active.some((a) => a.italic);
    const isUnderline = active.some((a) => a.underline);
    const colorSpan = [...active].reverse().find((a) => a.color);
    const linkSpan = [...active].reverse().find((a) => a.link);

    let formatted = rawSeg;
    if (isBold && isItalic) formatted = `***${formatted}***`;
    else if (isBold) formatted = `**${formatted}**`;
    else if (isItalic) formatted = `*${formatted}*`;
    if (isUnderline) formatted = `<u>${formatted}</u>`;
    if (colorSpan?.color) formatted = `[color:${colorSpan.color}]${formatted}[/color]`;
    if (linkSpan?.link) formatted = `[${formatted}](${linkSpan.link})`;

    out += formatted;
  }

  return out;
}

const getCachedNote = (entityType: string, entityId: string): string => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed[`${entityType}:${entityId}`] === 'string'
      ? parsed[`${entityType}:${entityId}`]
      : '';
  } catch {
    return '';
  }
};

const setCachedNote = (entityType: string, entityId: string, note: string) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[`${entityType}:${entityId}`] = note;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
};

/**
 * Render parsed markdown node elements for view mode
 */
function renderMarkdownTokens(raw: string): React.ReactNode {
  if (!raw) return null;

  const tokenRegex =
    /(\[color:([a-zA-Z0-9#]+)\]([\s\S]*?)\[\/color\])|(<u>([\s\S]*?)<\/u>)|(\*\*\*([\s\S]+?)\*\*\*)|(\*\*([\s\S]+?)\*\*)|(\*([\s\S]+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(raw.slice(lastIndex, match.index));
    }
    const key = `token-${idx++}`;

    if (match[1]) {
      const colorHex = COLOR_MAP[match[2].toLowerCase()] || match[2];
      nodes.push(
        <span key={key} style={{ color: colorHex }} className="font-semibold">
          {renderMarkdownTokens(match[3])}
        </span>
      );
    } else if (match[4]) {
      nodes.push(
        <u key={key} className="underline underline-offset-2">
          {renderMarkdownTokens(match[5])}
        </u>
      );
    } else if (match[6]) {
      nodes.push(
        <strong key={key} className="font-bold">
          <em className="italic">{renderMarkdownTokens(match[7])}</em>
        </strong>
      );
    } else if (match[8]) {
      nodes.push(
        <strong key={key} className="font-bold">
          {renderMarkdownTokens(match[9])}
        </strong>
      );
    } else if (match[10]) {
      nodes.push(
        <em key={key} className="italic">
          {renderMarkdownTokens(match[11])}
        </em>
      );
    } else if (match[12]) {
      const href = match[14];
      const safeHref =
        href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/')
          ? href
          : `https://${href}`;
      nodes.push(
        <a
          key={key}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline font-semibold cursor-pointer"
        >
          {match[13]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    nodes.push(raw.slice(lastIndex));
  }

  return nodes;
}

interface EntityNoteCellProps {
  entityId: string;
  entityType: 'project' | 'campaign';
  workspaceId?: string | null;
  canEdit?: boolean;
  className?: string;
  alignCenter?: boolean;
}

export const EntityNoteCell: React.FC<EntityNoteCellProps> = ({
  entityId,
  entityType,
  workspaceId,
  canEdit = true,
  className = '',
  alignCenter = true,
}) => {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  const [rawNote, setRawNote] = useState<string>(() => getCachedNote(entityType, entityId));
  const [isEditing, setIsEditing] = useState(false);

  // Edit buffer
  const [plainText, setPlainText] = useState('');
  const [richSpans, setRichSpans] = useState<RichSpan[]>([]);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);

  // Floating toolbar states
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState('');
  const [showColorMenu, setShowColorMenu] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);

  // Sync cache and fetch activity_log on mount or when entity changes
  useEffect(() => {
    const cached = getCachedNote(entityType, entityId);
    setRawNote(cached);

    let active = true;
    void supabase
      .from('activity_log')
      .select('metadata, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('action', 'entity_note')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const remoteNote = typeof data.metadata?.note === 'string' ? data.metadata.note : '';
        if (remoteNote !== cached) {
          setRawNote(remoteNote);
          setCachedNote(entityType, entityId, remoteNote);
        }
      });

    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  // When opening edit mode: parse current markdown note into plain text and spans
  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canEdit) return;

      const { plainText: parsedPlain, spans: parsedSpans } = parseMarkdownToTextAndSpans(rawNote);
      setPlainText(parsedPlain);
      setRichSpans(parsedSpans);
      setSelectionRange(null);
      setBubblePos(null);
      setShowLinkInput(false);
      setShowColorMenu(false);
      setIsEditing(true);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    },
    [canEdit, rawNote]
  );

  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const serialized = serializeTextWithRichSpans(plainText, richSpans).trim();
    setIsEditing(false);
    setSelectionRange(null);
    setBubblePos(null);
    setShowLinkInput(false);
    setShowColorMenu(false);

    if (serialized === rawNote) {
      isSavingRef.current = false;
      return;
    }

    setRawNote(serialized);
    setCachedNote(entityType, entityId, serialized);

    try {
      const { error } = await supabase.from('activity_log').insert({
        workspace_id: workspaceId || null,
        user_id: profile?.id || null,
        entity_type: entityType,
        entity_id: entityId,
        action: 'entity_note',
        metadata: { note: serialized },
      });

      if (!error) {
        toast.success(t('projects.noteSaved'));
      }
    } catch (err) {
      console.warn('Failed to sync note to activity_log:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [plainText, richSpans, rawNote, entityType, entityId, workspaceId, profile?.id, t]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setSelectionRange(null);
    setBubblePos(null);
    setShowLinkInput(false);
    setShowColorMenu(false);
  }, []);

  // Update selection range & floating toolbar position
  const checkSelection = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const s = el.selectionStart ?? 0;
    const e = el.selectionEnd ?? 0;

    if (e > s) {
      setSelectionRange({ start: s, end: e });
      const rect = el.getBoundingClientRect();
      const left = Math.max(12, Math.min(window.innerWidth - 260, rect.left + (rect.width / 2) - 120));
      const top = Math.max(10, rect.top - 46);
      setBubblePos({ top, left });
    } else {
      setSelectionRange(null);
      setBubblePos(null);
      setShowLinkInput(false);
      setShowColorMenu(false);
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextText = e.target.value;
    setRichSpans((prev) => adjustSpansForTextEdit(prev, plainText, nextText));
    setPlainText(nextText);
  };

  const applyFormatting = useCallback(
    (toolId: 'bold' | 'italic' | 'underline' | 'color' | 'link', extraArg?: string) => {
      const el = inputRef.current;
      if (!el || !selectionRange) return;
      const { start, end } = selectionRange;
      if (end <= start) return;

      setRichSpans((prev) => {
        const existingIdx = prev.findIndex((s) => s.start === start && s.end === end);

        if (toolId === 'bold' || toolId === 'italic' || toolId === 'underline') {
          if (existingIdx >= 0) {
            const updated = [...prev];
            const curr = { ...updated[existingIdx] };
            curr[toolId] = !curr[toolId];
            updated[existingIdx] = curr;
            return updated;
          }
          return [...prev, { start, end, [toolId]: true }];
        }

        if (toolId === 'color') {
          const colorName = extraArg || 'blue';
          if (existingIdx >= 0) {
            const updated = [...prev];
            const curr = { ...updated[existingIdx] };
            curr.color = curr.color === colorName ? undefined : colorName;
            updated[existingIdx] = curr;
            return updated;
          }
          return [...prev, { start, end, color: colorName }];
        }

        if (toolId === 'link') {
          const rawUrl = (extraArg || 'https://').trim();
          const url =
            rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/')
              ? rawUrl
              : `https://${rawUrl}`;
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], link: url };
            return updated;
          }
          return [...prev, { start, end, link: url }];
        }

        return prev;
      });

      setShowLinkInput(false);
      setShowColorMenu(false);

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, end);
      });
    },
    [selectionRange]
  );

  const activeFormats = {
    bold: Boolean(richSpans.some((s) => selectionRange && s.start <= selectionRange.start && s.end >= selectionRange.end && s.bold)),
    italic: Boolean(richSpans.some((s) => selectionRange && s.start <= selectionRange.start && s.end >= selectionRange.end && s.italic)),
    underline: Boolean(richSpans.some((s) => selectionRange && s.start <= selectionRange.start && s.end >= selectionRange.end && s.underline)),
  };

  if (isEditing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full h-full min-w-0 grid items-center ${alignCenter ? 'text-center' : ''} ${className}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={plainText}
          onChange={handleTextChange}
          onSelect={checkSelection}
          onMouseUp={checkSelection}
          onKeyUp={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              void handleSave();
              return;
            }
            checkSelection();
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && selectionRange) {
              if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                applyFormatting('bold');
              } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                applyFormatting('italic');
              } else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                applyFormatting('underline');
              } else if (e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                setShowLinkInput(true);
              }
            }
          }}
          onBlur={(e) => {
            // If blurring because clicking inside the floating portal toolbar, don't close!
            const related = e.relatedTarget as Node | null;
            if (toolbarRef.current && related && toolbarRef.current.contains(related)) {
              return;
            }
            void handleSave();
          }}
          placeholder={t('projects.notePlaceholder')}
          className={`bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 m-0 w-full text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 placeholder:italic ${alignCenter ? 'text-center' : ''}`}
        />

        {/* Floating Bubble Toolbar Portal (rendered on document.body to avoid table overflow-hidden clipping) */}
        {bubblePos &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={toolbarRef}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: 'fixed',
                top: `${bubblePos.top}px`,
                left: `${bubblePos.left}px`,
                zIndex: 99999,
              }}
              className="bg-slate-900/95 text-white border border-slate-700/90 rounded-xl px-2 py-1 shadow-2xl backdrop-blur-xs animate-in fade-in zoom-in-95 duration-100"
            >
              {showLinkInput ? (
                <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 py-0.5">
                  <input
                    type="text"
                    value={linkUrlDraft}
                    onChange={(e) => setLinkUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyFormatting('link', linkUrlDraft || 'https://');
                        setLinkUrlDraft('');
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowLinkInput(false);
                      }
                    }}
                    placeholder="https://..."
                    autoFocus
                    className="bg-slate-800 text-white text-xs px-2 py-1 rounded-md outline-none border border-slate-600 focus:border-primary w-44"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormatting('link', linkUrlDraft || 'https://');
                      setLinkUrlDraft('');
                    }}
                    className="px-2 py-1 rounded-md bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold transition-colors"
                  >
                    Gắn link
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowLinkInput(false);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-md"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-flow-col auto-cols-max items-center gap-0.5 relative">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormatting('bold');
                    }}
                    className={`p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
                      activeFormats.bold ? 'bg-primary text-white' : ''
                    }`}
                    title="In đậm (Ctrl+B)"
                  >
                    <Bold size={13} strokeWidth={2.8} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormatting('italic');
                    }}
                    className={`p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
                      activeFormats.italic ? 'bg-primary text-white' : ''
                    }`}
                    title="Chữ nghiêng (Ctrl+I)"
                  >
                    <Italic size={13} strokeWidth={2.6} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormatting('underline');
                    }}
                    className={`p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
                      activeFormats.underline ? 'bg-primary text-white' : ''
                    }`}
                    title="Gạch chân (Ctrl+U)"
                  >
                    <Underline size={13} strokeWidth={2.6} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowLinkInput(true);
                      setShowColorMenu(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Gắn link (Ctrl+K)"
                  >
                    <Link2 size={13} strokeWidth={2.6} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowColorMenu((prev) => !prev);
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Màu chữ"
                  >
                    <span className="font-extrabold text-xs px-0.5 border-b-2 border-primary leading-none">
                      A
                    </span>
                  </button>

                  {/* Color Preset Palette */}
                  {showColorMenu && (
                    <div className="absolute bottom-full right-0 mb-2 grid grid-flow-col auto-cols-max items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-xl z-[100000]">
                      {TEXT_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.label}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyFormatting('color', preset.id);
                          }}
                          className="w-4 h-4 rounded-full border border-white/30 transition-transform hover:scale-125 cursor-pointer"
                          style={{ backgroundColor: preset.hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>,
            document.body
          )}
      </div>
    );
  }

  // Non-editing view mode: click to type directly
  return (
    <div
      onClick={(e) => {
        if (canEdit) {
          handleStartEdit(e);
        }
      }}
      className={`group/note relative w-full h-full min-w-0 py-1.5 px-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-100/70 dark:hover:bg-slate-800/60 ${alignCenter ? 'text-center' : ''} ${className}`}
      title={rawNote ? undefined : canEdit ? t('projects.notePlaceholder') : undefined}
    >
      {rawNote ? (
        <span className={`block truncate text-xs text-gray-700 dark:text-gray-300 font-normal leading-relaxed ${alignCenter ? 'text-center mx-auto' : ''}`}>
          {renderMarkdownTokens(rawNote)}
        </span>
      ) : (
        canEdit && (
          <span className={`opacity-0 group-hover/note:opacity-100 block truncate text-xs text-gray-400 dark:text-gray-500 italic transition-opacity ${alignCenter ? 'text-center mx-auto' : ''}`}>
            {t('projects.notePlaceholder')}
          </span>
        )
      )}
    </div>
  );
};
