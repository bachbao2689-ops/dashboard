import React from 'react';
import { Layers3, X, Edit3 } from 'lucide-react';
import type { WeeklyReportTask } from './WeeklyReportDrawer';

interface WeeklyReportPreviewProps {
  ownerName?: string;
  weekStart: string;
  weekEnd: string;
  reportProgress: number;
  reportedTasks: WeeklyReportTask[];
  totalTasks: number;
  summaryImage?: string | null;
  reports: Record<string, any>;
  onRemoveSummaryImage?: () => void;
  onSubmitReport?: () => void;
  onEditTask?: (taskId: string) => void;
  isLeaderView?: boolean;
}

const dateLabel = (d: string) => d.split('-').reverse().join('/');

export const WeeklyReportPreview: React.FC<WeeklyReportPreviewProps> = ({
  ownerName,
  weekStart,
  weekEnd,
  reportProgress,
  reportedTasks,
  totalTasks,
  summaryImage,
  reports,
  onRemoveSummaryImage,
  onSubmitReport,
  onEditTask,
  isLeaderView = false
}) => {
  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 h-full overflow-hidden border-l border-gray-100 dark:border-slate-700">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers3 size={18} className="text-primary" />
            {isLeaderView ? `Báo cáo của ${ownerName}` : 'Bản nháp Báo cáo Tuần'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isLeaderView ? 'Tracking báo cáo tuần của thành viên.' : 'Preview nội dung. Hover vào task để chỉnh sửa lại bên trái.'}
          </p>
        </div>
        {onSubmitReport && (
          <button onClick={onSubmitReport} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
            Gửi Báo Cáo
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {/* Summary Info */}
        <div className="space-y-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Tổng quan báo cáo</h3>
            <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-md">Tuần {dateLabel(weekStart)} – {dateLabel(weekEnd)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Tiến độ</p>
              <p className="text-2xl font-bold text-primary mt-1">{reportProgress}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{reportedTasks.length} / {totalTasks} task đã report</p>
            </div>
          </div>
          
          {summaryImage && (
            <div className="mt-4 relative group">
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Hình ảnh tổng kết</p>
              {onRemoveSummaryImage && (
                <button onClick={onRemoveSummaryImage} className="absolute top-8 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"><X size={16} /></button>
              )}
              <img src={summaryImage} alt="Summary" className="w-full rounded-xl border border-gray-200 dark:border-slate-700" />
            </div>
          )}
        </div>
        
        {/* Reported Tasks List */}
        {reportedTasks.length > 0 ? (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Chi tiết Task ({reportedTasks.length})</h3>
            {reportedTasks.map(task => {
              const r = reports[task.id];
              if (!r) return null;
              const isUnchanged = r.metadata?.unchanged;
              return (
                <div key={task.id} className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm relative hover:z-50">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isUnchanged ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2 pr-24 line-clamp-2">{task.title}</h4>
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {onEditTask && (
                      <button onClick={() => onEditTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-all" title="Chỉnh sửa"><Edit3 size={14}/></button>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${isUnchanged ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {isUnchanged ? 'Không đổi' : 'Đã report'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mt-3 text-sm">
                    {r.metadata?.body && (
                      <div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Nội dung:</span>
                        <p className="text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">{r.metadata.body}</p>
                      </div>
                    )}
                    {r.metadata?.blocker && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase">Vướng mắc:</span>
                        <p className="text-red-700 dark:text-red-300 mt-0.5 whitespace-pre-wrap">{r.metadata.blocker}</p>
                      </div>
                    )}
                    {r.metadata?.next_step && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Tiếp theo:</span>
                        <p className="text-blue-700 dark:text-blue-300 mt-0.5 whitespace-pre-wrap">{r.metadata.next_step}</p>
                      </div>
                    )}
                    {r.metadata?.image_url && (
                      <div className="mt-3 relative z-10 flex">
                        <a href={r.metadata.image_url} target="_blank" rel="noreferrer" className="block relative z-10">
                          <img src={r.metadata.image_url} alt="Minh chứng" className="h-32 object-contain rounded-lg border border-gray-200 dark:border-slate-700 transition-transform duration-300 origin-bottom-left hover:scale-[1.8] hover:shadow-2xl hover:z-50 relative" title="Nhấp để xem ảnh đầy đủ" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
            <p className="text-sm text-gray-500 font-medium">Chưa có thông tin report</p>
          </div>
        )}
      </div>
    </div>
  );
};
