import React from 'react';

const teams = [
  { name: 'Design', load: 95 },
  { name: 'E-Commerce', load: 85 },
  { name: 'Media', load: 70 },
  { name: 'Marketing', load: 60 },
  { name: 'HR', load: 40 },
];

export const CrossTeamCapacity: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 dark:bg-slate-800 dark:border-[#8fa8d0] rounded-xl p-6 shadow-sm">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Cross-Team Capacity</h3>
      <div className="space-y-4">
        {teams.map(team => {
          let colorClass = 'bg-primary';
          if (team.load >= 90) colorClass = 'bg-red-500';
          else if (team.load >= 80) colorClass = 'bg-amber-500';
          else if (team.load <= 50) colorClass = 'bg-green-500';

          return (
            <div key={team.name} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{team.name}</span>
              <div className="flex-1">
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${colorClass} transition-all`} 
                    style={{ width: `${team.load}%` }}
                  ></div>
                </div>
              </div>
              <span className="w-12 text-sm font-bold text-right text-gray-700 dark:text-gray-300">{team.load}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
