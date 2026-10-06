import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, PlayCircle } from 'lucide-react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';

export const StaffWorkload: React.FC = () => {
  const { summary, loading, tasks } = useProfileWorkload();

  // Compute derived metrics for Staff UI
  const isDone = (status?: string | null) => ['done', 'completed', 'complete', 'cancelled', 'canceled'].includes((status || '').toLowerCase());
  const todayStr = new Date().toDateString();
  const in3Days = new Date(); in3Days.setDate(in3Days.getDate() + 3);
  
  const todaysTasks = tasks.filter(t => !isDone(t.status) && t.due_date && new Date(t.due_date).toDateString() === todayStr).length;
  const dueSoon = tasks.filter(t => !isDone(t.status) && t.due_date && new Date(t.due_date) > new Date() && new Date(t.due_date) <= in3Days).length;
  const waitingApproval = summary.pendingBorrow || 0;
  
  const completedTasks = tasks.filter(t => isDone(t.status));
  const onTimeTasks = completedTasks.filter(t => !t.due_date || new Date(t.updated_at) <= new Date(t.due_date)).length;
  const onTimeRate = completedTasks.length ? Math.round((onTimeTasks / completedTasks.length) * 100) : 100;
  
  const completionTarget = Math.max(10, summary.total || 0);
  const completed = summary.completed || 0;
  const completionPercent = Math.min(100, Math.round((completed / completionTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#002e6d] to-[#004f9e] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Chào buổi sáng, bạn có {todaysTasks} task cần làm hôm nay!</h2>
          <p className="text-blue-100 text-sm">Hãy tập trung giải quyết các task quá hạn và sắp đến hạn nhé.</p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 translate-x-8"></div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
            <PlayCircle size={16} className="text-blue-500" /> Hôm nay
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : todaysTasks}</div>
        </div>

        <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-wider mb-3">
            <AlertTriangle size={16} /> Quá hạn
          </div>
          <div className="text-3xl font-bold text-red-600">{loading ? '—' : summary.overdue}</div>
        </div>

        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Clock size={16} className="text-amber-500" /> Sắp đến hạn
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : dueSoon}</div>
        </div>

        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
            <CheckCircle2 size={16} className="text-teal-500" /> Chờ duyệt
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : waitingApproval}</div>
        </div>
      </div>

      {/* Gamification & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Tỷ lệ hoàn thành mục tiêu (Tuần)</h3>
          <div className="flex justify-between text-xs text-gray-500 font-medium mb-2">
            <span>Đã xong {completed}/{completionTarget} task</span>
            <span className="text-primary font-bold">{completionPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3">
            <div className="bg-gradient-to-r from-teal-400 to-teal-500 h-3 rounded-full shadow-sm" style={{ width: `\${completionPercent}%` }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-3 italic">"Chỉ còn 2 task nữa là hoàn thành mục tiêu tuần. Cố lên!"</p>
        </div>

        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
           <div>
             <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-wider">Hoàn thành đúng hạn</h3>
             <p className="text-xs text-gray-500">Đánh giá kỹ năng quản lý thời gian</p>
           </div>
           <div className="relative w-16 h-16 flex items-center justify-center">
             <svg className="w-16 h-16 transform -rotate-90">
               <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-slate-700" />
               <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={28 * 2 * Math.PI} strokeDashoffset={28 * 2 * Math.PI - (onTimeRate / 100) * 28 * 2 * Math.PI} className="text-teal-500" strokeLinecap="round" />
             </svg>
             <span className="absolute text-sm font-bold text-gray-900 dark:text-white">{onTimeRate}%</span>
           </div>
        </div>
      </div>

      {/* Quick To-Do List */}
      <div className="card-hub rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden">
         <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hành động nhanh (Tasks)</h3>
            <button className="text-xs text-primary font-bold flex items-center hover:underline">Xem tất cả <ArrowRight size={14} className="ml-1"/></button>
         </div>
         <div className="p-2 space-y-1">
            {tasks.slice(0,4).map(t => (
               <label key={t.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer group transition-colors">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                  <div className="flex-1">
                     <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{t.title}</p>
                     <p className="text-xs text-gray-500 mt-1 flex gap-2">
                        <span className="uppercase text-[10px] font-bold bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{t.priority}</span>
                        {t.task_ref && <span>{t.task_ref}</span>}
                     </p>
                  </div>
               </label>
            ))}
            {tasks.length === 0 && <div className="p-6 text-center text-sm text-gray-400">Chưa có task nào cần xử lý.</div>}
         </div>
      </div>
    </div>
  );
};
