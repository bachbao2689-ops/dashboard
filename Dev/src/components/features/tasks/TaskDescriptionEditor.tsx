import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link2,
  X,
  Save,
  Columns2,
  Columns3,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import {
  parseDescriptionToBlocks,
  serializeBlocksToDescription,
  type DescriptionBlock,
} from './taskDescriptionTypes';
import { useTranslation } from '../../../i18n/translations';
import {
  COMMENT_COLOR_MAP,
  CommentImagePreviewModal,
  isImageAttachment,
} from '../comments/RichCommentBody';
import '../../../styles/task-comments.css';

interface TaskDescriptionEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onSave?: (serializedValue?: string) => void;
  onCancel?: () => void;
  saving?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export interface RichSpan {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  link?: string;
}

export interface AttachmentChip {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
  sizeLabel?: string;
}

export interface ColumnData {
  text: string;
  spans: RichSpan[];
  attachments: AttachmentChip[];
}

export interface RichBlock {
  id: string;
  type: 'text' | 'columns';
  text?: string;
  spans?: RichSpan[];
  attachments?: AttachmentChip[];
  columnCount?: 2 | 3;
  columns?: ColumnData[];
}

interface SelectionTarget {
  blockIndex: number;
  colIndex?: number;
  start: number;
  end: number;
}

interface BubbleToolItem {
  id: 'bold' | 'italic' | 'underline' | 'link' | 'color';
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const BUBBLE_TOOLS: BubbleToolItem[] = [
  {
    id: 'bold',
    label: 'Bold (In đậm)',
    shortcut: 'Ctrl+B / ⌘B',
    icon: <Bold size={14} strokeWidth={2.6} />,
  },
  {
    id: 'italic',
    label: 'Italic (Chữ nghiêng)',
    shortcut: 'Ctrl+I / ⌘I',
    icon: <Italic size={14} strokeWidth={2.4} />,
  },
  {
    id: 'underline',
    label: 'Underline (Gạch chân)',
    shortcut: 'Ctrl+U / ⌘U',
    icon: <Underline size={14} strokeWidth={2.4} />,
  },
  {
    id: 'link',
    label: 'Add link (Chèn link)',
    shortcut: 'Ctrl+K / ⌘K',
    icon: <Link2 size={14} strokeWidth={2.4} />,
  },
  {
    id: 'color',
    label: 'Text color (Màu chữ)',
    shortcut: 'Chọn màu chữ',
    icon: (
      <span className="inline-flex flex-col items-center leading-none font-serif font-bold text-[12px]">
        <span>A</span>
        <span className="w-3.5 h-0.5 rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-rose-400 mt-0.5" />
      </span>
    ),
  },
];

const TEXT_COLOR_PRESETS = [
  { id: 'blue', label: 'Xanh dương', hex: COMMENT_COLOR_MAP.blue.hex },
  { id: 'emerald', label: 'Xanh lá', hex: COMMENT_COLOR_MAP.emerald.hex },
  { id: 'amber', label: 'Vàng cam', hex: COMMENT_COLOR_MAP.amber.hex },
  { id: 'rose', label: 'Đỏ hồng', hex: COMMENT_COLOR_MAP.rose.hex },
  { id: 'violet', label: 'Tím', hex: COMMENT_COLOR_MAP.violet.hex },
  { id: 'cyan', label: 'Xanh ngọc', hex: COMMENT_COLOR_MAP.cyan.hex },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileToCompactDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = String(reader.result || '');
      if (!file.type.startsWith('image/')) {
        resolve(result);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts attached chips [🖼️ name](url) or legacy ![image](url) from raw string
 */
function extractAttachments(raw?: string): { text: string; attachments: AttachmentChip[] } {
  if (!raw || !raw.trim()) return { text: '', attachments: [] };

  const attachments: AttachmentChip[] = [];
  const seenUrls = new Set<string>();

  const chipRegex = /\[([📎🖼️]?\s*[^\]]+)\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+|#[^\s)]+)\)/gu;
  let text = raw.replace(chipRegex, (_fullMatch, label, url) => {
    const trimmedLabel = String(label).trim();
    const isImage =
      trimmedLabel.startsWith('🖼️') ||
      isImageAttachment(trimmedLabel, url) ||
      url.includes('/storage/v1/object/public/attachments/') ||
      url.startsWith('data:image/');

    const cleanName = trimmedLabel.replace(/^[\s🖼️📎\uFE0F]+/u, '').trim() || (isImage ? 'image.png' : 'file');

    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      attachments.push({
        id: `${Date.now()}-${attachments.length}`,
        name: cleanName,
        url,
        isImage,
      });
    }
    return '';
  });

  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/g;
  text = text.replace(imgRegex, (_fullMatch, alt, url) => {
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      const fileName = url.split('/').pop()?.split('?')[0] || alt || 'image.png';
      attachments.push({
        id: `${Date.now()}-${attachments.length}`,
        name: fileName,
        url,
        isImage: true,
      });
    }
    return '';
  });

  return {
    text: text.trim(),
    attachments,
  };
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
 * Adjust character-range spans when plain text changes from oldText to newText
 */
function adjustSpansForTextEdit(spans: RichSpan[], oldText: string, newText: string): RichSpan[] {
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
    .map(sp => {
      let s = sp.start;
      let e = sp.end;

      if (e <= prefixLen) return sp;
      if (s >= oldSuffix) return { ...sp, start: s + delta, end: e + delta };
      if (s > prefixLen) s = Math.max(prefixLen, s + delta);
      e = Math.max(s, e + delta);
      return { ...sp, start: s, end: e };
    })
    .filter(sp => sp.end > sp.start);
}

/**
 * Serializes plain text + RichSpan[] into stored Markdown tokens
 */
function serializeTextWithRichSpans(text: string, spans: RichSpan[]): string {
  if (!text || spans.length === 0) return text;

  const points = new Set<number>([0, text.length]);
  spans.forEach(sp => {
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

    const active = spans.filter(sp => sp.start <= segStart && sp.end >= segEnd);
    if (active.length === 0) {
      out += rawSeg;
      continue;
    }

    const isBold = active.some(a => a.bold);
    const isItalic = active.some(a => a.italic);
    const isUnderline = active.some(a => a.underline);
    const colorSpan = [...active].reverse().find(a => a.color);
    const linkSpan = [...active].reverse().find(a => a.link);

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

/**
 * Render WYSIWYG styled segments for the live mirror layer inside the input box
 */
function renderMirrorSegments(text: string, spans: RichSpan[]): React.ReactNode {
  if (!text) return null;
  if (!spans || spans.length === 0) return text;

  const points = new Set<number>([0, text.length]);
  spans.forEach(sp => {
    points.add(Math.max(0, Math.min(text.length, sp.start)));
    points.add(Math.max(0, Math.min(text.length, sp.end)));
  });
  const sorted = Array.from(points).sort((a, b) => a - b);

  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i];
    const segEnd = sorted[i + 1];
    if (segEnd <= segStart) continue;
    const segText = text.slice(segStart, segEnd);
    const active = spans.filter(sp => sp.start <= segStart && sp.end >= segEnd);

    if (active.length === 0) {
      nodes.push(<React.Fragment key={i}>{segText}</React.Fragment>);
      continue;
    }

    const isBold = active.some(a => a.bold);
    const isItalic = active.some(a => a.italic);
    const isUnderline = active.some(a => a.underline);
    const colorSpan = [...active].reverse().find(a => a.color);
    const linkSpan = [...active].reverse().find(a => a.link);

    const colorHex = colorSpan?.color
      ? COMMENT_COLOR_MAP[colorSpan.color]?.hex || colorSpan.color
      : linkSpan?.link
      ? '#38bdf8'
      : undefined;

    nodes.push(
      <span
        key={i}
        style={{
          fontWeight: isBold ? 700 : undefined,
          fontStyle: isItalic ? 'italic' : undefined,
          textDecoration: isUnderline || linkSpan?.link ? 'underline' : undefined,
          textUnderlineOffset: isUnderline || linkSpan?.link ? '2px' : undefined,
          color: colorHex,
        }}
      >
        {segText}
      </span>
    );
  }

  return nodes;
}

/**
 * Toggle formatting on character range
 */
function toggleSpanFormat(
  spans: RichSpan[],
  textLen: number,
  start: number,
  end: number,
  toolId: 'bold' | 'italic' | 'underline' | 'color' | 'link',
  extraArg?: string
): RichSpan[] {
  if (end <= start) return spans;

  const chars: Array<{
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    link?: string;
  }> = Array.from({ length: textLen }, () => ({}));

  for (const sp of spans) {
    const s = Math.max(0, Math.min(textLen, sp.start));
    const e = Math.max(0, Math.min(textLen, sp.end));
    for (let i = s; i < e; i++) {
      if (sp.bold) chars[i].bold = true;
      if (sp.italic) chars[i].italic = true;
      if (sp.underline) chars[i].underline = true;
      if (sp.color) chars[i].color = sp.color;
      if (sp.link) chars[i].link = sp.link;
    }
  }

  const clampedStart = Math.max(0, Math.min(textLen, start));
  const clampedEnd = Math.max(0, Math.min(textLen, end));

  let allActive = true;
  for (let i = clampedStart; i < clampedEnd; i++) {
    if (toolId === 'bold' && !chars[i].bold) allActive = false;
    else if (toolId === 'italic' && !chars[i].italic) allActive = false;
    else if (toolId === 'underline' && !chars[i].underline) allActive = false;
    else if (toolId === 'color' && chars[i].color !== extraArg) allActive = false;
    else if (toolId === 'link' && !chars[i].link) allActive = false;
  }

  const nextActive = !allActive;

  for (let i = clampedStart; i < clampedEnd; i++) {
    if (toolId === 'bold') chars[i].bold = nextActive;
    else if (toolId === 'italic') chars[i].italic = nextActive;
    else if (toolId === 'underline') chars[i].underline = nextActive;
    else if (toolId === 'color') chars[i].color = nextActive ? extraArg : undefined;
    else if (toolId === 'link') chars[i].link = nextActive ? extraArg : undefined;
  }

  const nextSpans: RichSpan[] = [];
  let cur: RichSpan | null = null;
  for (let i = 0; i < textLen; i++) {
    const c = chars[i];
    const hasAny = c.bold || c.italic || c.underline || c.color || c.link;
    if (!hasAny) {
      if (cur) {
        nextSpans.push(cur);
        cur = null;
      }
      continue;
    }

    const same =
      cur &&
      cur.bold === c.bold &&
      cur.italic === c.italic &&
      cur.underline === c.underline &&
      cur.color === c.color &&
      cur.link === c.link;

    if (same && cur) {
      cur.end = i + 1;
    } else {
      if (cur) nextSpans.push(cur);
      cur = {
        start: i,
        end: i + 1,
        bold: c.bold,
        italic: c.italic,
        underline: c.underline,
        color: c.color,
        link: c.link,
      };
    }
  }
  if (cur) nextSpans.push(cur);

  return nextSpans;
}

/**
 * Parses raw description into RichBlock[]
 */
function parseRawToRichBlocks(raw?: string | null): RichBlock[] {
  const blocks = parseDescriptionToBlocks(raw);
  return blocks.map(b => {
    if (b.type === 'columns') {
      const count = b.columnCount === 3 ? 3 : 2;
      const rawCols = (b.columns || []).slice(0, count);
      while (rawCols.length < count) {
        rawCols.push('');
      }
      const columns: ColumnData[] = rawCols.map(colStr => {
        const { text: cleanText, attachments } = extractAttachments(colStr);
        const { plainText, spans } = parseMarkdownToTextAndSpans(cleanText);
        return {
          text: plainText,
          spans,
          attachments,
        };
      });
      return {
        id: b.id,
        type: 'columns',
        columnCount: count,
        columns,
      };
    }

    const { text: cleanText, attachments } = extractAttachments(b.text || '');
    const { plainText, spans } = parseMarkdownToTextAndSpans(cleanText);
    return {
      id: b.id,
      type: 'text',
      text: plainText,
      spans,
      attachments,
    };
  });
}

/**
 * Serializes RichBlock[] into stored Markdown string
 */
function serializeRichBlocksToRaw(blocks: RichBlock[]): string {
  const rawBlocks: DescriptionBlock[] = blocks.map(b => {
    if (b.type === 'columns') {
      const count = b.columnCount === 3 ? 3 : 2;
      const cols = (b.columns || []).slice(0, count).map(col => {
        const textWithSpans = serializeTextWithRichSpans(col.text, col.spans).trim();
        const attsMarkdown = col.attachments
          .map(att => `[${att.isImage ? '🖼️' : '📎'} ${att.name}](${att.url})`)
          .join(' ');
        return [textWithSpans, attsMarkdown].filter(Boolean).join('\n');
      });
      return {
        id: b.id,
        type: 'columns',
        columnCount: count,
        columns: cols,
      };
    }

    const textWithSpans = serializeTextWithRichSpans(b.text || '', b.spans || []).trim();
    const attsMarkdown = (b.attachments || [])
      .map(att => `[${att.isImage ? '🖼️' : '📎'} ${att.name}](${att.url})`)
      .join(' ');
    const combined = [textWithSpans, attsMarkdown].filter(Boolean).join('\n');
    return {
      id: b.id,
      type: 'text',
      text: combined,
    };
  });

  return serializeBlocksToDescription(rawBlocks);
}

const AttachmentChipItem: React.FC<{
  att: AttachmentChip;
  onRemove: () => void;
  onOpenLightbox: () => void;
}> = ({ att, onRemove, onOpenLightbox }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (att.isImage) {
          onOpenLightbox();
        } else if (att.url && !att.url.startsWith('#')) {
          window.open(att.url, '_blank', 'noopener,noreferrer');
        }
      }}
      className="relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs bg-blue-50/90 hover:bg-blue-100/80 text-blue-800 border border-blue-200 dark:bg-slate-800 dark:text-blue-200 dark:border-slate-700 cursor-pointer transition-colors max-w-full shrink-0"
    >
      {att.isImage ? (
        <ImageIcon size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
      ) : (
        <FileText size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
      )}
      <strong className="font-bold truncate max-w-[140px] text-[11.5px]">{att.name}</strong>
      {att.sizeLabel && (
        <span className="text-[9.5px] opacity-70 shrink-0">({att.sizeLabel})</span>
      )}
      <button
        type="button"
        title="Gỡ tệp đính kèm"
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 text-blue-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
      >
        <X size={11} />
      </button>

      {hovered && att.isImage && att.url && !att.url.startsWith('#') && (
        <div
          role="tooltip"
          className="smart-inline-hover-card bottom-full left-0 mb-1.5 p-1.5 rounded-xl bg-slate-900/95 text-white shadow-2xl border border-white/15 z-[95] pointer-events-none flex flex-col gap-1 w-36"
        >
          <img
            src={att.url}
            alt={att.name}
            className="w-full h-20 object-cover rounded-lg bg-slate-800"
          />
          <span className="text-[10px] font-bold truncate px-0.5 text-slate-100">
            {att.name}
          </span>
          <span className="text-[9px] text-slate-400 px-0.5">Nhấn để xem thông tin ảnh</span>
        </div>
      )}
    </div>
  );
};

export const TaskDescriptionEditor: React.FC<TaskDescriptionEditorProps> = ({
  value = '',
  onChange,
  onSave,
  onCancel,
  saving = false,
  placeholder,
  autoFocus = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Parse structured blocks with WYSIWYG spans and local attachments
  const [blocks, setBlocks] = useState<RichBlock[]>(() => parseRawToRichBlocks(value));

  // Lightbox preview modal state
  const [lightboxImage, setLightboxImage] = useState<{ name: string; url: string } | null>(null);

  const isInternalUpdateRef = useRef(false);
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    setBlocks(parseRawToRichBlocks(value));
  }, [value]);

  // Floating Bubble Toolbar state
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget | null>(null);
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState('');
  const [showColorMenu, setShowColorMenu] = useState(false);

  // Slash command popup (/column mini menu)
  const [slashMenu, setSlashMenu] = useState<{
    blockIndex: number;
    colIndex?: number;
    top: number;
    left: number;
  } | null>(null);

  const commitBlocks = useCallback(
    (newBlocks: RichBlock[]) => {
      setBlocks(newBlocks);
      isInternalUpdateRef.current = true;
      const serialized = serializeRichBlocksToRaw(newBlocks);
      onChange?.(serialized);
    },
    [onChange]
  );

  // Close floating menus on click outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setSelectionTarget(null);
        setShowColorMenu(false);
        setShowLinkInput(false);
        setSlashMenu(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // Sync selection state across all textareas
  const syncSelection = (
    e: React.SyntheticEvent<HTMLTextAreaElement>,
    blockIndex: number,
    colIndex?: number
  ) => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    if (start !== end && el.value.slice(start, end).trim().length > 0) {
      setSelectionTarget({ blockIndex, colIndex, start, end });
    } else if (!showLinkInput && !showColorMenu) {
      setSelectionTarget(null);
    }
  };

  // Determine which tools are active on current selection
  const activeSelectionFormats = useMemo(() => {
    if (!selectionTarget) return {};
    const { blockIndex, colIndex, start, end } = selectionTarget;
    const targetBlock = blocks[blockIndex];
    if (!targetBlock) return {};

    const targetSpans =
      colIndex !== undefined && targetBlock.columns
        ? targetBlock.columns[colIndex]?.spans || []
        : targetBlock.spans || [];

    const targetText =
      colIndex !== undefined && targetBlock.columns
        ? targetBlock.columns[colIndex]?.text || ''
        : targetBlock.text || '';

    if (end <= start || end > targetText.length) return {};
    const overlapping = targetSpans.filter(s => s.start < end && s.end > start);

    return {
      bold: overlapping.some(s => s.bold),
      italic: overlapping.some(s => s.italic),
      underline: overlapping.some(s => s.underline),
      link: overlapping.some(s => Boolean(s.link)),
      color: overlapping.some(s => Boolean(s.color)),
    };
  }, [selectionTarget, blocks]);

  // Apply WYSIWYG formatting without polluting text with raw markdown tags
  const applyFormatting = useCallback(
    (toolId: BubbleToolItem['id'], extraArg?: string) => {
      if (!selectionTarget) return;
      const { blockIndex, colIndex, start, end } = selectionTarget;

      const newBlocks = [...blocks];
      const targetBlock = { ...newBlocks[blockIndex] };

      let currentText = '';
      let currentSpans: RichSpan[] = [];

      if (colIndex !== undefined && targetBlock.columns) {
        currentText = targetBlock.columns[colIndex].text;
        currentSpans = targetBlock.columns[colIndex].spans;
      } else {
        currentText = targetBlock.text || '';
        currentSpans = targetBlock.spans || [];
      }

      if (end <= start) return;

      const updatedSpans = toggleSpanFormat(
        currentSpans,
        currentText.length,
        start,
        end,
        toolId,
        extraArg
      );

      if (colIndex !== undefined && targetBlock.columns) {
        const nextCols = [...targetBlock.columns];
        nextCols[colIndex] = {
          ...nextCols[colIndex],
          spans: updatedSpans,
        };
        targetBlock.columns = nextCols;
      } else {
        targetBlock.spans = updatedSpans;
      }

      newBlocks[blockIndex] = targetBlock;
      commitBlocks(newBlocks);

      setShowColorMenu(false);
      setShowLinkInput(false);

      // Re-focus and preserve selection highlight
      requestAnimationFrame(() => {
        const el = document.getElementById(
          colIndex !== undefined ? `desc-col-${blockIndex}-${colIndex}` : `desc-txt-${blockIndex}`
        ) as HTMLTextAreaElement | null;
        if (el) {
          el.focus();
          el.setSelectionRange(start, end);
        }
      });
    },
    [selectionTarget, blocks, commitBlocks]
  );

  // Pick columns from slash command: IMMEDIATELY hides UI and activates columns
  const handleSelectColumns = (blockIndex: number, count: 2 | 3) => {
    const newBlocks = [...blocks];
    const current = newBlocks[blockIndex];

    let textBefore = current?.text || '';
    textBefore = textBefore.replace(/\/(column|col)(\s*[23])?$/i, '').trimEnd();

    const columnBlock: RichBlock = {
      id: `col_${Date.now()}`,
      type: 'columns',
      columnCount: count,
      columns: Array.from({ length: count }, () => ({
        text: '',
        spans: [],
        attachments: [],
      })),
    };

    const nextNormalBlock: RichBlock = {
      id: `txt_${Date.now() + 1}`,
      type: 'text',
      text: '',
      spans: [],
      attachments: [],
    };

    if (textBefore.trim()) {
      current.text = textBefore;
      current.spans = adjustSpansForTextEdit(current.spans || [], current.text, textBefore);
      newBlocks.splice(blockIndex + 1, 0, columnBlock, nextNormalBlock);
    } else {
      newBlocks.splice(blockIndex, 1, columnBlock, nextNormalBlock);
    }

    commitBlocks(newBlocks);
    setSlashMenu(null);

    setTimeout(() => {
      const firstColInput = document.getElementById(
        `desc-col-${textBefore.trim() ? blockIndex + 1 : blockIndex}-0`
      ) as HTMLTextAreaElement | null;
      firstColInput?.focus();
    }, 50);
  };

  // Normal text change with dynamic span adjustment and slash command detection
  const handleTextChange = (
    blockIndex: number,
    textVal: string,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newBlocks = [...blocks];
    const target = { ...newBlocks[blockIndex] };
    const oldText = target.text || '';
    target.spans = adjustSpansForTextEdit(target.spans || [], oldText, textVal);
    target.text = textVal;
    newBlocks[blockIndex] = target;
    commitBlocks(newBlocks);

    const match = textVal.match(/\/(column|col)(\s*[23])?$/i);
    if (match) {
      const elRect = e.target.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      setSlashMenu({
        blockIndex,
        top: Math.max(0, elRect.bottom - rootRect.top + 4),
        left: Math.max(12, elRect.left - rootRect.left + 16),
      });
    } else if (slashMenu && slashMenu.blockIndex === blockIndex) {
      setSlashMenu(null);
    }
  };

  // Column text change with dynamic span adjustment
  const handleColChange = (blockIndex: number, colIndex: number, textVal: string) => {
    const newBlocks = [...blocks];
    const target = { ...newBlocks[blockIndex] };
    if (!target.columns) return;
    const nextCols = [...target.columns];
    const targetCol = { ...nextCols[colIndex] };
    const oldText = targetCol.text || '';
    targetCol.spans = adjustSpansForTextEdit(targetCol.spans || [], oldText, textVal);
    targetCol.text = textVal;
    nextCols[colIndex] = targetCol;
    target.columns = nextCols;
    newBlocks[blockIndex] = target;
    commitBlocks(newBlocks);
  };

  // Keyboard shortcuts inside textareas
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    blockIndex: number,
    colIndex?: number
  ) => {
    if ((e.metaKey || e.ctrlKey) && selectionTarget) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        applyFormatting('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        applyFormatting('italic');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        applyFormatting('underline');
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        setShowLinkInput(true);
        return;
      }
    }

    if (e.key === 'Escape') {
      setSelectionTarget(null);
      setSlashMenu(null);
      setShowColorMenu(false);
      setShowLinkInput(false);
      return;
    }

    // Inside column navigation & "lúc xuống dòng sẽ hết tính năng column"
    if (colIndex !== undefined) {
      const targetBlock = blocks[blockIndex];
      const count = targetBlock.columnCount || 2;

      // Tab moves between columns
      if (e.key === 'Tab') {
        e.preventDefault();
        const nextIdx = e.shiftKey ? colIndex - 1 : colIndex + 1;
        if (nextIdx >= 0 && nextIdx < count) {
          const nextEl = document.getElementById(
            `desc-col-${blockIndex}-${nextIdx}`
          ) as HTMLTextAreaElement | null;
          nextEl?.focus();
        }
        return;
      }

      // Enter without Shift:
      // If in col 0 and col 1 is empty -> focus col 1
      // Otherwise -> drop down to normal line ("hết tính năng column")
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (colIndex < count - 1 && !(targetBlock.columns?.[colIndex + 1]?.text?.trim())) {
          const nextColInput = document.getElementById(
            `desc-col-${blockIndex}-${colIndex + 1}`
          ) as HTMLTextAreaElement | null;
          nextColInput?.focus();
        } else {
          const nextBlocks = [...blocks];
          if (blockIndex === nextBlocks.length - 1 || nextBlocks[blockIndex + 1]?.type !== 'text') {
            nextBlocks.splice(blockIndex + 1, 0, {
              id: `txt_${Date.now()}`,
              type: 'text',
              text: '',
              spans: [],
              attachments: [],
            });
            commitBlocks(nextBlocks);
          }
          setTimeout(() => {
            const nextTextEl = document.getElementById(
              `desc-txt-${blockIndex + 1}`
            ) as HTMLTextAreaElement | null;
            nextTextEl?.focus();
          }, 50);
        }
      }
    }
  };

  // Paste image clipboard handler: "dán ở đâu thì ở đó"
  const handlePaste = async (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    blockIndex: number,
    colIndex?: number
  ) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const imgFile = Array.from(files).find(f => f.type.startsWith('image/'));
      if (imgFile) {
        e.preventDefault();
        const toastId = toast.loading('Đang tải hình ảnh...');
        try {
          const cleanName = imgFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
          const sizeLabel = formatBytes(imgFile.size);
          const { data, error } = await supabase.storage
            .from('attachments')
            .upload(`tasks/${Date.now()}-${cleanName}`, imgFile, { upsert: false });

          let publicUrl = '';
          if (!error && data) {
            publicUrl = supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
          } else {
            publicUrl = await fileToCompactDataUrl(imgFile);
          }

          const chip: AttachmentChip = {
            id: `${Date.now()}-${cleanName}`,
            name: imgFile.name,
            url: publicUrl,
            isImage: true,
            sizeLabel,
          };

          const newBlocks = [...blocks];
          const target = { ...newBlocks[blockIndex] };

          if (colIndex !== undefined && target.type === 'columns' && target.columns) {
            const nextCols = [...target.columns];
            const targetCol = { ...nextCols[colIndex] };
            targetCol.attachments = [...(targetCol.attachments || []), chip];
            nextCols[colIndex] = targetCol;
            target.columns = nextCols;
          } else {
            target.attachments = [...(target.attachments || []), chip];
          }

          newBlocks[blockIndex] = target;
          commitBlocks(newBlocks);
          toast.success('Đã dán hình ảnh', { id: toastId });
        } catch {
          toast.error('Không thể tải hình ảnh', { id: toastId });
        }
      }
    }
  };

  return (
    <div ref={rootRef} className={`w-full space-y-2 ${className}`}>
      {/* Outer wrapper to hold unclipped floating toolbar right above the box */}
      <div className="relative w-full">
        {/* ========================================================
            1. FLOATING BUBBLE TOOLBAR (Exact same as comments)
            Anchored right above the description box, floating cleanly
           ======================================================== */}
        {selectionTarget && (
          <div
            role="toolbar"
            aria-label="Text formatting toolbar"
            onMouseDown={e => {
              if ((e.target as HTMLElement).tagName !== 'INPUT') {
                e.preventDefault();
              }
            }}
            className="smart-comment-bubble-toolbar"
            style={{ bottom: 'calc(100% + 10px)', left: '16px' }}
          >
            {showLinkInput ? (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5">
                <Link2 size={13} className="text-blue-400 shrink-0" />
                <input
                  type="url"
                  autoFocus
                  value={linkUrlDraft}
                  onChange={e => setLinkUrlDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyFormatting('link', linkUrlDraft || 'https://');
                      setLinkUrlDraft('');
                    } else if (e.key === 'Escape') {
                      setShowLinkInput(false);
                    }
                  }}
                  placeholder="https://..."
                  className="bg-slate-800 text-white text-xs px-2 py-1 rounded-md outline-none border border-slate-600 focus:border-blue-500 w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    applyFormatting('link', linkUrlDraft || 'https://');
                    setLinkUrlDraft('');
                  }}
                  className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Gắn link
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 relative">
                {BUBBLE_TOOLS.map(tool => {
                  const isActive = Boolean(
                    activeSelectionFormats[tool.id as keyof typeof activeSelectionFormats]
                  );
                  return (
                    <div key={tool.id} className="relative">
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredToolId(tool.id)}
                        onMouseLeave={() => setHoveredToolId(null)}
                        onClick={() => {
                          if (tool.id === 'link') {
                            setShowLinkInput(true);
                            setShowColorMenu(false);
                          } else if (tool.id === 'color') {
                            setShowColorMenu(prev => !prev);
                          } else {
                            applyFormatting(tool.id);
                          }
                        }}
                        className={`smart-bubble-tool-btn cursor-pointer ${isActive ? 'is-active' : ''}`}
                      >
                        {tool.icon}
                      </button>

                      {/* 2-Line Shortcut Tooltip */}
                      {hoveredToolId === tool.id && !showColorMenu && (
                        <div className="smart-bubble-tooltip" role="tooltip">
                          <span className="font-semibold text-white leading-tight">{tool.label}</span>
                          <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {tool.shortcut}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Color Swatch Menu */}
                {showColorMenu && (
                  <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-xl z-50">
                    {TEXT_COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        title={preset.label}
                        onClick={() => applyFormatting('color', preset.id)}
                        className="w-4 h-4 rounded-full border border-white/25 transition-transform hover:scale-125 cursor-pointer"
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            2. MINI SLASH MENU (/column -> click hides UI immediately)
           ======================================================== */}
        {slashMenu && (
          <div
            style={{ top: slashMenu.top, left: slashMenu.left }}
            className="absolute z-50 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl flex items-center gap-1 animate-in fade-in duration-100"
          >
            <button
              type="button"
              onClick={() => handleSelectColumns(slashMenu.blockIndex, 2)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Columns2 size={14} className="text-blue-500" />
              <span>2 Cột</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectColumns(slashMenu.blockIndex, 3)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Columns3 size={14} className="text-blue-500" />
              <span>3 Cột</span>
            </button>
          </div>
        )}

        {/* ========================================================
            3. RESIZABLE DESCRIPTION BOX CONTAINER
            `resize-y overflow-auto min-h-[140px]` gives the scale handle!
           ======================================================== */}
        <div className="w-full rounded-2xl border border-primary/40 bg-white dark:bg-slate-900 p-3.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all relative resize-y overflow-auto min-h-[140px] max-h-[680px] space-y-3">
          {blocks.map((block, bIdx) => {
            if (block.type === 'text') {
              const hasMirrored = (block.spans || []).length > 0 && (block.text || '').length > 0;
              const atts = block.attachments || [];

              return (
                <div key={block.id || bIdx} className="space-y-1.5">
                  {/* Local Attachment Chips for this text block */}
                  {atts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {atts.map(att => (
                        <AttachmentChipItem
                          key={att.id}
                          att={att}
                          onRemove={() => {
                            const newBlocks = [...blocks];
                            const target = { ...newBlocks[bIdx] };
                            target.attachments = (target.attachments || []).filter(
                              x => x.id !== att.id
                            );
                            newBlocks[bIdx] = target;
                            commitBlocks(newBlocks);
                          }}
                          onOpenLightbox={() =>
                            setLightboxImage({ name: att.name, url: att.url })
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* WYSIWYG Input Layer */}
                  <div className="relative min-h-[44px]">
                    {hasMirrored && (
                      <div aria-hidden="true" className="desc-rich-mirror">
                        {renderMirrorSegments(block.text || '', block.spans || [])}
                      </div>
                    )}
                    <textarea
                      id={`desc-txt-${bIdx}`}
                      autoFocus={autoFocus && bIdx === 0}
                      value={block.text || ''}
                      rows={Math.max(2, Math.min(6, (block.text || '').split('\n').length))}
                      onChange={e => handleTextChange(bIdx, e.target.value, e)}
                      onSelect={e => syncSelection(e, bIdx)}
                      onKeyUp={e => syncSelection(e, bIdx)}
                      onMouseUp={e => syncSelection(e, bIdx)}
                      onKeyDown={e => handleKeyDown(e, bIdx)}
                      onPaste={e => void handlePaste(e, bIdx)}
                      onScroll={e => {
                        const target = e.currentTarget;
                        const mirror = target.previousElementSibling as HTMLElement | null;
                        if (mirror) {
                          mirror.scrollTop = target.scrollTop;
                          mirror.scrollLeft = target.scrollLeft;
                        }
                      }}
                      placeholder={
                        bIdx === 0
                          ? placeholder || t('tasks.descPlaceholder')
                          : 'Nhập tiếp nội dung (gõ /column để tạo cột)...'
                      }
                      className={`desc-rich-textarea ${hasMirrored ? 'is-mirrored' : ''}`}
                    />
                  </div>
                </div>
              );
            }

            if (block.type === 'columns') {
              const count = block.columnCount === 3 ? 3 : 2;
              const cols = (block.columns || []).slice(0, count);

              return (
                <div
                  key={block.id || bIdx}
                  className={`grid gap-2 my-1.5 ${
                    count === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
                  }`}
                >
                  {cols.map((colData, cIdx) => {
                    const hasMirrored =
                      (colData.spans || []).length > 0 && (colData.text || '').length > 0;
                    const colAtts = colData.attachments || [];

                    return (
                      <div
                        key={cIdx}
                        className="relative min-w-0 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-colors p-2.5 resize-y overflow-auto min-h-[76px] max-h-[500px] flex flex-col gap-1.5"
                      >
                        {/* Requirement 3: Local Attachment Chips inside this exact column! */}
                        {colAtts.length > 0 && (
                          <div className="flex flex-wrap gap-1 pb-1">
                            {colAtts.map(att => (
                              <AttachmentChipItem
                                key={att.id}
                                att={att}
                                onRemove={() => {
                                  const newBlocks = [...blocks];
                                  const target = { ...newBlocks[bIdx] };
                                  if (!target.columns) return;
                                  const nextCols = [...target.columns];
                                  const targetCol = { ...nextCols[cIdx] };
                                  targetCol.attachments = (targetCol.attachments || []).filter(
                                    x => x.id !== att.id
                                  );
                                  nextCols[cIdx] = targetCol;
                                  target.columns = nextCols;
                                  newBlocks[bIdx] = target;
                                  commitBlocks(newBlocks);
                                }}
                                onOpenLightbox={() =>
                                  setLightboxImage({ name: att.name, url: att.url })
                                }
                              />
                            ))}
                          </div>
                        )}

                        {/* WYSIWYG Column Input Layer */}
                        <div className="relative flex-1 min-h-[36px]">
                          {hasMirrored && (
                            <div aria-hidden="true" className="desc-rich-mirror">
                              {renderMirrorSegments(colData.text || '', colData.spans || [])}
                            </div>
                          )}
                          <textarea
                            id={`desc-col-${bIdx}-${cIdx}`}
                            value={colData.text || ''}
                            onChange={e => handleColChange(bIdx, cIdx, e.target.value)}
                            onSelect={e => syncSelection(e, bIdx, cIdx)}
                            onKeyUp={e => syncSelection(e, bIdx, cIdx)}
                            onMouseUp={e => syncSelection(e, bIdx, cIdx)}
                            onKeyDown={e => handleKeyDown(e, bIdx, cIdx)}
                            onPaste={e => void handlePaste(e, bIdx, cIdx)}
                            onScroll={e => {
                              const target = e.currentTarget;
                              const mirror = target.previousElementSibling as HTMLElement | null;
                              if (mirror) {
                                mirror.scrollTop = target.scrollTop;
                                mirror.scrollLeft = target.scrollLeft;
                              }
                            }}
                            placeholder={`Cột ${cIdx + 1}...`}
                            className={`desc-rich-textarea ${hasMirrored ? 'is-mirrored' : ''}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* ========================================================
          SAVE & CANCEL ACTIONS
         ======================================================== */}
      {(onSave || onCancel) && (
        <div className="flex justify-end items-center gap-2 pt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-medium cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          )}

          {onSave && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave(serializeRichBlocksToRaw(blocks))}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>{t('common.save')}</span>
            </button>
          )}
        </div>
      )}

      {/* Full Image Info Lightbox Modal */}
      <CommentImagePreviewModal
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};
