import React, { useMemo } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { useTasks } from '../../../hooks/useTasks';
import type { Task } from '../../../hooks/useTasks';

interface DesignerWorkload {
  id: string;
  name: string;
  capacity: number;
  allocated: number;
  status: 'available' | 'balanced' | 'overloaded';
  deadlines: { task: string; date: string; hours: number }[];
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(dateStr);
}

export const DesignerCapacity: React.FC = () => {
  const { tasks, loading } = useTasks();

  const workload = useMemo(() => {
    // 1. Group active tasks by assignee
    const designersMap = new Map<string, { tasks: Task[], allocated: number }>();
    
    // Only count active tasks
    const activeTasks = tasks.filter(t => t.status !== 'done');
    
    activeTasks.forEach(task => {
      const assigneeName = task.assignee?.name;
      if (!assigneeName) return; // Skip unassigned
      
      if (!designersMap.has(assigneeName)) {
        designersMap.set(assigneeName, { tasks: [], allocated: 0 });
      }
      
      const designerData = designersMap.get(assigneeName)!;
      designerData.tasks.push(task);
      // Rough estimation: each active task takes ~4 hours
      designerData.allocated += 4; 
    });

    // 2. Format for display
    const formatted: DesignerWorkload[] = Array.from(designersMap.entries()).map(([name, data]) => {
      const capacity = 40; // Standard 40h work week
      
      // Get next 3 upcoming deadlines
      const deadlines = data.tasks
        .filter(t => t.due_date)
        .sort((a, b) => parseDate(a.due_date!).getTime() - parseDate(b.due_date!).getTime())
        .slice(0, 3)
        .map(t => ({
          task: t.title,
          date: t.due_date!,
          hours: 4
        }));

      let status: 'available' | 'balanced' | 'overloaded' = 'balanced';
      if (data.allocated > capacity) status = 'overloaded';
      else if (data.allocated < capacity * 0.6) status = 'available';

      return {
        id: name,
        name,
        capacity,
        allocated: data.allocated,
        status,
        deadlines
      };
    });
    
    // Sort by allocated (highest first)
    return formatted.sort((a, b) => b.allocated - a.allocated);
  }, [tasks]);

  const totalAllocated = workload.reduce((sum, w) => sum + w.allocated, 0);
  const totalCapacity = workload.reduce((sum, w) => sum + w.capacity, 0);
  // Avoid NaN if 0 capacity
  const overallUtilization = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-6 pt-4 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
           <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Overall Status */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">TEAM CAPACITY - ACTIVE TASKS</h2>
          <div className="text-right">
            <span className="text-3xl font-black text-primary">{overallUtilization}%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-2 font-medium">utilized</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${overallUtilization > 100 ? 'bg-red-500' : 'bg-primary'}`} 
            style={{ width: `${Math.min(overallUtilization, 100)}%` }}
          />
        </div>
      </div>

      {/* Designer List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workload.map(designer => {
          const percent = Math.round((designer.allocated / designer.capacity) * 100);
          const isOver = designer.status === 'overloaded';
          
          return (
            <div key={designer.id} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {designer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{designer.name}</h3>
                      <p className={`text-xs font-medium ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
                        {designer.capacity - designer.allocated}h available
                      </p>
                    </div>
                  </div>
                  {isOver && (
                    <span className="flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-xs font-bold uppercase">
                      <AlertTriangle size={12} /> Overloaded
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                    <span>{designer.allocated}h / {designer.capacity}h</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden flex">
                    <div 
                      className={`h-full ${isOver ? 'bg-red-500' : 'bg-primary'} transition-all`} 
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                    {percent > 100 && (
                      <div className="h-full bg-red-800 transition-all" style={{ width: `${percent - 100}%` }} />
                    )}
                  </div>
                </div>
              </div>

              {designer.deadlines.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar size={12} /> Upcoming Deadlines
                  </h4>
                  <ul className="space-y-2">
                    {designer.deadlines.map((d, i) => (
                      <li key={i} className="text-sm flex justify-between bg-gray-50/80 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 px-3 py-2 rounded-lg gap-3">
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{d.task}</span>
                        <span className="text-gray-500 whitespace-nowrap">{d.date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 text-sm text-gray-400 text-center">
                  No upcoming deadlines
                </div>
              )}
            </div>
          );
        })}
        {workload.length === 0 && !loading && (
           <div className="col-span-full text-center py-10 text-gray-500">
              No active tasks assigned to team members.
           </div>
        )}
      </div>
    </div>
  );
};
