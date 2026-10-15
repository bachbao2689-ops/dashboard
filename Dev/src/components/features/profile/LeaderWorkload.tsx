import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';
import { useProfileWorkload } from '../../../hooks/useProfileWorkload';
import {completionMetrics} from '../../../lib/taskTracking';
import { NotificationLog } from './NotificationLog';

export const LeaderWorkload: React.FC<{ activityTask?: React.ReactNode }> = ({ activityTask }) => {
  const { summary, tasks } = useProfileWorkload();
  
  const metrics=completionMetrics(tasks);
  const onTimeRate=metrics.onTime;
  const overdueItems=summary.overdue;
  const cycleTime=metrics.averageDays==null?'—':`${metrics.averageDays} ngày`;
  const utilization=summary.open*20;
  return (
    <div className="space-y-6">
      {/* Top Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-hub p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
               <CheckCircle2 size={16} className="text-teal-500" /> Đúng hạn
             </div>
             <span className="flex items-center text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded"><TrendingUp size={12} className="mr-1"/> —</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{onTimeRate==null?'—':`${onTimeRate}%`}</div>
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
             <span className="flex items-center text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded"><TrendingDown size={12} className="mr-1"/> {utilization>100?'Quá tải':'Ước tính'}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{utilization}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activityTask}

        <NotificationLog includeTeam />
      </div>
    </div>
  );
};
