import { Trash2, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '../../../../i18n/translations';

export function TaskListBulkActions({selectedTasks, onDelete, onClear, onComplete, busy=false}: {selectedTasks: string[]; onDelete: () => void; onClear: () => void; onComplete: () => void; busy?: boolean}) {
 const {t} = useTranslation();
 return (<>{selectedTasks.length > 0 && (
        <div className="task-list-bulk">
          <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
            <span className="task-list-bulk-count">{selectedTasks.length}</span>
            <span className="text-sm font-medium">{t('common.selected')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={busy} onClick={onComplete} className="task-list-bulk-done disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4 text-green-400" /> {t('tasks.markDone')}
            </button>
            <button onClick={onDelete} className="task-list-bulk-delete">
              <Trash2 className="w-4 h-4" /> {t('common.delete')}
            </button>
          </div>
          <button onClick={onClear} className="ml-2 p-1 hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}</>);
}
