import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  AtSign,
  Bold,
  Calendar,
  Clock,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Italic,
  Layers,
  Link2,
  Paperclip,
  Underline,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../../common/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { supabase } from '../../../services/supabase';
import { useSidebarTrackingData } from '../../../hooks/useSidebarTrackingData';
import {
  COMMENT_COLOR_MAP,
  CommentImagePreviewModal,
  isImageAttachment,
} from './RichCommentBody';
import '../../../styles/task-comments.css';

export interface CommentMentionPerson {
  id: number;
  name: string;
  avatar_url?: string | null;
  departments?: { name?: string } | null;
}

export interface SmartPageSuggestion {
  id: string;
  title: string;
  parentPath: string;
  href: string;
  kind: 'project' | 'campaign' | 'page';
  relatedStaffNames?: string[];
}

interface AttachmentChip {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
  sizeLabel?: string;
}

interface MentionPill {
  id: string;
  kind: 'date' | 'page';
  dateKind?: 'today' | 'tomorrow' | 'nextweek';
  pageKind?: 'project' | 'campaign' | 'page';
  label: string;
  sublabel?: string;
  href?: string;
  token: string;
}

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
 * Adjust character-range spans when plain text changes from `oldText` to `newText`
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
    .map(sp => {
      let s = sp.start;
      let e = sp.end;

      if (e <= prefixLen) {
        // Edit happened completely after this span
        return sp;
      }
      if (s >= oldSuffix) {
        // Edit happened completely before this span
        return { ...sp, start: s + delta, end: e + delta };
      }
      // Edit overlapped or occurred inside this span
      if (s > prefixLen) {
        s = Math.max(prefixLen, s + delta);
      }
      e = Math.max(s, e + delta);
      return { ...sp, start: s, end: e };
    })
    .filter(sp => sp.end > sp.start);
}

/**
 * Serialize plain text + RichSpan[] into stored Markdown tokens when sending the comment
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
    if (isBold) formatted = `**${formatted}**`;
    if (isItalic) formatted = `*${formatted}*`;
    if (isUnderline) formatted = `<u>${formatted}</u>`;
    if (colorSpan?.color) formatted = `[color:${colorSpan.color}]${formatted}[/color]`;
    if (linkSpan?.link) formatted = `[${formatted}](${linkSpan.link})`;

    out += formatted;
  }

  return out;
}

/**
 * Render WYSIWYG styled segments for the live mirror layer inside the input bar
 */
function renderMirrorSegments(text: string, spans: RichSpan[]): React.ReactNode {
  if (!text) return null;
  if (spans.length === 0) return text;

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
          textDecoration:
            isUnderline || linkSpan?.link ? 'underline' : undefined,
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

interface MentionCandidate {
  id: string;
  category: 'date' | 'person' | 'page';
  dateKind?: 'today' | 'tomorrow' | 'nextweek';
  pageKind?: 'project' | 'campaign' | 'page';
  label: string;
  sublabel?: string;
  href?: string;
  insertText: string;
  ghostText: string;
  person?: CommentMentionPerson;
  icon?: React.ReactNode;
}

interface BubbleToolItem {
  id: 'bold' | 'italic' | 'underline' | 'link' | 'color';
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

/**
 * Only the 5 requested formatting tools:
 * 1. Bold, 2. Italic (chữ nghiêng), 3. Underline (chữ gạch chân), 4. Add link, 5. Color text
 */
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

function formatDateVi(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compress an image file into a compact Data URL fallback if Supabase Storage bucket is unavailable
 */
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

export interface SmartCommentInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: (finalBody?: string) => void | Promise<void>;
  people?: CommentMentionPerson[];
  onPickPerson?: (person: CommentMentionPerson) => void;
  disabled?: boolean;
  saving?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  autoFocusTrigger?: string | number;
  ariaLabel?: string;
}

export const SmartCommentInput: React.FC<SmartCommentInputProps> = ({
  value,
  onChange,
  onSubmit,
  people = [],
  onPickPerson,
  disabled = false,
  saving = false,
  placeholder,
  inputRef: externalRef,
  autoFocusTrigger,
  ariaLabel,
}) => {
  const { lang } = useTranslation();
  const isEn = lang === 'en';
  const profile = useAuthStore(s => s.profile);
  const { enrichedTracks } = useSidebarTrackingData();

  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = (externalRef || internalRef) as React.RefObject<HTMLTextAreaElement | null>;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [caretPos, setCaretPos] = useState<number>(value.length);
  const [forceMentionOpen, setForceMentionOpen] = useState(false);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [activeCandidateIdx, setActiveCandidateIdx] = useState<number>(0);

  // Inline Mention Pills (Date/Reminder pills & Project/Campaign pills rendered directly inside the input bar!)
  const [mentionPills, setMentionPills] = useState<MentionPill[]>([]);
  const [hoveredPillId, setHoveredPillId] = useState<string | null>(null);

  // Clean WYSIWYG inline formatting spans (so `value` never shows ugly `[color:rose]...[/color]` or `**...**` code!)
  const [richSpans, setRichSpans] = useState<RichSpan[]>([]);

  // Floating Bubble Toolbar state on text selection
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState('');
  const [showColorMenu, setShowColorMenu] = useState(false);

  // File & Image attachments state
  const [attachments, setAttachments] = useState<AttachmentChip[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [hoveredAttachmentId, setHoveredAttachmentId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ name: string; url: string } | null>(null);

  // Reset richSpans if value becomes empty externally
  useEffect(() => {
    if (!value) {
      setRichSpans([]);
    }
  }, [value]);

  const updateValueAndSpans = useCallback(
    (nextValue: string) => {
      setRichSpans(prev => adjustSpansForTextEdit(prev, value, nextValue));
      onChange(nextValue);
    },
    [value, onChange]
  );

  // Auto-focus when requested by parent
  useEffect(() => {
    if (!autoFocusTrigger) return;
    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
      textareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocusTrigger, textareaRef]);

  // Auto-resize single-line textarea accurately (never inflate when empty or inside a 0-width drawer)
  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!value || (!value.includes('\n') && el.offsetWidth === 0)) {
      el.style.height = '24px';
      return;
    }
    el.style.height = '24px';
    const scrollH = el.scrollHeight;
    const nextHeight = scrollH > 28 ? Math.min(scrollH, 128) : 24;
    el.style.height = `${nextHeight}px`;
  }, [value, textareaRef]);

  useEffect(() => {
    syncTextareaHeight();
  }, [syncTextareaHeight]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => syncTextareaHeight());
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncTextareaHeight, textareaRef]);

  // Detect active `@query` before the caret
  const mentionMatch = useMemo(() => {
    const pos = Math.min(caretPos, value.length);
    const beforeCaret = value.slice(0, pos);
    const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) return null;
    const query = match[1] || '';
    const atIndex = beforeCaret.lastIndexOf('@');
    return {
      query,
      atIndex,
      endIndex: pos,
    };
  }, [value, caretPos]);

  const isMentionPopoverOpen = Boolean(mentionMatch) || forceMentionOpen;
  const activeQuery = (mentionMatch?.query || '').toLowerCase();

  // Build staff-related Projects & Campaigns dynamically from workspace tracks
  const staffRelatedProjects = useMemo<SmartPageSuggestion[]>(() => {
    const mentionedPeopleIds = new Set<number>();
    people.forEach(p => {
      const tag = `@${p.name.replace(/\s+/g, '').toLowerCase()}`;
      if (value.toLowerCase().includes(tag)) {
        mentionedPeopleIds.add(Number(p.id));
      }
    });

    const items: Array<SmartPageSuggestion & { score: number }> = [];

    enrichedTracks.forEach(tr => {
      const allTrackMembers = [
        ...tr.track.pics,
        ...(tr.track.sub_pics || []),
        ...tr.track.phases.flatMap(ph => ph.members),
      ];
      const uniqueNames = Array.from(
        new Set(allTrackMembers.map(m => m.name).filter(Boolean))
      );
      const memberIds = new Set(allTrackMembers.map(m => Number(m.id)));

      const matchesMentionedStaff =
        mentionedPeopleIds.size > 0 &&
        Array.from(mentionedPeopleIds).some(id => memberIds.has(id));
      const matchesCurrentStaff =
        profile?.id != null && memberIds.has(Number(profile.id));

      let score = tr.priorityScore || 0;
      if (matchesMentionedStaff) score += 5000;
      if (matchesCurrentStaff) score += 2000;

      const kindLabel = tr.kind === 'campaign' ? 'Chiến dịch' : 'Dự án';
      const picSummary =
        uniqueNames.length > 0
          ? `PIC: ${uniqueNames.slice(0, 3).join(', ')}${uniqueNames.length > 3 ? ` +${uniqueNames.length - 3}` : ''}`
          : `${tr.openCount} việc đang mở`;

      items.push({
        id: `track:${tr.key}`,
        title: tr.name,
        parentPath: `${kindLabel} · ${picSummary}`,
        href: tr.projectsHref,
        kind: tr.kind,
        relatedStaffNames: uniqueNames,
        score,
      });
    });

    items.sort((a, b) => b.score - a.score);
    return items;
  }, [enrichedTracks, people, value, profile?.id]);

  // Build categorized candidates: 1. Date/Time, 2. People, 3. Staff-related Projects/Campaigns
  const candidates = useMemo<MentionCandidate[]>(() => {
    if (!isMentionPopoverOpen) return [];
    const list: MentionCandidate[] = [];

    // Category 1: Date / Reminder (with matching pill colors in popup & input bar & chat)
    const todayDate = formatDateVi(0);
    const tomorrowDate = formatDateVi(1);
    const nextWeekDate = formatDateVi(7);

    const dateItems: MentionCandidate[] = [
      {
        id: 'date:today',
        category: 'date',
        dateKind: 'today',
        label: isEn ? 'Today' : 'Hôm nay',
        sublabel: todayDate,
        insertText: `@Today(${todayDate})`,
        ghostText: isEn ? 'Today' : 'Hôm nay',
        icon: <Clock size={13} className="text-amber-500" />,
      },
      {
        id: 'date:tomorrow',
        category: 'date',
        dateKind: 'tomorrow',
        label: isEn ? 'Tomorrow' : 'Ngày mai',
        sublabel: tomorrowDate,
        insertText: `@Tomorrow(${tomorrowDate})`,
        ghostText: isEn ? 'Tomorrow' : 'Ngày mai',
        icon: <Calendar size={13} className="text-blue-500" />,
      },
      {
        id: 'date:nextweek',
        category: 'date',
        dateKind: 'nextweek',
        label: isEn ? 'Next week' : 'Tuần tới',
        sublabel: nextWeekDate,
        insertText: `@NextWeek(${nextWeekDate})`,
        ghostText: isEn ? 'Next week' : 'Tuần tới',
        icon: <Calendar size={13} className="text-violet-500" />,
      },
    ];

    dateItems.forEach(item => {
      if (
        !activeQuery ||
        item.label.toLowerCase().includes(activeQuery) ||
        item.ghostText.toLowerCase().includes(activeQuery)
      ) {
        list.push(item);
      }
    });

    // Category 2: People (Staff PICs)
    people
      .filter(
        p =>
          !activeQuery ||
          p.name.toLowerCase().includes(activeQuery) ||
          p.name.replace(/\s+/g, '').toLowerCase().includes(activeQuery)
      )
      .slice(0, 6)
      .forEach(person => {
        const compactTag = person.name.replace(/\s+/g, '');
        const staffProjects = staffRelatedProjects
          .filter(proj => proj.relatedStaffNames?.includes(person.name))
          .map(proj => proj.title);
        const deptOrProjLabel =
          staffProjects.length > 0
            ? `${person.departments?.name ? `${person.departments.name} · ` : ''}${staffProjects[0]}`
            : person.departments?.name || `@${compactTag}`;

        list.push({
          id: `person:${person.id}`,
          category: 'person',
          label: person.name,
          sublabel: deptOrProjLabel,
          insertText: `@${compactTag} `,
          ghostText: compactTag,
          person,
        });
      });

    // Category 3: Staff-related Projects & Campaigns
    staffRelatedProjects
      .filter(
        proj =>
          !activeQuery ||
          proj.title.toLowerCase().includes(activeQuery) ||
          proj.parentPath.toLowerCase().includes(activeQuery) ||
          (proj.relatedStaffNames || []).some(n => n.toLowerCase().includes(activeQuery))
      )
      .slice(0, 6)
      .forEach(proj => {
        const prefixIcon = proj.kind === 'campaign' ? '🎯' : '📂';
        list.push({
          id: proj.id,
          category: 'page',
          pageKind: proj.kind,
          label: proj.title,
          sublabel: proj.parentPath,
          href: proj.href,
          insertText: `[${prefixIcon} ${proj.title}](${proj.href})`,
          ghostText: proj.title,
          icon:
            proj.kind === 'campaign' ? (
              <Layers size={14} className="text-amber-500" />
            ) : (
              <FolderKanban size={14} className="text-violet-500" />
            ),
        });
      });

    return list;
  }, [isMentionPopoverOpen, activeQuery, people, staffRelatedProjects, isEn]);

  useEffect(() => {
    setActiveCandidateIdx(0);
    setHoveredCandidateId(null);
  }, [activeQuery, isMentionPopoverOpen]);

  const previewCandidate = useMemo(() => {
    if (!isMentionPopoverOpen || candidates.length === 0) return null;
    if (hoveredCandidateId) {
      return candidates.find(c => c.id === hoveredCandidateId) || null;
    }
    return candidates[activeCandidateIdx] || null;
  }, [isMentionPopoverOpen, candidates, hoveredCandidateId, activeCandidateIdx]);

  const ghostSuffix = useMemo(() => {
    if (!previewCandidate || !mentionMatch) return '';
    const typed = mentionMatch.query;
    const target = previewCandidate.ghostText;
    if (!typed) return target;
    if (target.toLowerCase().startsWith(typed.toLowerCase())) {
      return target.slice(typed.length);
    }
    return ` · ${target}`;
  }, [previewCandidate, mentionMatch]);

  const commitCandidate = useCallback(
    (candidate: MentionCandidate) => {
      if (candidate.person && onPickPerson) {
        onPickPerson(candidate.person);
      }

      // For Date/Reminder or Project/Campaign tags: render directly as a clean visual Pill inside the input bar
      if (candidate.category === 'date' || candidate.category === 'page') {
        setMentionPills(prev => {
          const filtered = prev.filter(p => p.id !== candidate.id);
          return [
            ...filtered,
            {
              id: candidate.id,
              kind: candidate.category === 'date' ? 'date' : 'page',
              dateKind: candidate.dateKind,
              pageKind: candidate.pageKind,
              label: candidate.label,
              sublabel: candidate.sublabel,
              href: candidate.href,
              token: candidate.insertText.trim(),
            },
          ];
        });

        if (mentionMatch) {
          const before = value.slice(0, mentionMatch.atIndex);
          const after = value.slice(mentionMatch.endIndex).replace(/^\s+/, '');
          const next = `${before}${after}`;
          updateValueAndSpans(next);
          const nextCursor = before.length;
          setCaretPos(nextCursor);
          requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
          });
        } else {
          requestAnimationFrame(() => {
            textareaRef.current?.focus();
          });
        }

        setForceMentionOpen(false);
        setHoveredCandidateId(null);
        return;
      }

      // For @Person mentions: insert clean `@Name ` into the text input
      if (mentionMatch) {
        const before = value.slice(0, mentionMatch.atIndex);
        const after = value.slice(mentionMatch.endIndex);
        const next = `${before}${candidate.insertText}${after}`;
        updateValueAndSpans(next);
        const nextCursor = before.length + candidate.insertText.length;
        setCaretPos(nextCursor);
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      } else {
        const spacer = value && !value.endsWith(' ') ? ' ' : '';
        const next = `${value}${spacer}${candidate.insertText}`;
        updateValueAndSpans(next);
        const nextCursor = next.length;
        setCaretPos(nextCursor);
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      }

      setForceMentionOpen(false);
      setHoveredCandidateId(null);
    },
    [mentionMatch, value, updateValueAndSpans, onPickPerson, textareaRef]
  );

  // Sync text selection inside textarea for Floating Bubble Toolbar
  const syncSelectionState = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setCaretPos(el.selectionStart ?? value.length);
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end && value.slice(start, end).trim().length > 0) {
      setSelectionRange({ start, end });
    } else if (!showLinkInput && !showColorMenu) {
      setSelectionRange(null);
    }
  }, [textareaRef, value, showLinkInput, showColorMenu]);

  // Close menus on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setForceMentionOpen(false);
        setHoveredCandidateId(null);
        setSelectionRange(null);
        setShowLinkInput(false);
        setShowColorMenu(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // Apply WYSIWYG formatting from Floating Bubble Toolbar (without injecting raw tags into `value`!)
  const applyFormatting = useCallback(
    (toolId: BubbleToolItem['id'], extraArg?: string) => {
      const el = textareaRef.current;
      if (!el || !selectionRange) return;
      const { start, end } = selectionRange;
      if (end <= start) return;

      setRichSpans(prev => {
        const existingIdx = prev.findIndex(s => s.start === start && s.end === end);

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
            rawUrl.startsWith('http://') ||
            rawUrl.startsWith('https://') ||
            rawUrl.startsWith('/')
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
    [selectionRange, textareaRef]
  );

  // Trigger `@` button click on the right of the input bar
  const handleAtButtonClick = () => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) return;
    if (isMentionPopoverOpen) {
      setForceMentionOpen(false);
      return;
    }
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const needsAt = !/(?:^|\s)@[^\s@]*$/.test(before);
    if (needsAt) {
      const spacer = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
      const next = `${before}${spacer}@${after}`;
      const nextPos = before.length + spacer.length + 1;
      updateValueAndSpans(next);
      setCaretPos(nextPos);
      setForceMentionOpen(true);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      });
    } else {
      setForceMentionOpen(true);
      el.focus();
    }
  };

  // Handle file / image attachment upload via Paperclip button or Paste
  const handleFileUpload = async (file?: File) => {
    if (!file || disabled) return;
    setUploadingFile(true);
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const isImg = file.type.startsWith('image/') || isImageAttachment(file.name, '');
    const sizeLabel = formatBytes(file.size);

    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(`comments/${Date.now()}-${cleanName}`, file, { upsert: false });

      if (!error && data) {
        const publicUrl = supabase.storage.from('attachments').getPublicUrl(data.path).data
          .publicUrl;
        setAttachments(prev => [
          ...prev,
          {
            id: data.path,
            name: file.name,
            url: publicUrl,
            isImage: isImg,
            sizeLabel,
          },
        ]);
        toast.success(isEn ? `Uploaded ${file.name}` : `Đã tải lên ${file.name}`);
      } else {
        let fallbackUrl = `#attachment-${cleanName}`;
        if (isImg) {
          try {
            fallbackUrl = await fileToCompactDataUrl(file);
          } catch {
            fallbackUrl = URL.createObjectURL(file);
          }
        }
        setAttachments(prev => [
          ...prev,
          {
            id: `${Date.now()}-${cleanName}`,
            name: file.name,
            url: fallbackUrl,
            isImage: isImg,
            sizeLabel,
          },
        ]);
        toast.success(isEn ? `Attached ${file.name}` : `Đã đính kèm ${file.name}`);
      }
    } catch {
      let fallbackUrl = `#attachment-${cleanName}`;
      if (isImg) {
        try {
          fallbackUrl = await fileToCompactDataUrl(file);
        } catch {
          fallbackUrl = URL.createObjectURL(file);
        }
      }
      setAttachments(prev => [
        ...prev,
        {
          id: `${Date.now()}-${cleanName}`,
          name: file.name,
          url: fallbackUrl,
          isImage: isImg,
          sizeLabel,
        },
      ]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const canSend =
    (value.trim().length > 0 || mentionPills.length > 0 || attachments.length > 0) &&
    !disabled &&
    !saving &&
    !uploadingFile;

  const triggerSend = async () => {
    if (!canSend) return;
    const serializedText = serializeTextWithRichSpans(value, richSpans).trim();
    const pillMarkdown = mentionPills.map(p => p.token).join(' ');
    const textWithPills = [pillMarkdown, serializedText].filter(Boolean).join(' ');
    const attachmentMarkdown = attachments
      .map(att => {
        const prefix = att.isImage ? '🖼️' : '📎';
        return `[${prefix} ${att.name}](${att.url})`;
      })
      .join(' ');
    const combined = [textWithPills, attachmentMarkdown].filter(Boolean).join('\n');
    setMentionPills([]);
    setRichSpans([]);
    setAttachments([]);
    setForceMentionOpen(false);
    setSelectionRange(null);
    onChange('');
    await onSubmit(combined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Rich formatting keyboard shortcuts when text is selected
    if ((e.metaKey || e.ctrlKey) && selectionRange) {
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

    // Backspace at position 0 removes the last inline MentionPill
    if (
      e.key === 'Backspace' &&
      !value &&
      mentionPills.length > 0 &&
      (textareaRef.current?.selectionStart ?? 0) === 0
    ) {
      e.preventDefault();
      setMentionPills(prev => prev.slice(0, -1));
      return;
    }

    // Mention Popover keyboard navigation
    if (isMentionPopoverOpen && candidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredCandidateId(null);
        setActiveCandidateIdx(prev => (prev + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredCandidateId(null);
        setActiveCandidateIdx(prev => (prev - 1 + candidates.length) % candidates.length);
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !e.nativeEvent.isComposing) {
        const chosen = previewCandidate || candidates[activeCandidateIdx];
        if (chosen) {
          e.preventDefault();
          commitCandidate(chosen);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setForceMentionOpen(false);
        setHoveredCandidateId(null);
        return;
      }
    }

    if (e.key === 'Escape' && selectionRange) {
      setSelectionRange(null);
      setShowLinkInput(false);
      setShowColorMenu(false);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void triggerSend();
    }
  };

  // Check if current selection has active formatting for toolbar button highlight
  const activeSelectionFormats = useMemo(() => {
    if (!selectionRange) return {};
    const { start, end } = selectionRange;
    const overlapping = richSpans.filter(s => s.start <= start && s.end >= end);
    return {
      bold: overlapping.some(s => s.bold),
      italic: overlapping.some(s => s.italic),
      underline: overlapping.some(s => s.underline),
      link: overlapping.some(s => Boolean(s.link)),
      color: overlapping.some(s => Boolean(s.color)),
    };
  }, [selectionRange, richSpans]);

  const dateCandidates = candidates.filter(c => c.category === 'date');
  const personCandidates = candidates.filter(c => c.category === 'person');
  const pageCandidates = candidates.filter(c => c.category === 'page');
  const hasMirroredFormatting = richSpans.length > 0 && value.length > 0;

  return (
    <div ref={rootRef} className="smart-comment-root relative">
      {/* ========================================================
          FEATURE 2: FLOATING SELECTION BUBBLE TOOLBAR (5 tools: B, I, U, Link, Color)
         ======================================================== */}
      {selectionRange && (
        <div
          role="toolbar"
          aria-label="Text formatting toolbar"
          onMouseDown={e => {
            if ((e.target as HTMLElement).tagName !== 'INPUT') {
              e.preventDefault();
            }
          }}
          className="smart-comment-bubble-toolbar"
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
                className="bg-slate-800 text-white text-xs px-2 py-1 rounded-md outline-none border border-slate-600 focus:border-blue-500 w-48"
              />
              <button
                type="button"
                onClick={() => {
                  applyFormatting('link', linkUrlDraft || 'https://');
                  setLinkUrlDraft('');
                }}
                className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold"
              >
                Gắn link
              </button>
              <button
                type="button"
                onClick={() => setShowLinkInput(false)}
                className="p-1 text-slate-400 hover:text-white"
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
                      onMouseLeave={() =>
                        setHoveredToolId(prev => (prev === tool.id ? null : prev))
                      }
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
                      className={`smart-bubble-tool-btn ${isActive ? 'is-active' : ''}`}
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

              {/* Compact Color Swatch Menu */}
              {showColorMenu && (
                <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-xl z-50">
                  {TEXT_COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.label}
                      onClick={() => applyFormatting('color', preset.id)}
                      className="w-4 h-4 rounded-full border border-white/25 transition-transform hover:scale-125"
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
          FEATURE 1: `@` MENTION POPOVER WITH LIVE GHOST PREVIEW
         ======================================================== */}
      {isMentionPopoverOpen && candidates.length > 0 && (
        <div
          role="listbox"
          aria-label="Mention suggestions"
          className="smart-mention-popover custom-scrollbar"
        >
          {/* Category 1: Date / Reminder (Same colored pills as rendered in input & chat!) */}
          {dateCandidates.length > 0 && (
            <div className="mb-1.5">
              <div className="smart-mention-category-title">
                {isEn ? 'Date & Reminder' : 'Thời gian / Nhắc hẹn'}
              </div>
              {dateCandidates.map(item => {
                const isHighlighted = previewCandidate?.id === item.id;
                const pillTone =
                  item.dateKind === 'today'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : item.dateKind === 'tomorrow'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                    : 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHoveredCandidateId(item.id)}
                    onClick={() => commitCandidate(item)}
                    className={`smart-mention-item justify-between ${isHighlighted ? 'is-active' : ''}`}
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-bold ${pillTone}`}
                    >
                      {item.icon}
                      <span>@{item.label}</span>
                    </span>
                    {item.sublabel && (
                      <span className="text-[11px] font-medium text-gray-400 dark:text-slate-400 shrink-0">
                        {item.sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Category 2: People (Staff PICs) */}
          {personCandidates.length > 0 && (
            <div className="mb-1.5">
              <div className="smart-mention-category-title">
                {isEn ? 'People' : 'Người dùng (PIC)'}
              </div>
              {personCandidates.map(item => {
                const isHighlighted = previewCandidate?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHoveredCandidateId(item.id)}
                    onClick={() => commitCandidate(item)}
                    className={`smart-mention-item ${isHighlighted ? 'is-active' : ''}`}
                  >
                    <Avatar
                      name={item.person?.name || item.label}
                      src={item.person?.avatar_url || undefined}
                      className="w-6 h-6 text-[10px] shrink-0"
                    />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-xs font-bold text-gray-900 dark:text-white truncate">
                        {item.label}
                      </span>
                    </span>
                    {item.sublabel && (
                      <span className="text-[10.5px] text-gray-400 dark:text-slate-400 truncate max-w-[165px] shrink-0">
                        {item.sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Category 3: Staff-Related Projects / Campaigns */}
          {pageCandidates.length > 0 && (
            <div>
              <div className="smart-mention-category-title">
                {isEn ? 'Related Projects & Campaigns' : 'Liên kết trang / dự án của nhân sự'}
              </div>
              {pageCandidates.map(item => {
                const isHighlighted = previewCandidate?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHoveredCandidateId(item.id)}
                    onClick={() => commitCandidate(item)}
                    className={`smart-mention-item ${isHighlighted ? 'is-active' : ''}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-700/80 inline-flex items-center justify-center shrink-0">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-xs font-bold truncate">{item.label}</span>
                      {item.sublabel && (
                        <span className="block text-[10.5px] text-gray-400 dark:text-slate-400 truncate">
                          {item.sublabel}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ATTACHED FILE / IMAGE CHIPS (Bold filename, Hover mini image preview, Click full image modal)
         ======================================================== */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map(att => {
            const isHovered = hoveredAttachmentId === att.id;
            return (
              <div
                key={att.id}
                onMouseEnter={() => setHoveredAttachmentId(att.id)}
                onMouseLeave={() =>
                  setHoveredAttachmentId(prev => (prev === att.id ? null : prev))
                }
                onClick={() => {
                  if (att.isImage) {
                    setLightboxImage({ name: att.name, url: att.url });
                  } else if (att.url && !att.url.startsWith('#')) {
                    window.open(att.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-blue-50/90 hover:bg-blue-100/80 text-blue-800 border border-blue-200 dark:bg-slate-800 dark:text-blue-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                {att.isImage ? (
                  <ImageIcon size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                ) : (
                  <FileText size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <strong className="font-bold truncate max-w-[190px]">{att.name}</strong>
                {att.sizeLabel && (
                  <span className="text-[10px] opacity-70 shrink-0">({att.sizeLabel})</span>
                )}
                <button
                  type="button"
                  title="Gỡ tệp đính kèm"
                  onClick={e => {
                    e.stopPropagation();
                    setAttachments(prev => prev.filter(x => x.id !== att.id));
                  }}
                  className="ml-0.5 text-blue-400 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <X size={12} />
                </button>

                {/* Hover Mini Thumbnail Preview for Images */}
                {isHovered && att.isImage && att.url && !att.url.startsWith('#') && (
                  <div
                    role="tooltip"
                    className="smart-inline-hover-card bottom-full left-0 mb-2 p-1.5 rounded-xl bg-slate-900/95 text-white shadow-2xl border border-white/15 z-[95] pointer-events-none flex flex-col gap-1 w-40"
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-24 object-cover rounded-lg bg-slate-800"
                    />
                    <span className="text-[10px] font-bold truncate px-0.5 text-slate-100">
                      {att.name}
                    </span>
                    <span className="text-[9.5px] text-slate-400 px-0.5">
                      Nhấn để xem thông tin ảnh
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          BASE INPUT BAR (Clean single-line layout with inline visual MentionPills & WYSIWYG formatted text)
         ======================================================== */}
      <div className="smart-comment-bar">
        {/* Left: Current User Circular Avatar */}
        <Avatar
          name={profile?.name || 'User'}
          src={profile?.avatar_url || undefined}
          className="w-7 h-7 text-[10px] shrink-0 self-center"
        />

        {/* Middle: Inline Visual Pills (Date/Reminder & Project/Campaign) + WYSIWYG Textarea Input */}
        <div className="relative flex-1 min-w-0 flex flex-wrap items-center gap-1.5 min-h-[28px]">
          {mentionPills.map(pill => {
            const isHovered = hoveredPillId === pill.id;
            const toneClass =
              pill.kind === 'date'
                ? pill.dateKind === 'today'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : pill.dateKind === 'tomorrow'
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                  : 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30'
                : pill.pageKind === 'campaign'
                ? 'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30'
                : 'bg-violet-500/12 text-violet-800 dark:text-violet-300 border-violet-500/30';

            return (
              <span
                key={pill.id}
                onMouseEnter={() => setHoveredPillId(pill.id)}
                onMouseLeave={() => setHoveredPillId(prev => (prev === pill.id ? null : prev))}
                className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold shrink-0 select-none ${toneClass}`}
              >
                {pill.kind === 'date' ? (
                  pill.dateKind === 'today' ? (
                    <Clock size={12} className="text-amber-500 shrink-0" />
                  ) : (
                    <Calendar
                      size={12}
                      className={
                        pill.dateKind === 'tomorrow' ? 'text-blue-500 shrink-0' : 'text-violet-500 shrink-0'
                      }
                    />
                  )
                ) : pill.pageKind === 'campaign' ? (
                  <Layers size={12} className="text-amber-500 shrink-0" />
                ) : (
                  <FolderKanban size={12} className="text-violet-500 shrink-0" />
                )}
                <span className="truncate max-w-[160px]">
                  {pill.kind === 'date' ? `@${pill.label}` : pill.label}
                </span>
                <button
                  type="button"
                  title="Xoá thẻ"
                  onClick={() => setMentionPills(prev => prev.filter(p => p.id !== pill.id))}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={11} />
                </button>

                {/* Hover Tooltip: dd/mm/yyyy for Date pill, or full URL path for Project/Campaign pill */}
                {isHovered && (
                  <span
                    role="tooltip"
                    className="smart-inline-hover-card bottom-full left-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-xl border border-white/15 z-[95] pointer-events-none"
                  >
                    {pill.kind === 'date'
                      ? `📅 ${pill.sublabel}`
                      : pill.href
                      ? typeof window !== 'undefined' && pill.href.startsWith('/')
                        ? `${window.location.origin}${pill.href}`
                        : pill.href
                      : pill.sublabel}
                  </span>
                )}
              </span>
            );
          })}

          <div className="relative flex-1 min-w-[110px] flex items-center">
            {/* WYSIWYG Formatted Mirror Layer (renders Bold, Italic, Underline, Color, Link directly in place without raw tags!) */}
            {hasMirroredFormatting && (
              <div aria-hidden="true" className="smart-comment-rich-mirror">
                {renderMirrorSegments(value, richSpans)}
              </div>
            )}

            {/* Ghost Preview Mirror Layer right after `@query` */}
            {isMentionPopoverOpen && ghostSuffix && mentionMatch && !value.includes('\n') && (
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute inset-0 flex items-center overflow-hidden whitespace-pre text-sm leading-6"
              >
                <span className="invisible">{value.slice(0, mentionMatch.endIndex)}</span>
                <span className="text-gray-400/75 dark:text-slate-400 font-medium">
                  {ghostSuffix}
                </span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              disabled={disabled}
              value={value}
              onChange={e => {
                updateValueAndSpans(e.target.value);
                setCaretPos(e.target.selectionStart ?? e.target.value.length);
                if (!e.target.value.includes('@')) {
                  setForceMentionOpen(false);
                }
              }}
              onPaste={e => {
                const files = e.clipboardData?.files;
                if (files && files.length > 0) {
                  const imgFile = Array.from(files).find(f => f.type.startsWith('image/'));
                  if (imgFile) {
                    e.preventDefault();
                    void handleFileUpload(imgFile);
                  }
                }
              }}
              onSelect={syncSelectionState}
              onKeyUp={syncSelectionState}
              onMouseUp={syncSelectionState}
              onKeyDown={handleKeyDown}
              placeholder={
                mentionPills.length > 0
                  ? isEn
                    ? 'Write a message...'
                    : 'Nhập nội dung...'
                  : placeholder || (isEn ? 'Add a comment...' : 'Add a comment...')
              }
              aria-label={ariaLabel || (isEn ? 'Add a comment' : 'Viết bình luận')}
              className={`smart-comment-textarea ${hasMirroredFormatting ? 'is-mirrored' : ''}`}
            />
          </div>
        </div>

        {/* Right: Cluster of 3 Action Icons (Paperclip, @, Circular Up-Arrow Send) */}
        <div className="flex items-center gap-1.5 shrink-0 self-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            className="sr-only"
            onChange={e => void handleFileUpload(e.target.files?.[0])}
          />

          <button
            type="button"
            disabled={disabled || uploadingFile}
            title={isEn ? 'Attach image or file' : 'Đính kèm ảnh hoặc tệp'}
            aria-label={isEn ? 'Attach file' : 'Đính kèm tệp'}
            onClick={() => fileInputRef.current?.click()}
            className="smart-comment-icon-btn"
          >
            <Paperclip size={16} />
          </button>

          <button
            type="button"
            disabled={disabled}
            title={isEn ? 'Mention someone, date or project (@)' : 'Gắn thẻ người dùng, thời gian hoặc dự án (@)'}
            aria-label={isEn ? 'Mention (@)' : 'Gắn thẻ (@)'}
            onClick={handleAtButtonClick}
            className={`smart-comment-icon-btn ${isMentionPopoverOpen ? 'is-active' : ''}`}
          >
            <AtSign size={16} />
          </button>

          <button
            type="button"
            disabled={!canSend}
            title={saving ? (isEn ? 'Sending…' : 'Đang gửi…') : isEn ? 'Send comment' : 'Gửi bình luận'}
            aria-label={isEn ? 'Send comment' : 'Gửi bình luận'}
            onClick={() => void triggerSend()}
            className={`smart-comment-send-circle ${canSend ? 'is-active' : 'is-disabled'}`}
          >
            <ArrowUp size={14} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {/* Full Image Info Lightbox Modal */}
      <CommentImagePreviewModal
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};
