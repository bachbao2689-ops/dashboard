import React, { useMemo } from 'react';
import { parseDescriptionToBlocks } from './taskDescriptionTypes';
import { RichCommentBody } from '../comments/RichCommentBody';
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

  const blocks = useMemo(() => {
    return parseDescriptionToBlocks(description);
  }, [description]);

  const isEmpty =
    !description ||
    !description.trim() ||
    (blocks.length === 1 && blocks[0].type === 'text' && !blocks[0].text?.trim());

  if (isEmpty) {
    return (
      <div className={`p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/50 text-sm text-gray-400 dark:text-gray-500 italic min-h-[72px] flex items-center ${className}`}>
        {emptyText || t('tasks.noDescription')}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-sm min-h-[88px] space-y-2.5 ${className}`}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'text') {
          if (!block.text?.trim()) return null;
          return (
            <div key={block.id || bIdx} className="leading-relaxed text-gray-800 dark:text-gray-200">
              <RichCommentBody body={block.text} renderDirectImages />
            </div>
          );
        }

        if (block.type === 'columns') {
          const count = block.columns?.length || block.columnCount || 2;
          const cols = (block.columns || []).slice(0, count);

          const gridClass =
            count === 4
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
              : count === 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2';

          return (
            <div
              key={block.id || bIdx}
              className={`grid gap-3 my-2 ${gridClass}`}
            >
              {cols.map((colText, cIdx) => (
                <div key={cIdx} className="min-w-0">
                  <RichCommentBody body={colText || ''} renderDirectImages />
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
