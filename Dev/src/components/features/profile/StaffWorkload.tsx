import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, PlayCircle } from 'lucide-react';
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

    </div>
  );
};
