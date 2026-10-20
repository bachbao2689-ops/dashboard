import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link2,
  Image as ImageIcon,
  Columns2,
  Columns3,
  X,
  Trash2,
  CornerDownLeft,
  Loader2,
  Save,
  ZoomIn,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import {
  parseDescriptionToBlocks,
  serializeBlocksToDescription,
  type DescriptionBlock,
} from './taskDescriptionTypes';
import { CommentImagePreviewModal } from '../comments/RichCommentBody';
import { useTranslation } from '../../../i18n/translations';
import '../../../styles/task-description.css';

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

interface ActiveSelectionTarget {
  blockIndex: number;
  colIndex?: number; // undefined means normal text block
  start: number;
  end: number;
}

const COLOR_PRESETS = [
  { id: 'blue', label: 'Xanh dương', hex: '#3b82f6' },
  { id: 'emerald', label: 'Xanh lá', hex: '#10b981' },
  { id: 'amber', label: 'Vàng hổ phách', hex: '#f59e0b' },
  { id: 'rose', label: 'Đỏ hồng', hex: '#f43f5e' },
  { id: 'violet', label: 'Tím đậm', hex: '#8b5cf6' },
  { id: 'cyan', label: 'Xanh lơ cyan', hex: '#06b6d4' },
];

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
  const editorId = useId();

  // Internal blocks state
  const [blocks, setBlocks] = useState<DescriptionBlock[]>(() =>
    parseDescriptionToBlocks(value)
  );

  // Sync external value when changed externally (and not actively editing)
  const isInternalUpdateRef = useRef(false);
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    setBlocks(parseDescriptionToBlocks(value));
  }, [value]);

  // Floating bubble toolbar state
  const [selectionTarget, setSelectionTarget] = useState<ActiveSelectionTarget | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  // Slash command menu state
  const [slashMenu, setSlashMenu] = useState<{
    blockIndex: number;
    colIndex?: number;
    query: string;
    selectedIndex: number;
    top: number;
    left: number;
  } | null>(null);

  // Image Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = useRef<{ blockIndex: number; colIndex: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ name: string; url: string } | null>(null);

  // Commit updated blocks to parent onChange
  const commitBlocks = useCallback(
    (newBlocks: DescriptionBlock[]) => {
      setBlocks(newBlocks);
      isInternalUpdateRef.current = true;
      const serialized = serializeBlocksToDescription(newBlocks);
      onChange?.(serialized);
    },
    [onChange]
  );

  // Close menus on outside click
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

  // Monitor text selection across textareas
  const handleTextareaSelect = (
    e: React.SyntheticEvent<HTMLTextAreaElement>,
    blockIndex: number,
    colIndex?: number
  ) => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    if (start !== end && el.value.slice(start, end).trim().length > 0) {
      setSelectionTarget({ blockIndex, colIndex, start, end });

      // Calculate toolbar coordinates relative to editor container
      const elRect = el.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect() || { top: 0, left: 0, width: 400 };
      setToolbarPos({
        top: Math.max(0, elRect.top - rootRect.top - 46),
        left: Math.max(12, Math.min(elRect.left - rootRect.left + 24, (rootRect.width || 400) - 260)),
      });
    } else if (!showColorMenu && !showLinkInput) {
      setSelectionTarget(null);
    }
  };

  // Helper to wrap text with tags
  const applyFormatToSelection = useCallback(
    (prefix: string, suffix: string, defaultText?: string) => {
      if (!selectionTarget) return;
      const { blockIndex, colIndex, start, end } = selectionTarget;

      const newBlocks = [...blocks];
      const targetBlock = { ...newBlocks[blockIndex] };

      let currentText = '';
      if (colIndex !== undefined && targetBlock.columns) {
        currentText = targetBlock.columns[colIndex]?.text || '';
      } else {
        currentText = targetBlock.text || '';
      }

      const selected = currentText.slice(start, end) || defaultText || '';
      // Check if already wrapped
      let nextText = '';
      if (
        currentText.slice(Math.max(0, start - prefix.length), start) === prefix &&
        currentText.slice(end, end + suffix.length) === suffix
      ) {
        // Unwrap
        nextText =
          currentText.slice(0, start - prefix.length) +
          selected +
          currentText.slice(end + suffix.length);
      } else {
        // Wrap
        nextText =
          currentText.slice(0, start) +
          prefix +
          selected +
          suffix +
          currentText.slice(end);
      }

      if (colIndex !== undefined && targetBlock.columns) {
        const nextCols = [...targetBlock.columns];
        nextCols[colIndex] = { ...nextCols[colIndex], text: nextText };
        targetBlock.columns = nextCols;
      } else {
        targetBlock.text = nextText;
      }

      newBlocks[blockIndex] = targetBlock;
      commitBlocks(newBlocks);
      setSelectionTarget(null);
      setShowColorMenu(false);
      setShowLinkInput(false);
    },
    [selectionTarget, blocks, commitBlocks]
  );

  // Apply formatting tools
  const handleApplyBold = () => applyFormatToSelection('**', '**');
  const handleApplyItalic = () => applyFormatToSelection('*', '*');
  const handleApplyUnderline = () => applyFormatToSelection('<u>', '</u>');
  const handleApplyColor = (colorKey: string) => {
    applyFormatToSelection(`[color:${colorKey}]`, '[/color]');
  };
  const handleApplyLink = (url: string) => {
    const finalUrl = url.trim() || 'https://';
    applyFormatToSelection('[', `](${finalUrl})`);
    setLinkDraft('');
    setShowLinkInput(false);
  };

  // Insert column layout block
  const insertColumnBlock = useCallback(
    (targetBlockIndex: number, count: 2 | 3) => {
      const newBlocks = [...blocks];
      const currentBlock = newBlocks[targetBlockIndex];

      // Remove /column or /col token if present
      let textBefore = currentBlock?.text || '';
      textBefore = textBefore.replace(/\/(column|col)(\s*[23])?$/i, '').trimEnd();

      const newColumnBlock: DescriptionBlock = {
        id: `col_${Date.now()}`,
        type: 'columns',
        columnCount: count,
        columns: Array.from({ length: count }, () => ({ text: '' })),
      };

      // Add a trailing text block below so the user can immediately exit columns by pressing enter/clicking below
      const trailingTextBlock: DescriptionBlock = {
        id: `txt_${Date.now() + 1}`,
        type: 'text',
        text: '',
      };

      if (textBefore.trim()) {
        currentBlock.text = textBefore;
        newBlocks.splice(targetBlockIndex + 1, 0, newColumnBlock, trailingTextBlock);
      } else {
        // Replace current empty text block
        newBlocks.splice(targetBlockIndex, 1, newColumnBlock, trailingTextBlock);
      }

      commitBlocks(newBlocks);
      setSlashMenu(null);
      toast.success(`Đã thêm bố cục ${count} cột`);
    },
    [blocks, commitBlocks]
  );

  // Text change handler for normal text blocks
  const handleTextBlockChange = (
    blockIndex: number,
    textValue: string,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], text: textValue };
    commitBlocks(newBlocks);

    // Detect /column or /col trigger
    const match = textValue.match(/\/(column|col)(\s*[23])?$/i);
    if (match) {
      const rect = e.target.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      setSlashMenu({
        blockIndex,
        query: match[0],
        selectedIndex: 0,
        top: Math.max(0, rect.bottom - rootRect.top + 4),
        left: Math.max(12, rect.left - rootRect.left + 16),
      });
    } else if (slashMenu && slashMenu.blockIndex === blockIndex) {
      setSlashMenu(null);
    }
  };

  // Keyboard navigation inside text block
  const handleTextBlockKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    blockIndex: number
  ) => {
    // Shortcuts for formatting
    if ((e.metaKey || e.ctrlKey) && selectionTarget) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleApplyBold();
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleApplyItalic();
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleApplyUnderline();
        return;
      }
    }

    // Slash menu navigation
    if (slashMenu && slashMenu.blockIndex === blockIndex) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashMenu(prev => (prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % 2 } : null));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenu(prev => (prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % 2 } : null));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const count = slashMenu.selectedIndex === 1 ? 3 : 2;
        insertColumnBlock(blockIndex, count);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenu(null);
        return;
      }
    }
  };

  // Text change handler for columns
  const handleColumnTextChange = (
    blockIndex: number,
    colIndex: number,
    textValue: string
  ) => {
    const newBlocks = [...blocks];
    const targetBlock = { ...newBlocks[blockIndex] };
    if (!targetBlock.columns) return;

    const nextCols = [...targetBlock.columns];
    nextCols[colIndex] = { ...nextCols[colIndex], text: textValue };
    targetBlock.columns = nextCols;
    newBlocks[blockIndex] = targetBlock;
    commitBlocks(newBlocks);
  };

  // Remove column block
  const handleRemoveColumnBlock = (blockIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex, 1);
    if (newBlocks.length === 0) {
      newBlocks.push({ id: `txt_${Date.now()}`, type: 'text', text: '' });
    }
    commitBlocks(newBlocks);
  };

  // Move down from column into the next text block
  const handleExitColumnsDown = (blockIndex: number) => {
    const newBlocks = [...blocks];
    if (blockIndex === newBlocks.length - 1 || newBlocks[blockIndex + 1]?.type !== 'text') {
      newBlocks.splice(blockIndex + 1, 0, {
        id: `txt_${Date.now()}`,
        type: 'text',
        text: '',
      });
      commitBlocks(newBlocks);
    }
    // Focus next text element
    setTimeout(() => {
      const nextEl = document.getElementById(`${editorId}-block-${blockIndex + 1}`) as HTMLTextAreaElement | null;
      nextEl?.focus();
    }, 50);
  };

  // Image Upload trigger for column
  const triggerImageUploadForColumn = (blockIndex: number, colIndex: number) => {
    uploadTargetRef.current = { blockIndex, colIndex };
    fileInputRef.current?.click();
  };

  // Execute file upload
  const handleFileSelected = async (file?: File) => {
    if (!file || !uploadTargetRef.current) return;
    const { blockIndex, colIndex } = uploadTargetRef.current;
    setUploadingImage(true);

    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(`tasks/${Date.now()}-${cleanName}`, file, { upsert: false });

      let publicUrl = '';
      if (!error && data) {
        publicUrl = supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
      } else {
        // Local data URL fallback
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const newBlocks = [...blocks];
      const targetBlock = { ...newBlocks[blockIndex] };
      if (targetBlock.columns && targetBlock.columns[colIndex]) {
        const nextCols = [...targetBlock.columns];
        nextCols[colIndex] = { ...nextCols[colIndex], imageUrl: publicUrl };
        targetBlock.columns = nextCols;
        newBlocks[blockIndex] = targetBlock;
        commitBlocks(newBlocks);
        toast.success(`Đã thêm ảnh vào Cột ${colIndex + 1}`);
      }
    } catch {
      toast.error('Không thể tải ảnh. Vui lòng thử lại.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove image from column
  const handleRemoveImageFromColumn = (blockIndex: number, colIndex: number) => {
    const newBlocks = [...blocks];
    const targetBlock = { ...newBlocks[blockIndex] };
    if (targetBlock.columns && targetBlock.columns[colIndex]) {
      const nextCols = [...targetBlock.columns];
      nextCols[colIndex] = { ...nextCols[colIndex], imageUrl: undefined };
      targetBlock.columns = nextCols;
      newBlocks[blockIndex] = targetBlock;
      commitBlocks(newBlocks);
    }
  };

  return (
    <div ref={rootRef} className={`task-description-editor-root space-y-3 ${className}`}>
      {/* Hidden file input for column image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => void handleFileSelected(e.target.files?.[0])}
      />

      {/* ========================================================
          1. FLOATING BUBBLE TOOLBAR ON TEXT SELECTION (Bôi đen chữ)
         ======================================================== */}
      {selectionTarget && toolbarPos && (
        <div
          role="toolbar"
          aria-label="Text formatting toolbar"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
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
                value={linkDraft}
                onChange={e => setLinkDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyLink(linkDraft);
                  } else if (e.key === 'Escape') {
                    setShowLinkInput(false);
                  }
                }}
                placeholder="https://..."
                className="bg-slate-800 text-white text-xs px-2 py-1 rounded-md outline-none border border-slate-600 focus:border-blue-500 w-44"
              />
              <button
                type="button"
                onClick={() => handleApplyLink(linkDraft)}
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
              {/* Bold */}
              <div className="relative">
                <button
                  type="button"
                  title="In đậm (⌘B / Ctrl+B)"
                  onMouseEnter={() => setHoveredTool('bold')}
                  onMouseLeave={() => setHoveredTool(null)}
                  onClick={handleApplyBold}
                  className="smart-bubble-tool-btn cursor-pointer"
                >
                  <Bold size={13} strokeWidth={2.5} />
                </button>
                {hoveredTool === 'bold' && !showColorMenu && (
                  <div className="smart-bubble-tooltip">
                    <span className="font-semibold text-white">In đậm</span>
                    <span className="text-[10px] text-slate-400">⌘B / Ctrl+B</span>
                  </div>
                )}
              </div>

              {/* Italic */}
              <div className="relative">
                <button
                  type="button"
                  title="In nghiêng (⌘I / Ctrl+I)"
                  onMouseEnter={() => setHoveredTool('italic')}
                  onMouseLeave={() => setHoveredTool(null)}
                  onClick={handleApplyItalic}
                  className="smart-bubble-tool-btn cursor-pointer"
                >
                  <Italic size={13} />
                </button>
                {hoveredTool === 'italic' && !showColorMenu && (
                  <div className="smart-bubble-tooltip">
                    <span className="font-semibold text-white">In nghiêng</span>
                    <span className="text-[10px] text-slate-400">⌘I / Ctrl+I</span>
                  </div>
                )}
              </div>

              {/* Underline */}
              <div className="relative">
                <button
                  type="button"
                  title="Gạch chân (⌘U / Ctrl+U)"
                  onMouseEnter={() => setHoveredTool('underline')}
                  onMouseLeave={() => setHoveredTool(null)}
                  onClick={handleApplyUnderline}
                  className="smart-bubble-tool-btn cursor-pointer"
                >
                  <Underline size={13} strokeWidth={2.5} />
                </button>
                {hoveredTool === 'underline' && !showColorMenu && (
                  <div className="smart-bubble-tooltip">
                    <span className="font-semibold text-white">Gạch chân</span>
                    <span className="text-[10px] text-slate-400">⌘U / Ctrl+U</span>
                  </div>
                )}
              </div>

              {/* Link */}
              <div className="relative">
                <button
                  type="button"
                  title="Gắn liên kết"
                  onMouseEnter={() => setHoveredTool('link')}
                  onMouseLeave={() => setHoveredTool(null)}
                  onClick={() => {
                    setShowLinkInput(true);
                    setShowColorMenu(false);
                  }}
                  className="smart-bubble-tool-btn cursor-pointer"
                >
                  <Link2 size={13} />
                </button>
                {hoveredTool === 'link' && !showColorMenu && (
                  <div className="smart-bubble-tooltip">
                    <span className="font-semibold text-white">Chèn link</span>
                    <span className="text-[10px] text-slate-400">Gắn URL</span>
                  </div>
                )}
              </div>

              {/* Color */}
              <div className="relative">
                <button
                  type="button"
                  title="Đổi màu chữ"
                  onMouseEnter={() => setHoveredTool('color')}
                  onMouseLeave={() => setHoveredTool(null)}
                  onClick={() => setShowColorMenu(prev => !prev)}
                  className="smart-bubble-tool-btn cursor-pointer"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-sky-400 inline-block shadow-2xs" />
                </button>
                {hoveredTool === 'color' && !showColorMenu && (
                  <div className="smart-bubble-tooltip">
                    <span className="font-semibold text-white">Màu chữ</span>
                    <span className="text-[10px] text-slate-400">6 màu nổi bật</span>
                  </div>
                )}
              </div>

              {/* Color Swatch Popup */}
              {showColorMenu && (
                <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-xl z-50">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.label}
                      onClick={() => handleApplyColor(preset.id)}
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
          2. SLASH COMMAND POPUP MENU (/column, /col)
         ======================================================== */}
      {slashMenu && (
        <div
          style={{ top: slashMenu.top, left: slashMenu.left }}
          className="task-description-slash-menu"
        >
          <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 mb-1">
            Chèn bố cục cột
          </div>

          <button
            type="button"
            onClick={() => insertColumnBlock(slashMenu.blockIndex, 2)}
            className={`task-slash-item ${slashMenu.selectedIndex === 0 ? 'is-selected' : ''}`}
          >
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Columns2 size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">2 Cột (2 Columns)</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Bố cục 2 cột song song (chứa văn bản & ảnh)
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => insertColumnBlock(slashMenu.blockIndex, 3)}
            className={`task-slash-item ${slashMenu.selectedIndex === 1 ? 'is-selected' : ''}`}
          >
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Columns3 size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">3 Cột (3 Columns)</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Bố cục 3 cột song song (chứa văn bản & ảnh)
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ========================================================
          3. MAIN CONTENT BLOCKS (TEXT & COLUMNS)
         ======================================================== */}
      <div className="space-y-3">
        {blocks.map((block, bIdx) => {
          if (block.type === 'text') {
            return (
              <div key={block.id || bIdx} className="relative">
                <textarea
                  id={`${editorId}-block-${bIdx}`}
                  autoFocus={autoFocus && bIdx === 0}
                  value={block.text || ''}
                  rows={Math.max(2, Math.min(6, (block.text || '').split('\n').length + 1))}
                  onChange={e => handleTextBlockChange(bIdx, e.target.value, e)}
                  onSelect={e => handleTextareaSelect(e, bIdx)}
                  onMouseUp={e => handleTextareaSelect(e, bIdx)}
                  onKeyUp={e => handleTextareaSelect(e, bIdx)}
                  onKeyDown={e => handleTextBlockKeyDown(e, bIdx)}
                  placeholder={
                    bIdx === 0
                      ? placeholder || t('tasks.descPlaceholder')
                      : 'Nhập tiếp nội dung (hoặc gõ /column để tạo cột)...'
                  }
                  className="w-full p-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all custom-scrollbar leading-relaxed"
                />
              </div>
            );
          }

          if (block.type === 'columns') {
            const count = block.columnCount === 3 ? 3 : 2;
            const cols = (block.columns || []).slice(0, count);

            return (
              <div key={block.id || bIdx} className="task-column-container space-y-3">
                {/* Header with Column Count Badge & Delete Button */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 dark:border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                      {count === 3 ? <Columns3 size={13} /> : <Columns2 size={13} />}
                      <span>Bố cục {count} Cột</span>
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 hidden sm:inline">
                      (Nhập văn bản, bôi đen để định dạng, hoặc import hình vào từng cột)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveColumnBlock(bIdx)}
                    title="Xóa khối cột này"
                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Column Cards Grid */}
                <div
                  className={`grid gap-3 ${
                    count === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
                  }`}
                >
                  {cols.map((col, cIdx) => (
                    <div key={cIdx} className="task-column-card space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400">
                        <span>Cột {cIdx + 1}</span>
                        {!col.imageUrl && (
                          <button
                            type="button"
                            disabled={uploadingImage}
                            onClick={() => triggerImageUploadForColumn(bIdx, cIdx)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            <ImageIcon size={12} />
                            <span>Import hình</span>
                          </button>
                        )}
                      </div>

                      {/* Image Preview inside Column */}
                      {col.imageUrl && (
                        <div className="relative group overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 max-h-48">
                          <img
                            src={col.imageUrl}
                            alt={`Ảnh Cột ${cIdx + 1}`}
                            className="w-full h-36 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  name: `Hình ảnh Cột ${cIdx + 1}`,
                                  url: col.imageUrl!,
                                })
                              }
                              className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                              title="Xem ảnh lớn"
                            >
                              <ZoomIn size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImageFromColumn(bIdx, cIdx)}
                              className="p-1.5 rounded-lg bg-red-600/80 text-white hover:bg-red-700 transition-colors cursor-pointer"
                              title="Xóa hình ảnh"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Column Textarea with bôi đen support */}
                      <textarea
                        rows={3}
                        value={col.text || ''}
                        onChange={e => handleColumnTextChange(bIdx, cIdx, e.target.value)}
                        onSelect={e => handleTextareaSelect(e, bIdx, cIdx)}
                        onMouseUp={e => handleTextareaSelect(e, bIdx, cIdx)}
                        onKeyUp={e => handleTextareaSelect(e, bIdx, cIdx)}
                        placeholder={`Nội dung cột ${cIdx + 1}...`}
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all custom-scrollbar leading-relaxed"
                      />
                    </div>
                  ))}
                </div>

                {/* Exit Column Down Action ("và lúc xuống dòng sẽ hết tính năng column") */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleExitColumnsDown(bIdx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    <CornerDownLeft size={13} className="text-blue-500" />
                    <span>↵ Xuống dòng (kết thúc cột, tiếp tục văn bản thường)</span>
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* ========================================================
          4. HELPER BAR & QUICK TOOLS
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Bố cục:
          </span>

          <button
            type="button"
            onClick={() => insertColumnBlock(blocks.length - 1, 2)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200/90 dark:border-slate-700 bg-gray-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            <Columns2 size={13} className="text-blue-500" />
            <span>2 Cột (/column)</span>
          </button>

          <button
            type="button"
            onClick={() => insertColumnBlock(blocks.length - 1, 3)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200/90 dark:border-slate-700 bg-gray-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            <Columns3 size={13} className="text-indigo-500" />
            <span>3 Cột (/col 3)</span>
          </button>
        </div>

        <div className="text-[11px] text-gray-400 dark:text-slate-500 italic hidden md:inline">
          Gõ <strong>/column</strong> để tạo cột • Bôi đen chữ để đổi màu & in đậm
        </div>
      </div>

      {/* ========================================================
          5. SAVE & CANCEL CONTROLS
         ======================================================== */}
      {(onSave || onCancel) && (
        <div className="flex justify-end items-center gap-2 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-sm rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-medium cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          )}

          {onSave && (
            <button
              type="button"
              disabled={saving || uploadingImage}
              onClick={() => onSave(serializeBlocksToDescription(blocks))}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-[#002e6d] hover:bg-[#002250] text-white rounded-xl font-bold shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{t('common.save')}</span>
            </button>
          )}
        </div>
      )}

      {/* Full-screen Lightbox Modal when previewing column images */}
      <CommentImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};
