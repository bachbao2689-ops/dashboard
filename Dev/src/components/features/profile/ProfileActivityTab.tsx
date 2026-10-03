import React, { useState } from 'react';
import { CheckCircle2, ArrowRightLeft, Package } from 'lucide-react';

export const ProfileActivityTab: React.FC = () => {
  const [filter, setFilter] = useState('All');

  const activities = [
    { id: 1, type: 'asset', icon: <Package size={16} />, color: 'bg-blue-100 text-blue-600', time: '03 Oct 14:02', title: 'Duyệt mượn máy ảnh Canon 5D Mark IV', desc: 'Trần Bạch Tố · Marketing' },
    { id: 2, type: 'task', icon: <ArrowRightLeft size={16} />, color: 'bg-amber-100 text-amber-600', time: '03 Oct 09:15', title: 'Chuyển task TK89 "SALEKITS"', desc: 'In Progress → Feedback' },
    { id: 3, type: 'task', icon: <CheckCircle2 size={16} />, color: 'bg-green-100 text-green-600', time: '02 Oct 16:40', title: 'Gửi yêu cầu mượn Lens Canon 24-70mm', desc: '' },
  ];

  return (
    <div className="card-hub p-6 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Activity Timeline</h3>
        <div className="flex gap-2">
          {['All', 'Tasks', 'Assets'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-600 before:to-transparent">
        {activities.map((item) => (
          <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${item.color} z-10 ml-0`}>
              {item.icon}
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-center justify-between mb-1">
                <time className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.time}</time>
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.title}</h4>
              {item.desc && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
