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
  RichCommentBody,
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

interface MentionCandidate {
  id: string;
  category: 'date' | 'person' | 'page';
  dateKind?: 'today' | 'tomorrow' | 'nextweek';
  label: string;
  sublabel?: string;
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
    // Check if any staff is already mentioned in the comment text
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

    // Category 1: Date / Reminder (with matching pill colors in popup & chat)
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
        insertText: `@Today(${todayDate}) `,
        ghostText: isEn ? `Today (${todayDate})` : `Hôm nay (${todayDate})`,
        icon: <Clock size={13} className="text-amber-500" />,
      },
      {
        id: 'date:tomorrow',
        category: 'date',
        dateKind: 'tomorrow',
        label: isEn ? 'Tomorrow' : 'Ngày mai',
        sublabel: tomorrowDate,
        insertText: `@Tomorrow(${tomorrowDate}) `,
        ghostText: isEn ? `Tomorrow (${tomorrowDate})` : `Ngày mai (${tomorrowDate})`,
        icon: <Calendar size={13} className="text-blue-500" />,
      },
      {
        id: 'date:nextweek',
        category: 'date',
        dateKind: 'nextweek',
        label: isEn ? 'Next week' : 'Tuần tới',
        sublabel: nextWeekDate,
        insertText: `@NextWeek(${nextWeekDate}) `,
        ghostText: isEn ? `Next week (${nextWeekDate})` : `Tuần tới (${nextWeekDate})`,
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
        // Find which projects this staff member belongs to so we can show it in sublabel!
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
          label: proj.title,
          sublabel: proj.parentPath,
          insertText: `[${prefixIcon} ${proj.title}](${proj.href}) `,
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

      if (mentionMatch) {
        const before = value.slice(0, mentionMatch.atIndex);
        const after = value.slice(mentionMatch.endIndex);
        const next = `${before}${candidate.insertText}${after}`;
        onChange(next);
        const nextCursor = before.length + candidate.insertText.length;
        setCaretPos(nextCursor);
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      } else {
        const spacer = value && !value.endsWith(' ') ? ' ' : '';
        const next = `${value}${spacer}${candidate.insertText}`;
        onChange(next);
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
    [mentionMatch, value, onChange, onPickPerson, textareaRef]
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

  // Apply formatting from Floating Bubble Toolbar (with toggle support!)
  const applyFormatting = useCallback(
    (toolId: BubbleToolItem['id'], extraArg?: string) => {
      const el = textareaRef.current;
      if (!el || !selectionRange) return;
      const { start, end } = selectionRange;
      const selectedText = value.slice(start, end);
      if (!selectedText) return;

      let prefix = '';
      let suffix = '';

      switch (toolId) {
        case 'bold':
          prefix = '**';
          suffix = '**';
          break;
        case 'italic':
          prefix = '*';
          suffix = '*';
          break;
        case 'underline':
          prefix = '<u>';
          suffix = '</u>';
          break;
        case 'link': {
          const rawUrl = (extraArg || 'https://').trim();
          const url =
            rawUrl.startsWith('http://') ||
            rawUrl.startsWith('https://') ||
            rawUrl.startsWith('/')
              ? rawUrl
              : `https://${rawUrl}`;
          prefix = '[';
          suffix = `](${url})`;
          break;
        }
        case 'color': {
          const colorName = extraArg || 'blue';
          prefix = `[color:${colorName}]`;
          suffix = '[/color]';
          break;
        }
      }

      // Toggle off if already wrapped with the same formatting
      const beforeSlice = value.slice(Math.max(0, start - prefix.length), start);
      const afterSlice = value.slice(end, end + suffix.length);
      if (
        toolId !== 'link' &&
        toolId !== 'color' &&
        beforeSlice === prefix &&
        afterSlice === suffix
      ) {
        const nextValue = `${value.slice(0, start - prefix.length)}${selectedText}${value.slice(
          end + suffix.length
        )}`;
        onChange(nextValue);
        const newStart = start - prefix.length;
        const newEnd = newStart + selectedText.length;
        setSelectionRange({ start: newStart, end: newEnd });
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(newStart, newEnd);
        });
        return;
      }

      // If selectedText is already wrapped in [color:...]...[/color] and user picks a new color, replace the color tag
      let cleanSelected = selectedText;
      if (toolId === 'color') {
        cleanSelected = selectedText.replace(
          /^\[color:[a-zA-Z0-9#]+\]([\s\S]*)\[\/color\]$/,
          '$1'
        );
      }

      const replacement = `${prefix}${cleanSelected}${suffix}`;
      const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
      onChange(nextValue);
      setShowLinkInput(false);
      setShowColorMenu(false);

      const newStart = start + prefix.length;
      const newEnd = newStart + cleanSelected.length;
      setSelectionRange({ start: newStart, end: newEnd });

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newStart, newEnd);
      });
    },
    [selectionRange, textareaRef, value, onChange]
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
      onChange(next);
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
        // Fallback: try 'avatars' bucket or compact Data URL for images so preview & modal always work
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
    (value.trim().length > 0 || attachments.length > 0) &&
    !disabled &&
    !saving &&
    !uploadingFile;

  const triggerSend = async () => {
    if (!canSend) return;
    const attachmentMarkdown = attachments
      .map(att => {
        const prefix = att.isImage ? '🖼️' : '📎';
        return `[${prefix} ${att.name}](${att.url})`;
      })
      .join(' ');
    const combined = [value.trim(), attachmentMarkdown].filter(Boolean).join('\n');
    if (attachments.length > 0 && value.trim() !== combined) {
      onChange(combined);
    }
    setAttachments([]);
    setForceMentionOpen(false);
    setSelectionRange(null);
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

  // Detect whether `value` contains rich formatting or special tags to show the Live Formatted Preview bar
  const hasRichTokensInDraft = useMemo(() => {
    if (!value.trim()) return false;
    return /(\*\*[^*]+\*\*|\*[^*]+\*|<u>[\s\S]+?<\/u>|\[color:[a-zA-Z0-9#]+\][\s\S]+?\[\/color\]|@(?:Today|Tomorrow|NextWeek)\([^)]+\)|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+)/.test(
      value
    );
  }, [value]);

  const dateCandidates = candidates.filter(c => c.category === 'date');
  const personCandidates = candidates.filter(c => c.category === 'person');
  const pageCandidates = candidates.filter(c => c.category === 'page');

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
            // Keep textarea selection intact unless clicking inside the link URL input
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
                className="bg-zinc-800 text-white text-xs px-2 py-1 rounded-md outline-none border border-zinc-700 focus:border-blue-500 w-48"
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
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 relative">
              {BUBBLE_TOOLS.map(tool => (
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
                    className="smart-bubble-tool-btn"
                  >
                    {tool.icon}
                  </button>

                  {/* 2-Line Shortcut Tooltip */}
                  {hoveredToolId === tool.id && !showColorMenu && (
                    <div className="smart-bubble-tooltip" role="tooltip">
                      <span className="font-semibold text-white leading-tight">{tool.label}</span>
                      <span className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                        {tool.shortcut}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Compact Color Swatch Menu */}
              {showColorMenu && (
                <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/90 rounded-xl px-2.5 py-1.5 shadow-xl z-50">
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
          {/* Category 1: Date / Reminder (Same colored pills as rendered in chat!) */}
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
          LIVE RICH FORMATTING & TAG PREVIEW (Shows live Bold/Italic/Underline/Color/Links/Date pills while composing)
         ======================================================== */}
      {hasRichTokensInDraft && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-blue-50/55 dark:bg-slate-800/70 border border-blue-200/60 dark:border-slate-700 text-xs text-gray-800 dark:text-slate-100 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mr-2">
              Xem trước:
            </span>
            <RichCommentBody body={value} className="inline text-xs" />
          </div>
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
                    className="smart-inline-hover-card bottom-full left-0 mb-2 p-1.5 rounded-xl bg-zinc-900/95 text-white shadow-2xl border border-white/15 z-[95] pointer-events-none flex flex-col gap-1 w-40"
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-24 object-cover rounded-lg bg-zinc-800"
                    />
                    <span className="text-[10px] font-bold truncate px-0.5 text-zinc-100">
                      {att.name}
                    </span>
                    <span className="text-[9.5px] text-zinc-400 px-0.5">
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
          BASE INPUT BAR (Strictly aligned single-line layout)
         ======================================================== */}
      <div className="smart-comment-bar">
        {/* Left: Current User Circular Avatar */}
        <Avatar
          name={profile?.name || 'User'}
          src={profile?.avatar_url || undefined}
          className="w-7 h-7 text-[10px] shrink-0 self-center"
        />

        {/* Middle: Input area + Ghost Text Preview Overlay */}
        <div className="relative flex-1 min-w-0 flex items-center min-h-[28px]">
          {/* Ghost Preview Mirror Layer right after `@query` */}
          {isMentionPopoverOpen && ghostSuffix && mentionMatch && ! value.includes('\n') && (
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 flex items-center overflow-hidden whitespace-pre text-sm leading-6"
            >
              <span className="invisible">{value.slice(0, mentionMatch.endIndex)}</span>
              <span className="text-gray-400/75 dark:text-slate-500 font-medium">
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
              onChange(e.target.value);
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
            placeholder={placeholder || (isEn ? 'Add a comment...' : 'Add a comment...')}
            aria-label={ariaLabel || (isEn ? 'Add a comment' : 'Viết bình luận')}
            className="smart-comment-textarea"
          />
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
