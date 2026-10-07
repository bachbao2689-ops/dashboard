import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';

export const LeaderWorkload: React.FC<{ activityTask?: React.ReactNode }> = ({ activityTask }) => {
  const { summary, tasks } = useProfileWorkload();
  
  const completedTasks = tasks.filter(t => ['done', 'completed', 'complete'].includes((t.status || '').toLowerCase()));
  const onTimeTasks = completedTasks.filter(t => !t.due_date || new Date(t.updated_at) <= new Date(t.due_date)).length;
  const onTimeRate = completedTasks.length ? Math.round((onTimeTasks / completedTasks.length) * 100) : 100;
  
  const onTimeTrend = 0;
  const overdueItems = summary.overdue || 0;
  const cycleTime = completedTasks.length ? "2.1 days" : "0 days"; // Simplification
  const utilization = tasks.length > 0 ? 85 : 0; // Simplification

  const attentionRequired: any[] = [];

  return (
    <div className="space-y-6">
      {/* Top Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
               <CheckCircle2 size={16} className="text-teal-500" /> Đúng hạn
             </div>
             <span className="flex items-center text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded"><TrendingUp size={12} className="mr-1"/> {onTimeTrend}%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{onTimeRate}%</div>
        </div>

        <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-wider mb-3">
            <AlertTriangle size={16} /> Điểm nghẽn
          </div>
          <div className="text-3xl font-bold text-red-600">{overdueItems}</div>
        </div>

        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Clock size={16} className="text-blue-500" /> Vận tốc (Cycle Time)
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{cycleTime}</div>
        </div>

        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
               <Users size={16} className="text-purple-500" /> H.suất nhân sự
             </div>
             <span className="flex items-center text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded"><TrendingDown size={12} className="mr-1"/> Quá tải</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{utilization}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activityTask}

        {/* Attention Required */}
        <div className="card-hub rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col">
           <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500"/> Cần xử lý gấp (Attention)</h3>
           </div>
           <div className="p-2 flex-1">
              {attentionRequired.length === 0 && <div className="text-sm text-gray-500 p-4 text-center">Chưa có báo cáo cần chú ý.</div>}
              {attentionRequired.map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer group">
                    <div>
                       <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{item.name}</p>
                       <p className="text-xs text-gray-500 mt-1 flex gap-2 items-center">
                          <span className="uppercase text-[10px] font-bold bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.type}</span>
                          <span>•</span>
                          <span>PIC: {item.assignee}</span>
                       </p>
                    </div>
                    <div className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                       {item.issue}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
