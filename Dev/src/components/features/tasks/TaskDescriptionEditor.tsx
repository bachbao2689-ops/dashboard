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

interface SelectionTarget {
  blockIndex: number;
  colIndex?: number;
  start: number;
  end: number;
}

interface AttachmentChip {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
  sizeLabel?: string;
}

interface BubbleToolItem {
  id: 'bold' | 'italic' | 'underline' | 'link' | 'color';
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

/**
 * 5 Exact formatting tools matching SmartCommentInput 1:1:
 * 1. Bold, 2. Italic, 3. Underline, 4. Link, 5. Color text (A with rainbow underline)
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
 * Extracts attached chips [🖼️ name](url) or legacy ![image](url) from raw description
 * so textareas remain completely clean, without raw URL spam.
 */
function extractAttachmentsAndCleanText(rawText: string): {
  cleanText: string;
  attachments: AttachmentChip[];
} {
  if (!rawText || !rawText.trim()) return { cleanText: '', attachments: [] };

  const attachments: AttachmentChip[] = [];
  const seenUrls = new Set<string>();

  // 1. Match [🖼️ name](url) or [📎 name](url) or attachment URLs
  const chipRegex = /\[([📎🖼️]?\s*[^\]]+)\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+|#[^\s)]+)\)/g;
  let text = rawText.replace(chipRegex, (_fullMatch, label, url) => {
    const trimmedLabel = String(label).trim();
    const isImage =
      trimmedLabel.startsWith('🖼️') ||
      isImageAttachment(trimmedLabel, url) ||
      url.includes('/storage/v1/object/public/attachments/') ||
      url.startsWith('data:image/');

    const cleanName = trimmedLabel.replace(/^[📎🖼️]\s*/, '').trim() || (isImage ? 'image.png' : 'file');

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

  // 2. Match legacy ![image](url)
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
    cleanText: text.trim(),
    attachments,
  };
}

/**
 * Combines serialized structured blocks and attachment chips into single stored markdown string.
 */
function serializeAll(blocks: DescriptionBlock[], attachments: AttachmentChip[]): string {
  const textContent = serializeBlocksToDescription(blocks).trim();
  const attachmentMarkdown = attachments
    .map(att => {
      const prefix = att.isImage ? '🖼️' : '📎';
      return `[${prefix} ${att.name}](${att.url})`;
    })
    .join(' ');

  return [textContent, attachmentMarkdown].filter(Boolean).join('\n\n');
}

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

  // Extract initial attachments and text blocks
  const initialData = useMemo(() => extractAttachmentsAndCleanText(value), [value]);
  const [blocks, setBlocks] = useState<DescriptionBlock[]>(() =>
    parseDescriptionToBlocks(initialData.cleanText)
  );
  const [attachments, setAttachments] = useState<AttachmentChip[]>(initialData.attachments);

  // Image preview modal and hover tooltip state
  const [lightboxImage, setLightboxImage] = useState<{ name: string; url: string } | null>(null);
  const [hoveredAttachmentId, setHoveredAttachmentId] = useState<string | null>(null);

  const isInternalUpdateRef = useRef(false);
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const parsed = extractAttachmentsAndCleanText(value);
    setBlocks(parseDescriptionToBlocks(parsed.cleanText));
    setAttachments(parsed.attachments);
  }, [value]);

  // Floating Bubble Toolbar state (exact same as comments)
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

  const commitAll = useCallback(
    (newBlocks: DescriptionBlock[], newAtts: AttachmentChip[]) => {
      setBlocks(newBlocks);
      setAttachments(newAtts);
      isInternalUpdateRef.current = true;
      const serialized = serializeAll(newBlocks, newAtts);
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

  // Text selection tracking across all textareas
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

  // Check which formatting tools are active on current selection
  const activeSelectionFormats = useMemo(() => {
    if (!selectionTarget) return {};
    const { blockIndex, colIndex, start, end } = selectionTarget;
    const targetBlock = blocks[blockIndex];
    if (!targetBlock) return {};
    const text =
      (colIndex !== undefined && targetBlock.columns
        ? targetBlock.columns[colIndex]
        : targetBlock.text) || '';

    if (end <= start || end > text.length) return {};
    const before = text.slice(0, start);
    const after = text.slice(end);
    const selected = text.slice(start, end);

    const isBold =
      (before.endsWith('**') && after.startsWith('**')) ||
      (selected.startsWith('**') && selected.endsWith('**'));
    const isItalic =
      (before.endsWith('*') && after.startsWith('*') && !before.endsWith('**')) ||
      (selected.startsWith('*') && selected.endsWith('*'));
    const isUnderline =
      (before.endsWith('<u>') && after.startsWith('</u>')) ||
      (selected.startsWith('<u>') && selected.endsWith('</u>'));
    const isColor = /\[color:[a-zA-Z0-9#]+\]$/.test(before) && after.startsWith('[/color]');
    const isLink = /\[$/.test(before) && after.startsWith('](');

    return {
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      link: isLink,
      color: isColor,
    };
  }, [selectionTarget, blocks]);

  // Wrap selected text with formatting
  const applyFormatting = useCallback(
    (toolId: BubbleToolItem['id'], extraArg?: string) => {
      if (!selectionTarget) return;
      const { blockIndex, colIndex, start, end } = selectionTarget;

      const newBlocks = [...blocks];
      const targetBlock = { ...newBlocks[blockIndex] };

      let currentText = '';
      if (colIndex !== undefined && targetBlock.columns) {
        currentText = targetBlock.columns[colIndex] || '';
      } else {
        currentText = targetBlock.text || '';
      }

      if (end <= start) return;
      const selected = currentText.slice(start, end);

      let prefix = '';
      let suffix = '';

      if (toolId === 'bold') {
        prefix = '**';
        suffix = '**';
      } else if (toolId === 'italic') {
        prefix = '*';
        suffix = '*';
      } else if (toolId === 'underline') {
        prefix = '<u>';
        suffix = '</u>';
      } else if (toolId === 'link') {
        prefix = '[';
        suffix = `](${extraArg || 'https://'})`;
      } else if (toolId === 'color') {
        prefix = `[color:${extraArg || 'blue'}]`;
        suffix = '[/color]';
      }

      let nextText = '';
      if (
        currentText.slice(Math.max(0, start - prefix.length), start) === prefix &&
        currentText.slice(end, end + suffix.length) === suffix
      ) {
        // Toggle off
        nextText =
          currentText.slice(0, start - prefix.length) +
          selected +
          currentText.slice(end + suffix.length);
      } else {
        // Apply
        nextText =
          currentText.slice(0, start) +
          prefix +
          selected +
          suffix +
          currentText.slice(end);
      }

      if (colIndex !== undefined && targetBlock.columns) {
        const nextCols = [...targetBlock.columns];
        nextCols[colIndex] = nextText;
        targetBlock.columns = nextCols;
      } else {
        targetBlock.text = nextText;
      }

      newBlocks[blockIndex] = targetBlock;
      commitAll(newBlocks, attachments);
      setSelectionTarget(null);
      setShowColorMenu(false);
      setShowLinkInput(false);
    },
    [selectionTarget, blocks, attachments, commitAll]
  );

  // Pick columns from slash command: IMMEDIATELY hides UI and activates columns
  const handleSelectColumns = (blockIndex: number, count: 2 | 3) => {
    const newBlocks = [...blocks];
    const current = newBlocks[blockIndex];

    // Remove /column or /col trigger text
    let textBefore = current?.text || '';
    textBefore = textBefore.replace(/\/(column|col)(\s*[23])?$/i, '').trimEnd();

    const columnBlock: DescriptionBlock = {
      id: `col_${Date.now()}`,
      type: 'columns',
      columnCount: count,
      columns: Array.from({ length: count }, () => ''),
    };

    const nextNormalBlock: DescriptionBlock = {
      id: `txt_${Date.now() + 1}`,
      type: 'text',
      text: '',
    };

    if (textBefore.trim()) {
      current.text = textBefore;
      newBlocks.splice(blockIndex + 1, 0, columnBlock, nextNormalBlock);
    } else {
      newBlocks.splice(blockIndex, 1, columnBlock, nextNormalBlock);
    }

    commitAll(newBlocks, attachments);
    setSlashMenu(null);

    // Focus into the first column line immediately
    setTimeout(() => {
      const firstColInput = document.getElementById(
        `desc-col-${textBefore.trim() ? blockIndex + 1 : blockIndex}-0`
      ) as HTMLTextAreaElement | null;
      firstColInput?.focus();
    }, 50);
  };

  // Handle normal text change & detect /column
  const handleTextChange = (
    blockIndex: number,
    textVal: string,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], text: textVal };
    commitAll(newBlocks, attachments);

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

  // Keyboard shortcuts inside textareas
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    blockIndex: number,
    colIndex?: number
  ) => {
    if ((e.metaKey || e.ctrlKey) && selectionTarget) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormatting('bold');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormatting('italic');
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        applyFormatting('underline');
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

    // Inside column navigation & "xuống dòng sẽ hết tính năng column"
    if (colIndex !== undefined) {
      const targetBlock = blocks[blockIndex];
      const count = targetBlock.columnCount || 2;

      // Tab moves to next/prev column
      if (e.key === 'Tab') {
        e.preventDefault();
        const nextIdx = e.shiftKey ? colIndex - 1 : colIndex + 1;
        if (nextIdx >= 0 && nextIdx < count) {
          const nextEl = document.getElementById(`desc-col-${blockIndex}-${nextIdx}`) as HTMLTextAreaElement | null;
          nextEl?.focus();
        }
        return;
      }

      // Enter without Shift:
      // If in earlier column and next column is empty, focus next column.
      // Otherwise, drop down to the normal text line below ("hết tính năng column")
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (colIndex < count - 1 && !(targetBlock.columns?.[colIndex + 1]?.trim())) {
          const nextColInput = document.getElementById(`desc-col-${blockIndex}-${colIndex + 1}`) as HTMLTextAreaElement | null;
          nextColInput?.focus();
        } else {
          // Reached last column or finishing column row -> drop down to normal line
          const nextBlocks = [...blocks];
          if (blockIndex === nextBlocks.length - 1 || nextBlocks[blockIndex + 1]?.type !== 'text') {
            nextBlocks.splice(blockIndex + 1, 0, {
              id: `txt_${Date.now()}`,
              type: 'text',
              text: '',
            });
            commitAll(nextBlocks, attachments);
          }
          setTimeout(() => {
            const nextTextEl = document.getElementById(`desc-txt-${blockIndex + 1}`) as HTMLTextAreaElement | null;
            nextTextEl?.focus();
          }, 50);
        }
      }
    }
  };

  // Update text inside a column
  const handleColChange = (blockIndex: number, colIndex: number, textVal: string) => {
    const newBlocks = [...blocks];
    const target = { ...newBlocks[blockIndex] };
    if (!target.columns) return;
    const nextCols = [...target.columns];
    nextCols[colIndex] = textVal;
    target.columns = nextCols;
    newBlocks[blockIndex] = target;
    commitAll(newBlocks, attachments);
  };

  // Paste image clipboard handler (matches SmartCommentInput 1:1, creates attachment chip, NO raw URLs!)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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

          const newAtts: AttachmentChip[] = [
            ...attachments,
            {
              id: `${Date.now()}-${cleanName}`,
              name: imgFile.name,
              url: publicUrl,
              isImage: true,
              sizeLabel,
            },
          ];

          commitAll(blocks, newAtts);
          toast.success('Đã tải hình ảnh', { id: toastId });
        } catch {
          toast.error('Không thể tải hình ảnh', { id: toastId });
        }
      }
    }
  };

  return (
    <div ref={rootRef} className={`w-full space-y-2 ${className}`}>
      {/* Outer relative wrapper to hold unclipped floating toolbar right above the box */}
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
        <div className="w-full rounded-2xl border border-primary/40 bg-white dark:bg-slate-900 p-3.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all relative resize-y overflow-auto min-h-[140px] max-h-[680px] space-y-2">
          {/* ========================================================
              ATTACHED IMAGE / FILE CHIPS (Clean chips, NO raw URLs!)
             ======================================================== */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2 mb-1 border-b border-gray-100 dark:border-slate-800">
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
                        const next = attachments.filter(x => x.id !== att.id);
                        commitAll(blocks, next);
                      }}
                      className="ml-0.5 text-blue-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
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
              CONTENT LINES (Normal text lines & Clean Column Lines)
             ======================================================== */}
          {blocks.map((block, bIdx) => {
            if (block.type === 'text') {
              return (
                <textarea
                  key={block.id || bIdx}
                  id={`desc-txt-${bIdx}`}
                  autoFocus={autoFocus && bIdx === 0}
                  value={block.text || ''}
                  rows={Math.max(2, Math.min(6, (block.text || '').split('\n').length))}
                  onChange={e => handleTextChange(bIdx, e.target.value, e)}
                  onSelect={e => syncSelection(e, bIdx)}
                  onKeyUp={e => syncSelection(e, bIdx)}
                  onMouseUp={e => syncSelection(e, bIdx)}
                  onKeyDown={e => handleKeyDown(e, bIdx)}
                  onPaste={e => void handlePaste(e)}
                  placeholder={
                    bIdx === 0
                      ? placeholder || t('tasks.descPlaceholder')
                      : 'Nhập tiếp nội dung (gõ /column để tạo cột)...'
                  }
                  className="w-full bg-transparent text-gray-900 dark:text-white text-sm outline-none resize-none leading-relaxed placeholder-gray-400 dark:placeholder-gray-500"
                />
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
                  {cols.map((colVal, cIdx) => (
                    <div key={cIdx} className="relative min-w-0">
                      <textarea
                        id={`desc-col-${bIdx}-${cIdx}`}
                        rows={2}
                        value={colVal}
                        onChange={e => handleColChange(bIdx, cIdx, e.target.value)}
                        onSelect={e => syncSelection(e, bIdx, cIdx)}
                        onKeyUp={e => syncSelection(e, bIdx, cIdx)}
                        onMouseUp={e => syncSelection(e, bIdx, cIdx)}
                        onKeyDown={e => handleKeyDown(e, bIdx, cIdx)}
                        onPaste={e => void handlePaste(e)}
                        placeholder={`Cột ${cIdx + 1}...`}
                        className="w-full p-2.5 text-sm rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-gray-900 dark:text-white outline-none resize-none leading-relaxed transition-colors"
                      />
                    </div>
                  ))}
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
              onClick={() => onSave(serializeAll(blocks, attachments))}
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
