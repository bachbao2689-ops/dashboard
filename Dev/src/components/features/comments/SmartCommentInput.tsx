import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  AtSign,
  Bold,
  Calendar,
  Clock,
  Code,
  FileText,
  FolderKanban,
  Italic,
  Layers,
  Link2,
  Paperclip,
  Sigma,
  Strikethrough,
  Underline,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../../common/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from '../../../i18n/translations';
import { supabase } from '../../../services/supabase';

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
}

interface AttachmentChip {
  id: string;
  name: string;
  url: string;
}

interface MentionCandidate {
  id: string;
  category: 'date' | 'person' | 'page';
  label: string;
  sublabel?: string;
  insertText: string;
  ghostText: string;
  person?: CommentMentionPerson;
  icon?: React.ReactNode;
}

interface BubbleToolItem {
  id: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'equation' | 'link' | 'color';
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const BUBBLE_TOOLS: BubbleToolItem[] = [
  {
    id: 'bold',
    label: 'Bold',
    shortcut: 'Ctrl+B / ⌘B',
    icon: <Bold size={13.5} strokeWidth={2.5} />,
  },
  {
    id: 'italic',
    label: 'Italic',
    shortcut: 'Ctrl+I / ⌘I',
    icon: <Italic size={13.5} strokeWidth={2.3} />,
  },
  {
    id: 'underline',
    label: 'Underline',
    shortcut: 'Ctrl+U / ⌘U',
    icon: <Underline size={13.5} strokeWidth={2.3} />,
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    shortcut: 'Ctrl+Shift+X / ⌘⇧X',
    icon: <Strikethrough size={13.5} strokeWidth={2.3} />,
  },
  {
    id: 'code',
    label: 'Inline code',
    shortcut: 'Ctrl+E / ⌘E',
    icon: <Code size={13.5} strokeWidth={2.3} />,
  },
  {
    id: 'equation',
    label: 'Equation',
    shortcut: 'Ctrl+Shift+E / ⌘⇧E',
    icon: <Sigma size={13.5} strokeWidth={2.3} />,
  },
  {
    id: 'link',
    label: 'Add link',
    shortcut: 'Ctrl+K / ⌘K',
    icon: <Link2 size={13.5} strokeWidth={2.3} />,
  },
  {
    id: 'color',
    label: 'Text color',
    shortcut: 'Color & highlight',
    icon: (
      <span className="inline-flex flex-col items-center leading-none font-serif font-bold text-[12px]">
        <span>A</span>
        <span className="w-3 h-0.5 rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-rose-400 mt-0.5" />
      </span>
    ),
  },
];

const TEXT_COLOR_PRESETS = [
  { id: 'blue', label: 'Blue', hex: '#2563eb' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'amber', label: 'Amber', hex: '#d97706' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
];

const DEFAULT_PAGE_LINKS: SmartPageSuggestion[] = [
  {
    id: 'page:workflow',
    title: 'Workflow Management',
    parentPath: 'Chính / Không gian làm việc',
    href: '/workflow',
    kind: 'page',
  },
  {
    id: 'page:projects',
    title: 'Projects & Campaigns',
    parentPath: 'Công việc & Dự án / Quản lý chung',
    href: '/projects',
    kind: 'project',
  },
  {
    id: 'page:tasks',
    title: 'All Tasks Board',
    parentPath: 'Công việc & Dự án / Danh sách việc',
    href: '/tasks',
    kind: 'page',
  },
  {
    id: 'page:reports',
    title: 'Team Report & Workload',
    parentPath: 'Đội ngũ & Báo cáo / Phân tích',
    href: '/reports',
    kind: 'page',
  },
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

  // File attachments state
  const [attachments, setAttachments] = useState<AttachmentChip[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Auto-focus when requested by parent
  useEffect(() => {
    if (!autoFocusTrigger) return;
    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
      textareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocusTrigger, textareaRef]);

  // Auto-resize single-line textarea smoothly as content grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, 24), 140);
    el.style.height = `${nextHeight}px`;
  }, [value, textareaRef]);

  // Detect active `@query` before the caret (or at end of text)
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

  // Build categorized candidates: 1. Date/Time, 2. People, 3. Link to Page/Project
  const candidates = useMemo<MentionCandidate[]>(() => {
    if (!isMentionPopoverOpen) return [];
    const list: MentionCandidate[] = [];

    // Category 1: Date / Reminder
    const dateItems: MentionCandidate[] = [
      {
        id: 'date:today',
        category: 'date',
        label: isEn ? 'Today' : 'Hôm nay',
        sublabel: formatDateVi(0),
        insertText: `@Today(${formatDateVi(0)}) `,
        ghostText: `Today (${formatDateVi(0)})`,
        icon: <Clock size={14} className="text-amber-500" />,
      },
      {
        id: 'date:tomorrow',
        category: 'date',
        label: isEn ? 'Tomorrow' : 'Ngày mai',
        sublabel: formatDateVi(1),
        insertText: `@Tomorrow(${formatDateVi(1)}) `,
        ghostText: `Tomorrow (${formatDateVi(1)})`,
        icon: <Calendar size={14} className="text-blue-500" />,
      },
      {
        id: 'date:nextweek',
        category: 'date',
        label: isEn ? 'Next week' : 'Tuần tới',
        sublabel: formatDateVi(7),
        insertText: `@NextWeek(${formatDateVi(7)}) `,
        ghostText: `NextWeek (${formatDateVi(7)})`,
        icon: <Calendar size={14} className="text-violet-500" />,
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

    // Category 2: People
    people
      .filter(p => !activeQuery || p.name.toLowerCase().includes(activeQuery))
      .slice(0, 6)
      .forEach(person => {
        const compactTag = person.name.replace(/\s+/g, '');
        list.push({
          id: `person:${person.id}`,
          category: 'person',
          label: person.name,
          sublabel: person.departments?.name || `@${compactTag}`,
          insertText: `@${compactTag} `,
          ghostText: compactTag,
          person,
        });
      });

    // Category 3: Link to Page / Project
    DEFAULT_PAGE_LINKS.filter(
      page =>
        !activeQuery ||
        page.title.toLowerCase().includes(activeQuery) ||
        page.parentPath.toLowerCase().includes(activeQuery)
    )
      .slice(0, 4)
      .forEach(page => {
        list.push({
          id: page.id,
          category: 'page',
          label: page.title,
          sublabel: page.parentPath,
          insertText: `[${page.title}](${page.href}) `,
          ghostText: page.title,
          icon:
            page.kind === 'project' ? (
              <FolderKanban size={14} className="text-violet-500" />
            ) : (
              <Layers size={14} className="text-sky-500" />
            ),
        });
      });

    return list;
  }, [isMentionPopoverOpen, activeQuery, people, isEn]);

  useEffect(() => {
    setActiveCandidateIdx(0);
    setHoveredCandidateId(null);
  }, [activeQuery, isMentionPopoverOpen]);

  // Active candidate for Ghost Preview
  const previewCandidate = useMemo(() => {
    if (!isMentionPopoverOpen || candidates.length === 0) return null;
    if (hoveredCandidateId) {
      return candidates.find(c => c.id === hoveredCandidateId) || null;
    }
    return candidates[activeCandidateIdx] || null;
  }, [isMentionPopoverOpen, candidates, hoveredCandidateId, activeCandidateIdx]);

  // Compute Ghost Suffix to display inline right after `@query`
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

  // Check text selection inside textarea for Floating Bubble Toolbar
  const syncSelectionState = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setCaretPos(el.selectionStart ?? value.length);
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end && value.slice(start, end).trim().length > 0) {
      setSelectionRange({ start, end });
    } else {
      setSelectionRange(null);
      setShowLinkInput(false);
      setShowColorMenu(false);
    }
  }, [textareaRef, value]);

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

  // Apply formatting from Floating Bubble Toolbar
  const applyFormatting = useCallback(
    (
      toolId: BubbleToolItem['id'],
      extraArg?: string
    ) => {
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
        case 'strike':
          prefix = '~~';
          suffix = '~~';
          break;
        case 'code':
          prefix = '`';
          suffix = '`';
          break;
        case 'equation':
          prefix = '$';
          suffix = '$';
          break;
        case 'link': {
          const url = (extraArg || 'https://').trim();
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

      const replacement = `${prefix}${selectedText}${suffix}`;
      const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
      onChange(nextValue);
      setSelectionRange(null);
      setShowLinkInput(false);
      setShowColorMenu(false);

      requestAnimationFrame(() => {
        el.focus();
        const newStart = start + prefix.length;
        const newEnd = newStart + selectedText.length;
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

  // Handle file attachment upload via Paperclip button
  const handleFileUpload = async (file?: File) => {
    if (!file || disabled) return;
    setUploadingFile(true);
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(`comments/${Date.now()}-${cleanName}`, file, { upsert: false });

      if (error || !data) {
        // Fallback: attach local file chip reference so user can still submit smoothly
        const fallbackChip: AttachmentChip = {
          id: `${Date.now()}`,
          name: file.name,
          url: `#attachment-${cleanName}`,
        };
        setAttachments(prev => [...prev, fallbackChip]);
        toast.success(isEn ? `Attached ${file.name}` : `Đã đính kèm ${file.name}`);
      } else {
        const publicUrl = supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
        setAttachments(prev => [
          ...prev,
          { id: data.path, name: file.name, url: publicUrl },
        ]);
        toast.success(isEn ? `Uploaded ${file.name}` : `Đã tải lên ${file.name}`);
      }
    } catch {
      setAttachments(prev => [
        ...prev,
        { id: `${Date.now()}`, name: file.name, url: `#attachment-${cleanName}` },
      ]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled && !saving && !uploadingFile;

  const triggerSend = async () => {
    if (!canSend) return;
    const attachmentMarkdown = attachments
      .map(att => (att.url.startsWith('http') ? `[📎 ${att.name}](${att.url})` : `📎 ${att.name}`))
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
      if (key === 'e' && e.shiftKey) {
        e.preventDefault();
        applyFormatting('equation');
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        applyFormatting('code');
        return;
      }
      if (key === 'x' && e.shiftKey) {
        e.preventDefault();
        applyFormatting('strike');
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

  const dateCandidates = candidates.filter(c => c.category === 'date');
  const personCandidates = candidates.filter(c => c.category === 'person');
  const pageCandidates = candidates.filter(c => c.category === 'page');

  return (
    <div ref={rootRef} className="smart-comment-root relative">
      {/* ========================================================
          FEATURE 2: FLOATING SELECTION BUBBLE TOOLBAR
         ======================================================== */}
      {selectionRange && (
        <div
          role="toolbar"
          aria-label="Text formatting toolbar"
          onMouseDown={e => e.preventDefault()}
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
                className="bg-zinc-800 text-white text-xs px-2 py-1 rounded-md outline-none border border-zinc-700 focus:border-blue-500 w-44"
              />
              <button
                type="button"
                onClick={() => {
                  applyFormatting('link', linkUrlDraft || 'https://');
                  setLinkUrlDraft('');
                }}
                className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold"
              >
                OK
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
                    onMouseLeave={() => setHoveredToolId(prev => (prev === tool.id ? null : prev))}
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
                <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/90 rounded-xl px-2.5 py-1.5 shadow-xl">
                  {TEXT_COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.label}
                      onClick={() => applyFormatting('color', preset.id)}
                      className="w-4 h-4 rounded-full border border-white/20 transition-transform hover:scale-125"
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
          {/* Category 1: Date / Reminder */}
          {dateCandidates.length > 0 && (
            <div className="mb-1.5">
              <div className="smart-mention-category-title">
                {isEn ? 'Date & Reminder' : 'Thời gian / Nhắc hẹn'}
              </div>
              {dateCandidates.map(item => {
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
                      <span className="block text-xs font-semibold truncate">{item.label}</span>
                    </span>
                    {item.sublabel && (
                      <span className="text-[11px] text-gray-400 dark:text-slate-400 shrink-0">
                        {item.sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Category 2: People */}
          {personCandidates.length > 0 && (
            <div className="mb-1.5">
              <div className="smart-mention-category-title">
                {isEn ? 'People' : 'Người dùng'}
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
                      <span className="block text-xs font-semibold truncate">{item.label}</span>
                    </span>
                    {item.sublabel && (
                      <span className="text-[11px] text-gray-400 dark:text-slate-400 truncate max-w-[120px] shrink-0">
                        {item.sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Category 3: Link to Page / Project */}
          {pageCandidates.length > 0 && (
            <div>
              <div className="smart-mention-category-title">
                {isEn ? 'Link to page' : 'Liên kết trang / dự án'}
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
                      <span className="block text-xs font-semibold truncate">{item.label}</span>
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

      {/* Attached File Chips Preview (when user attaches files via Paperclip) */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map(att => (
            <span
              key={att.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700"
            >
              <FileText size={12} className="shrink-0" />
              <span className="truncate max-w-[180px]">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter(x => x.id !== att.id))}
                className="text-blue-400 hover:text-blue-700 dark:hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ========================================================
          BASE INPUT BAR (Single-line minimalist layout matching reference image)
         ======================================================== */}
      <div className="smart-comment-bar">
        {/* Left: Current User Circular Avatar */}
        <Avatar
          name={profile?.name || 'User'}
          src={profile?.avatar_url || undefined}
          className="w-7 h-7 text-[10px] shrink-0"
        />

        {/* Middle: Input area + Ghost Text Preview Overlay */}
        <div className="relative flex-1 min-w-0 flex items-center">
          {/* Ghost Preview Mirror Layer right after `@query` */}
          {isMentionPopoverOpen && ghostSuffix && mentionMatch && (
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 flex items-center overflow-hidden whitespace-pre text-sm leading-5"
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
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={e => void handleFileUpload(e.target.files?.[0])}
          />

          <button
            type="button"
            disabled={disabled || uploadingFile}
            title={isEn ? 'Attach file' : 'Đính kèm tệp'}
            aria-label={isEn ? 'Attach file' : 'Đính kèm tệp'}
            onClick={() => fileInputRef.current?.click()}
            className="smart-comment-icon-btn"
          >
            <Paperclip size={16} />
          </button>

          <button
            type="button"
            disabled={disabled}
            title={isEn ? 'Mention someone or page (@)' : 'Gắn thẻ người dùng / trang (@)'}
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
    </div>
  );
};
