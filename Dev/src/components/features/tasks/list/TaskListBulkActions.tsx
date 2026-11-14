import { Trash2, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '../../../../i18n/translations';
import {useMobileReadOnly} from '../../../../hooks/useMobileReadOnly';

export function TaskListBulkActions({selectedTasks, onDelete, onClear,onComplete,busy,canComplete}: {selectedTasks:string[];onDelete:(anchorEl?:HTMLElement|null)=>void;onClear:()=>void;onComplete:()=>void;busy:boolean;canComplete:boolean}) {
 const {t} = useTranslation();
 const readOnly=useMobileReadOnly();
 return (<>{!readOnly&&selectedTasks.length > 0 && (
        <div className="task-list-bulk">
          <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2 border-r border-slate-200/90 dark:border-gray-700 pr-4">
            <span className="task-list-bulk-count">{selectedTasks.length}</span>
            <span className="text-sm font-medium">{t('common.selected')}</span>
          </div>
          <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
            <button onClick={onComplete} disabled={busy||!canComplete} title={canComplete?undefined:"Hoàn thành hàng loạt đang được cập nhật. Bạn vẫn có thể hoàn thành từng task trong chi tiết."} className="task-list-bulk-done">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-green-400" /> {t('tasks.markDone')}
            </button>
            <button type="button" onClick={(e)=>onDelete(e.currentTarget)} disabled={busy} className="task-list-bulk-delete">
              <Trash2 className="w-4 h-4" /> {t('common.delete')}
            </button>
          </div>
          <button onClick={onClear} className="ml-2 p-1 hover:bg-slate-200/70 dark:hover:bg-gray-800 rounded-full transition-colors" aria-label="Clear selection">
            <X className="w-5 h-5 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white" />
          </button>
        </div>
      )}</>);
}
