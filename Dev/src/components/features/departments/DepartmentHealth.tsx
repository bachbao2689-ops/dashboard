import React from 'react';

const departments = [
  { name: 'E-Commerce', totalProjects: 12, overdue: 2, capacity: 95 },
  { name: 'Design', totalProjects: 24, overdue: 5, capacity: 92 },
  { name: 'Marketing', totalProjects: 18, overdue: 0, capacity: 75 },
  { name: 'HR & Admin', totalProjects: 8, overdue: 0, capacity: 40 },
];

export const DepartmentHealth: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {departments.map(dept => (
        <div 
          key={dept.name} 
          className={`bg-white border border-gray-200 dark:bg-slate-800 dark:border-[#8fa8d0] rounded-xl p-4 flex flex-col gap-3 shadow-sm ${
            dept.name === 'E-Commerce' ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : ''
          }`}
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white">{dept.name}</h3>
            {dept.name === 'E-Commerce' && (
              <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Priority
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400 text-xs uppercase">Projects</span>
              <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">{dept.totalProjects}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400 text-xs uppercase">Overdue</span>
              <span className={`font-bold text-lg ${dept.overdue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {dept.overdue}
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400 uppercase">Capacity</span>
              <span className={`font-bold ${dept.capacity > 90 ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}`}>
                {dept.capacity}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${dept.capacity > 90 ? 'bg-amber-500' : 'bg-primary'}`} 
                style={{ width: `${dept.capacity}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
