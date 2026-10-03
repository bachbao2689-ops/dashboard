import React from 'react';
import { Search, UserPlus, MoreHorizontal } from 'lucide-react';

export const ProfileTeamTab: React.FC = () => {
  const team = [
    { name: 'Luna', dept: 'ECOMMERCE', role: 'Staff', tasks: '12 tasks', initial: 'L', color: 'bg-pink-100 text-pink-600' },
    { name: 'Wendy', dept: 'DESIGN', role: 'Staff', tasks: '8 tasks', initial: 'W', color: 'bg-purple-100 text-purple-600' },
    { name: 'Bách Bảo', dept: 'MARKETING', role: 'Staff', tasks: 'Mượn 1', initial: 'B', color: 'bg-blue-100 text-blue-600' },
  ];

  return (
    <div className="card-hub p-6 rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Đội ngũ (4 thành viên)</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <UserPlus size={16} /> Mời Member
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm thành viên..." className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white" />
        </div>
        <select className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none">
          <option>Tất cả bộ phận</option>
          <option>Marketing</option>
          <option>Design</option>
        </select>
      </div>

      <div className="space-y-2">
        {team.map((member, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700 group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${member.color}`}>
                {member.initial}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="uppercase tracking-wider">{member.dept}</span>
                  <span>•</span>
                  <span>{member.role}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">
                ● {member.tasks}
              </span>
              <button className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
