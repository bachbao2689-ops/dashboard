import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';

export const LeaderWorkload: React.FC = () => {
  // Mock data for Leader View
  const onTimeRate = 88;
  const onTimeTrend = 2; // +2%
  const overdueItems = 3;
  const cycleTime = "4.2 days";
  const utilization = 92; // %

  const teamWorkload = [
    { name: 'Thái Đặng (Design)', load: 95, color: 'bg-red-500' },
    { name: 'Nga Phạm (Content)', load: 80, color: 'bg-teal-500' },
    { name: 'Vũ Trần (Marketing)', load: 60, color: 'bg-blue-500' },
    { name: 'Bảo Châu (Digital)', load: 40, color: 'bg-gray-400' },
  ];

  const attentionRequired = [
    { name: 'Thiết kế KV Món mới', type: 'Overdue Task', assignee: 'Thái Đặng', issue: 'Trễ 2 ngày' },
    { name: 'Launching Website', type: 'Project Budget', assignee: 'Vũ Trần', issue: 'Vượt ngân sách 15%' },
  ];

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
        {/* Workload Distribution Chart */}
        <div className="card-hub p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
           <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-wider">Phân bổ Workload</h3>
           <p className="text-xs text-gray-500 mb-6">Thống kê khối lượng công việc hiện tại của nhân sự</p>
           
           <div className="space-y-4">
              {teamWorkload.map((member, idx) => (
                 <div key={idx}>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                       <span className="text-gray-700 dark:text-gray-300">{member.name}</span>
                       <span className={member.load > 90 ? 'text-red-500 font-bold' : 'text-gray-500'}>{member.load}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5">
                       <div className={`\${member.color} h-2.5 rounded-full shadow-sm`} style={{ width: `\${member.load}%` }}></div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Attention Required */}
        <div className="card-hub rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col">
           <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500"/> Cần xử lý gấp (Attention)</h3>
           </div>
           <div className="p-2 flex-1">
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
