import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link2,
  X,
  Save,
  Columns2,
  Columns3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import {
  parseDescriptionToBlocks,
  serializeBlocksToDescription,
  type DescriptionBlock,
} from './taskDescriptionTypes';
import { useTranslation } from '../../../i18n/translations';
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

interface BubbleToolItem {
  id: 'bold' | 'italic' | 'underline' | 'link' | 'color';
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const BUBBLE_TOOLS: BubbleToolItem[] = [
  { id: 'bold', label: 'In đậm', shortcut: '⌘B / Ctrl+B', icon: <Bold size={14} strokeWidth={2.5} /> },
  { id: 'italic', label: 'In nghiêng', shortcut: '⌘I / Ctrl+I', icon: <Italic size={14} /> },
  { id: 'underline', label: 'Gạch chân', shortcut: '⌘U / Ctrl+U', icon: <Underline size={14} strokeWidth={2.5} /> },
  { id: 'link', label: 'Chèn liên kết', shortcut: 'Gắn URL', icon: <Link2 size={14} /> },
  {
    id: 'color',
    label: 'Đổi màu chữ',
    shortcut: 'Bảng màu nổi bật',
    icon: <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-sky-400 inline-block shadow-2xs" />,
  },
];

const TEXT_COLOR_PRESETS = [
  { id: 'blue', label: 'Xanh dương', hex: '#3b82f6' },
  { id: 'emerald', label: 'Xanh ngọc', hex: '#10b981' },
  { id: 'amber', label: 'Hổ phách', hex: '#f59e0b' },
  { id: 'rose', label: 'Đỏ hồng', hex: '#f43f5e' },
  { id: 'violet', label: 'Tím đậm', hex: '#8b5cf6' },
  { id: 'cyan', label: 'Xanh lơ', hex: '#06b6d4' },
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

  // Parse raw value into structured blocks
  const [blocks, setBlocks] = useState<DescriptionBlock[]>(() =>
    parseDescriptionToBlocks(value)
  );

  const isInternalUpdateRef = useRef(false);
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    setBlocks(parseDescriptionToBlocks(value));
  }, [value]);

  // Floating Bubble Toolbar state (exact same as comments)
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
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
    (newBlocks: DescriptionBlock[]) => {
      setBlocks(newBlocks);
      isInternalUpdateRef.current = true;
      const serialized = serializeBlocksToDescription(newBlocks);
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
      const elRect = el.getBoundingClientRect();
      const rootRect = rootRef.current?.getBoundingClientRect() || { top: 0, left: 0, width: 400 };

      setToolbarPos({
        top: Math.max(0, elRect.top - rootRect.top - 46),
        left: Math.max(12, Math.min(elRect.left - rootRect.left + 20, (rootRect.width || 400) - 240)),
      });
    } else if (!showLinkInput && !showColorMenu) {
      setSelectionTarget(null);
    }
  };

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
      commitBlocks(newBlocks);
      setSelectionTarget(null);
      setShowColorMenu(false);
      setShowLinkInput(false);
    },
    [selectionTarget, blocks, commitBlocks]
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

    commitBlocks(newBlocks);
    setSlashMenu(null);
  };

  // Handle normal text change & detect /column
  const handleTextChange = (
    blockIndex: number,
    textVal: string,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], text: textVal };
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

    // Inside column: pressing Enter moves to the next column or drops down to normal line
    if (colIndex !== undefined && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const targetBlock = blocks[blockIndex];
      const count = targetBlock.columnCount || 2;

      if (colIndex < count - 1) {
        // Move to next column
        const nextColInput = document.getElementById(`desc-col-${blockIndex}-${colIndex + 1}`) as HTMLTextAreaElement | null;
        nextColInput?.focus();
      } else {
        // Reached last column -> "lúc xuống dòng sẽ hết tính năng column"
        const nextBlocks = [...blocks];
        if (blockIndex === nextBlocks.length - 1 || nextBlocks[blockIndex + 1]?.type !== 'text') {
          nextBlocks.splice(blockIndex + 1, 0, {
            id: `txt_${Date.now()}`,
            type: 'text',
            text: '',
          });
          commitBlocks(nextBlocks);
        }
        setTimeout(() => {
          const nextTextEl = document.getElementById(`desc-txt-${blockIndex + 1}`) as HTMLTextAreaElement | null;
          nextTextEl?.focus();
        }, 50);
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
    commitBlocks(newBlocks);
  };

  // Paste image clipboard handler (works seamlessly in normal or column lines)
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
          const { data, error } = await supabase.storage
            .from('attachments')
            .upload(`tasks/${Date.now()}-${cleanName}`, imgFile, { upsert: false });

          let publicUrl = '';
          if (!error && data) {
            publicUrl = supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
          } else {
            publicUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(imgFile);
            });
          }

          const imgMarkdown = `\n![image](${publicUrl})\n`;
          const newBlocks = [...blocks];
          const target = { ...newBlocks[blockIndex] };

          if (colIndex !== undefined && target.columns) {
            const nextCols = [...target.columns];
            nextCols[colIndex] = (nextCols[colIndex] || '') + imgMarkdown;
            target.columns = nextCols;
          } else {
            target.text = (target.text || '') + imgMarkdown;
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
      {/* ========================================================
          SINGLE COMPACT CONTAINER (UI of column is inside this box!)
         ======================================================== */}
      <div className="w-full rounded-2xl border border-primary/40 bg-white dark:bg-slate-900 p-3.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all relative space-y-2">
        {/* ========================================================
            1. FLOATING BUBBLE TOOLBAR (Exact same as comments)
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
                {BUBBLE_TOOLS.map(tool => (
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
                      className="smart-bubble-tool-btn cursor-pointer"
                    >
                      {tool.icon}
                    </button>

                    {hoveredToolId === tool.id && !showColorMenu && (
                      <div className="smart-bubble-tooltip" role="tooltip">
                        <span className="font-semibold text-white leading-tight">{tool.label}</span>
                        <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          {tool.shortcut}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

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
            3. CONTENT LINES (Normal text lines & Clean Column Lines)
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
                onPaste={e => void handlePaste(e, bIdx)}
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
                      onPaste={e => void handlePaste(e, bIdx, cIdx)}
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
              onClick={() => onSave(serializeBlocksToDescription(blocks))}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>{t('common.save')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
