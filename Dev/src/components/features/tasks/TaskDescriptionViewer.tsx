import React, { useMemo, useState } from 'react';
import { ZoomIn, Columns2, Columns3 } from 'lucide-react';
import { parseDescriptionToBlocks } from './taskDescriptionTypes';
import { RichCommentBody, CommentImagePreviewModal } from '../comments/RichCommentBody';
import { useTranslation } from '../../../i18n/translations';

interface TaskDescriptionViewerProps {
  description?: string | null;
  className?: string;
  emptyText?: string;
}

export const TaskDescriptionViewer: React.FC<TaskDescriptionViewerProps> = ({
  description,
  className = '',
  emptyText,
}) => {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState<{ name: string; url: string } | null>(null);

  const blocks = useMemo(() => {
    return parseDescriptionToBlocks(description);
  }, [description]);

  const isEmpty =
    !description ||
    !description.trim() ||
    (blocks.length === 1 && blocks[0].type === 'text' && !blocks[0].text?.trim());

  if (isEmpty) {
    return (
      <div className={`p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/50 text-sm text-gray-400 dark:text-gray-500 italic min-h-[72px] flex items-center ${className}`}>
        {emptyText || t('tasks.noDescription')}
      </div>
    );
  }

  return (
    <>
      <div className={`p-4 rounded-2xl border border-gray-200/90 dark:border-slate-700/80 bg-gray-50/90 dark:bg-slate-800/50 text-sm min-h-[88px] space-y-3.5 ${className}`}>
        {blocks.map((block, bIdx) => {
          if (block.type === 'text') {
            if (!block.text?.trim()) return null;
            return (
              <div key={block.id || bIdx} className="leading-relaxed text-gray-800 dark:text-gray-200">
                <RichCommentBody body={block.text} />
              </div>
            );
          }

          if (block.type === 'columns') {
            const count = block.columnCount === 3 ? 3 : 2;
            const cols = (block.columns || []).slice(0, count);

            return (
              <div
                key={block.id || bIdx}
                className={`grid gap-3 my-2.5 ${
                  count === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
                }`}
              >
                {cols.map((col, cIdx) => (
                  <div
                    key={cIdx}
                    className="flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 p-3.5 shadow-2xs space-y-2.5 min-w-0"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                      {count === 3 ? <Columns3 size={13} /> : <Columns2 size={13} />}
                      <span>Cột {cIdx + 1}</span>
                    </div>

                    {col.imageUrl && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setPreviewImage({
                            name: `Hình ảnh Cột ${cIdx + 1}`,
                            url: col.imageUrl!,
                          })
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setPreviewImage({
                              name: `Hình ảnh Cột ${cIdx + 1}`,
                              url: col.imageUrl!,
                            });
                          }
                        }}
                        className="relative group overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 max-h-56 cursor-pointer"
                      >
                        <img
                          src={col.imageUrl}
                          alt={`Cột ${cIdx + 1}`}
                          className="w-full max-h-48 object-cover rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
                          <ZoomIn size={14} />
                          <span>Xem ảnh lớn</span>
                        </div>
                      </div>
                    )}

                    {col.text && (
                      <div className="leading-relaxed text-sm text-gray-800 dark:text-gray-200 min-w-0 break-words">
                        <RichCommentBody body={col.text} />
                      </div>
                    )}

                    {!col.text && !col.imageUrl && (
                      <span className="text-xs text-gray-400 italic">Trống</span>
                    )}
                  </div>
                ))}
              </div>
            );
          }

          return null;
        })}
      </div>

      <CommentImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
};
