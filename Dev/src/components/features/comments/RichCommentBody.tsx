import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Layers,
  Link2,
  X,
} from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

export const COMMENT_COLOR_MAP: Record<string, { light: string; dark: string; hex: string }> = {
  blue: { light: '#2563eb', dark: '#60a5fa', hex: '#3b82f6' },
  emerald: { light: '#059669', dark: '#34d399', hex: '#10b981' },
  amber: { light: '#d97706', dark: '#fbbf24', hex: '#f59e0b' },
  rose: { light: '#e11d48', dark: '#fb7185', hex: '#f43f5e' },
  violet: { light: '#7c3aed', dark: '#c084fc', hex: '#8b5cf6' },
  cyan: { light: '#0891b2', dark: '#22d3ee', hex: '#06b6d4' },
};

const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i;

export function isImageAttachment(name: string, url: string): boolean {
  if (url.startsWith('data:image/')) return true;
  if (IMAGE_EXT_REGEX.test(name) || IMAGE_EXT_REGEX.test(url)) return true;
  return false;
}

interface ImagePopupState {
  name: string;
  url: string;
}

/**
 * Full-screen Lightbox Modal when clicking an uploaded image in comments
 */
export const CommentImagePreviewModal: React.FC<{
  image: ImagePopupState | null;
  onClose: () => void;
}> = ({ image, onClose }) => {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

  if (!image || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.name}
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        {/* Header with Image Info */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center shrink-0">
              <ImageIcon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {image.name}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                {dimensions
                  ? `Kích thước: ${dimensions.w} × ${dimensions.h} px`
                  : 'Tệp hình ảnh đính kèm trong bình luận'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {image.url && !image.url.startsWith('#') && (
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 transition-colors"
              >
                <ExternalLink size={13} />
                <span>Mở ảnh gốc</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image Body */}
        <div className="p-4 flex items-center justify-center bg-slate-100/70 dark:bg-slate-950/60 max-h-[75vh] overflow-auto">
          <img
            src={image.url}
            alt={image.name}
            onLoad={e => {
              const el = e.currentTarget;
              if (el.naturalWidth && el.naturalHeight) {
                setDimensions({ w: el.naturalWidth, h: el.naturalHeight });
              }
            }}
            className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-md"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Date / Reminder Pill matching the @Mention Popover UI
 * - Today / Hôm nay: Amber
 * - Tomorrow / Ngày mai: Blue
 * - NextWeek / Tuần tới: Violet
 * Shows full dd/mm/yyyy on hover.
 */
const DateReminderPill: React.FC<{
  kind: 'today' | 'tomorrow' | 'nextweek';
  dateStr: string;
  isMineBubble?: boolean;
}> = ({ kind, dateStr, isMineBubble }) => {
  const { lang } = useTranslation();
  const isEn = lang === 'en';
  const [hovered, setHovered] = useState(false);

  const label =
    kind === 'today'
      ? isEn
        ? 'Today'
        : 'Hôm nay'
      : kind === 'tomorrow'
      ? isEn
        ? 'Tomorrow'
        : 'Ngày mai'
      : isEn
      ? 'Next week'
      : 'Tuần tới';

  const toneClasses =
    kind === 'today'
      ? isMineBubble
        ? 'bg-amber-400/25 text-amber-200 border-amber-300/40'
        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
      : kind === 'tomorrow'
      ? isMineBubble
        ? 'bg-sky-400/25 text-sky-100 border-sky-300/40'
        : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      : isMineBubble
      ? 'bg-violet-400/25 text-violet-100 border-violet-300/40'
      : 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30';

  const icon =
    kind === 'today' ? (
      <Clock size={12} className={isMineBubble ? 'text-amber-300' : 'text-amber-500'} />
    ) : (
      <Calendar
        size={12}
        className={
          kind === 'tomorrow'
            ? isMineBubble
              ? 'text-sky-300'
              : 'text-blue-500'
            : isMineBubble
            ? 'text-violet-300'
            : 'text-violet-500'
        }
      />
    );

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md border text-xs font-bold align-baseline cursor-default select-none transition-transform hover:scale-[1.02] ${toneClasses}`}
    >
      {icon}
      <span>@{label}</span>

      {hovered && (
        <span
          role="tooltip"
          className="smart-inline-hover-card bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-xl border border-white/15 z-[90] pointer-events-none"
        >
          📅 {dateStr}
        </span>
      )}
    </span>
  );
};

/**
 * Interactive File / Image Attachment Chip inside a comment
 * - Filename is bold
 * - Hovering an image shows a compact mini thumbnail preview
 * - Clicking an image opens the full Image Info Popup Modal
 */
const AttachmentInlineChip: React.FC<{
  rawLabel: string;
  url: string;
  isMineBubble?: boolean;
  onOpenImage: (img: ImagePopupState) => void;
}> = ({ rawLabel, url, isMineBubble, onOpenImage }) => {
  const [hovered, setHovered] = useState(false);
  const cleanName = rawLabel.replace(/^[📎🖼️]\s*/, '').trim();
  const isImg = isImageAttachment(cleanName, url);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => {
        e.stopPropagation();
        if (isImg) {
          onOpenImage({ name: cleanName, url });
        } else if (url && !url.startsWith('#')) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }}
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-0.5 my-0.5 mx-0.5 rounded-lg border text-xs cursor-pointer transition-all ${
        isMineBubble
          ? 'bg-white/15 hover:bg-white/25 text-white border-white/25'
          : 'bg-white dark:bg-slate-800 hover:bg-blue-50/80 dark:hover:bg-slate-700 text-gray-900 dark:text-white border-gray-200 dark:border-slate-600 shadow-2xs'
      }`}
    >
      {isImg ? (
        <ImageIcon size={13} className={isMineBubble ? 'text-sky-200' : 'text-blue-600 dark:text-blue-400'} />
      ) : (
        <FileText size={13} className={isMineBubble ? 'text-sky-200' : 'text-blue-600 dark:text-blue-400'} />
      )}
      <strong className="font-bold truncate max-w-[210px]">{cleanName}</strong>

      {/* Hover Mini Preview for Images */}
      {hovered && isImg && url && !url.startsWith('#') && (
        <span
          role="tooltip"
          className="smart-inline-hover-card bottom-full left-0 mb-2 p-1.5 rounded-xl bg-zinc-900/95 text-white shadow-2xl border border-white/15 z-[95] pointer-events-none flex flex-col gap-1 w-40"
        >
          <img
            src={url}
            alt={cleanName}
            className="w-full h-24 object-cover rounded-lg bg-zinc-800"
          />
          <span className="text-[10px] font-bold truncate px-0.5 text-zinc-100">
            {cleanName}
          </span>
          <span className="text-[9.5px] text-zinc-400 px-0.5">
            Nhấn để phóng to & xem thông tin
          </span>
        </span>
      )}

      {/* Hover Full URL for non-image files */}
      {hovered && !isImg && url && (
        <span
          role="tooltip"
          className="smart-inline-hover-card bottom-full left-0 mb-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-[11px] shadow-xl border border-white/15 z-[95] pointer-events-none max-w-xs break-all"
        >
          <span className="block font-bold text-zinc-200 mb-0.5">{cleanName}</span>
          <span className="block text-[10px] text-zinc-400">{url}</span>
        </span>
      )}
    </span>
  );
};

/**
 * Interactive Link / Project Tag inside a comment
 * - Hovering shows the FULL URL / path
 */
const InteractiveCommentLink: React.FC<{
  label: string;
  href: string;
  isMineBubble?: boolean;
}> = ({ label, href, isMineBubble }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const isInternalProject =
    href.startsWith('/projects') || href.startsWith('/workflow') || href.startsWith('/tasks');
  const isCampaign = href.includes('campaign=');
  const cleanLabel = label.replace(/^[📂🎯🔗]\s*/, '').trim();

  const handleClick = (e: React.MouseEvent) => {
    if (
      href.startsWith('/') &&
      !href.startsWith('//')
    ) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <a
      href={href}
      target={href.startsWith('/') ? undefined : '_blank'}
      rel={href.startsWith('/') ? undefined : 'noopener noreferrer'}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        isInternalProject
          ? `relative inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md border text-xs font-bold no-underline transition-transform hover:scale-[1.02] ${
              isMineBubble
                ? 'bg-white/15 text-white border-white/30 hover:bg-white/25'
                : isCampaign
                ? 'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-violet-500/12 text-violet-800 dark:text-violet-300 border-violet-500/30 hover:bg-violet-500/20'
            }`
          : `relative inline-flex items-center gap-1 font-semibold underline underline-offset-2 break-all ${
              isMineBubble
                ? 'text-sky-200 hover:text-white'
                : 'text-blue-600 dark:text-blue-400 hover:text-blue-800'
            }`
      }
    >
      {isInternalProject ? (
        isCampaign ? (
          <Layers size={12} className="shrink-0" />
        ) : (
          <FolderKanban size={12} className="shrink-0" />
        )
      ) : (
        <Link2 size={12} className="shrink-0" />
      )}
      <span>{cleanLabel}</span>

      {hovered && (
        <span
          role="tooltip"
          className="smart-inline-hover-card bottom-full left-0 mb-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-[11px] font-normal shadow-xl border border-white/15 z-[95] pointer-events-none min-w-[180px] max-w-[320px] break-all leading-snug"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">
            {isInternalProject ? 'Liên kết dự án / trang' : 'Đường dẫn liên kết'}
          </span>
          <span className="text-sky-300 font-mono text-[11px] break-all">
            {href.startsWith('/') && typeof window !== 'undefined'
              ? `${window.location.origin}${href}`
              : href}
          </span>
        </span>
      )}
    </a>
  );
};

/**
 * Recursive inline parser for:
 * - [color:name]text[/color]
 * - **bold**
 * - *italic*
 * - <u>underline</u>
 * - @Today(dd/mm/yyyy), @Tomorrow(dd/mm/yyyy), @NextWeek(dd/mm/yyyy)
 * - [📎 name](url) / [🖼️ name](url) / [label](url)
 * - raw https://... URLs
 * - @PersonMention (bold high-contrast PIC tag)
 */
export const RichCommentBody: React.FC<{
  body?: string | null;
  isMineBubble?: boolean;
  className?: string;
}> = ({ body, isMineBubble = false, className = '' }) => {
  const [previewImage, setPreviewImage] = useState<ImagePopupState | null>(null);

  if (!body) return null;

  const renderInlineTokens = (text: string, keyPrefix: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Combined regex matching the earliest special token in `text`
    const tokenRegex =
      /(\[color:([a-zA-Z0-9#]+)\]([\s\S]*?)\[\/color\])|(<u>([\s\S]*?)<\/u>)|(\*\*([^\n*]+?)\*\*)|(\*([^\n*]+?)\*)|(@(?:Today|Hôm_nay|Hom_nay)\((\d{1,2}\/\d{1,2}\/\d{4})\))|(@(?:Tomorrow|Ngày_mai|Ngay_mai)\((\d{1,2}\/\d{1,2}\/\d{4})\))|(@(?:NextWeek|Tuần_tới|Tuan_toi)\((\d{1,2}\/\d{1,2}\/\d{4})\))|(!?\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s<)]+)|((?:^|\s)@[A-Za-zÀ-ỹ0-9_.-]+)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      const key = `${keyPrefix}-${idx++}`;

      if (match[1]) {
        // [color:name]content[/color]
        const rawColor = match[2].toLowerCase();
        const inner = match[3];
        const preset = COMMENT_COLOR_MAP[rawColor];
        const colorHex = preset ? preset.hex : rawColor;
        nodes.push(
          <span
            key={key}
            style={{ color: colorHex }}
            className="font-semibold"
          >
            {renderInlineTokens(inner, `${key}-c`)}
          </span>
        );
      } else if (match[4]) {
        // <u>content</u>
        nodes.push(
          <u key={key} className="underline underline-offset-2">
            {renderInlineTokens(match[5], `${key}-u`)}
          </u>
        );
      } else if (match[6]) {
        // **bold**
        nodes.push(
          <strong key={key} className="font-bold">
            {renderInlineTokens(match[7], `${key}-b`)}
          </strong>
        );
      } else if (match[8]) {
        // *italic*
        nodes.push(
          <em key={key} className="italic">
            {renderInlineTokens(match[9], `${key}-i`)}
          </em>
        );
      } else if (match[10]) {
        // @Today(dd/mm/yyyy)
        nodes.push(
          <DateReminderPill
            key={key}
            kind="today"
            dateStr={match[11]}
            isMineBubble={isMineBubble}
          />
        );
      } else if (match[12]) {
        // @Tomorrow(dd/mm/yyyy)
        nodes.push(
          <DateReminderPill
            key={key}
            kind="tomorrow"
            dateStr={match[13]}
            isMineBubble={isMineBubble}
          />
        );
      } else if (match[14]) {
        // @NextWeek(dd/mm/yyyy)
        nodes.push(
          <DateReminderPill
            key={key}
            kind="nextweek"
            dateStr={match[15]}
            isMineBubble={isMineBubble}
          />
        );
      } else if (match[16]) {
        // [label](url)
        const label = match[17];
        const url = match[18];
        const isFileChip =
          label.startsWith('📎') ||
          label.startsWith('🖼️') ||
          url.includes('/storage/v1/object/public/attachments/') ||
          url.startsWith('data:image/') ||
          url.startsWith('#attachment-');

        if (isFileChip) {
          const displayLabel =
            label.startsWith('📎') || label.startsWith('🖼️')
              ? label
              : isImageAttachment(label, url)
              ? `🖼️ ${label === 'image' ? 'Ảnh đính kèm' : label}`
              : `📎 ${label}`;
          nodes.push(
            <AttachmentInlineChip
              key={key}
              rawLabel={displayLabel}
              url={url}
              isMineBubble={isMineBubble}
              onOpenImage={img => setPreviewImage(img)}
            />
          );
        } else {
          nodes.push(
            <InteractiveCommentLink
              key={key}
              label={label}
              href={url}
              isMineBubble={isMineBubble}
            />
          );
        }
      } else if (match[19]) {
        // Raw URL https://...
        const rawUrl = match[19];
        if (isImageAttachment(rawUrl, rawUrl)) {
          const fileName = rawUrl.split('/').pop()?.split('?')[0] || 'image.png';
          nodes.push(
            <AttachmentInlineChip
              key={key}
              rawLabel={`🖼️ ${fileName}`}
              url={rawUrl}
              isMineBubble={isMineBubble}
              onOpenImage={img => setPreviewImage(img)}
            />
          );
        } else {
          nodes.push(
            <InteractiveCommentLink
              key={key}
              label={rawUrl}
              href={rawUrl}
              isMineBubble={isMineBubble}
            />
          );
        }
      } else if (match[20]) {
        // @PersonMention — Bold high-contrast PIC tag
        const fullMatch = match[20];
        const leadingSpace = fullMatch.startsWith(' ') ? ' ' : '';
        const handle = fullMatch.trim();
        nodes.push(
          <React.Fragment key={key}>
            {leadingSpace}
            <strong
              className={`font-extrabold px-1 py-0.2 rounded ${
                isMineBubble
                  ? 'text-white bg-white/15'
                  : 'text-gray-950 dark:text-white bg-blue-500/10 dark:bg-blue-400/15'
              }`}
            >
              {handle}
            </strong>
          </React.Fragment>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  const lines = body.split('\n');

  return (
    <>
      <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {renderInlineTokens(line, `L${lineIdx}`)}
            {lineIdx < lines.length - 1 && '\n'}
          </React.Fragment>
        ))}
      </div>

      <CommentImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
};
