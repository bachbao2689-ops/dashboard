import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, MessageSquare, Briefcase, Calendar } from 'lucide-react';
import { useTasks } from '../../../hooks/useTasks';
import type { Task } from '../../../hooks/useTasks';
import { KpiCard } from '../../common/KpiCard';

interface ProjectDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(dateStr);
}

function getDaysRemaining(dateStr: string): number {
  const due = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ProjectDetailPanel({ isOpen, onClose, projectId }: ProjectDetailPanelProps) {
  const { tasks, loading } = useTasks();
  const [width, setWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 400 && newWidth < 900) {
        setWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const projectData = useMemo(() => {
    if (!projectId) return null;
    let targetName = projectId;
    
    if (projectId.startsWith('proj-')) {
        const projectMap = new Map<string, Task[]>();
        tasks.forEach(task => {
          const projName = task.project?.name || 'Unassigned';
          if (!projectMap.has(projName)) projectMap.set(projName, []);
          projectMap.get(projName)!.push(task);
        });
        
        const sortedProjects = Array.from(projectMap.entries())
            .sort((a, b) => b[1].length - a[1].length);
        
        const idx = parseInt(projectId.replace('proj-', ''));
        if (sortedProjects[idx]) {
            targetName = sortedProjects[idx][0];
        }
    }

    const projTasks = tasks.filter(t => (t.project?.name || 'Unassigned') === targetName);
    
    const teamMap = new Map<string, { role: string, hours: number }>();
    let overdueCount = 0;
    let doneCount = 0;
    
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    projTasks.forEach(t => {
        if (t.assignee?.name) {
            const current = teamMap.get(t.assignee.name) || { role: 'Designer', hours: 0 };
            teamMap.set(t.assignee.name, { ...current, hours: current.hours + 4 }); 
        }
        
        if (t.status === 'done') doneCount++;
        else if (t.due_date && getDaysRemaining(t.due_date) < 0) overdueCount++;
        
        if (t.due_date) {
            const d = parseDate(t.due_date);
            if (!minDate || d < minDate) minDate = d;
            if (!maxDate || d > maxDate) maxDate = d;
        }
    });

    const totalTasks = projTasks.length;
    const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
    
    const budgetTotal = totalTasks * 50; 
    const budgetUsed = doneCount * 50;

    return {
        name: targetName,
        department: projTasks[0]?.department?.name || 'N/A',
        totalTasks,
        doneCount,
        overdueCount,
        progress,
        budgetTotal,
        budgetUsed,
        startDate: minDate ? (minDate as Date).toLocaleDateString('vi-VN') : 'N/A',
        endDate: maxDate ? (maxDate as Date).toLocaleDateString('vi-VN') : 'N/A',
        team: Array.from(teamMap.entries()).map(([name, data]) => ({
            name,
            role: data.role,
            hours: data.hours,
            isOverloaded: data.hours > 30
        }))
    };
  }, [tasks, projectId]);

  return (
    <div 
      style={window.innerWidth >= 768 ? { width: isOpen ? width : 0, minWidth: isOpen ? width : 0, opacity: isOpen ? 1 : 0 } : { width: isOpen ? '100%' : 0, opacity: isOpen ? 1 : 0 }}
      className={`h-full bg-white dark:bg-slate-800 rounded-l-xl md:rounded-l-3xl !rounded-r-none border-l border-gray-200 dark:border-slate-700 shadow-sm shrink-0 absolute md:relative right-0 top-0 z-[60] flex flex-col ${!isResizing ? 'transition-[width,min-width,opacity] duration-300 ease-in-out' : ''}`}
    >
      {/* Resizer Handle */}
      {isOpen && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-transparent hover:bg-primary/20 cursor-col-resize z-50 transition-all -translate-x-1/2 group hidden md:flex items-center justify-center"
          onMouseDown={startResizing}
        >
          <div className="h-12 w-1 bg-gray-400/50 dark:bg-gray-500/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}

      {/* Wrapper to prevent content crushing during width=0 animation */}
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ minWidth: isOpen ? (window.innerWidth >= 768 ? 400 : '100%') : 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-transparent sticky top-0 z-10 shrink-0">
          {loading || !projectData ? (
             <div className="h-8 w-64 bg-gray-200 dark:bg-slate-800 animate-pulse rounded"></div>
          ) : (
             <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{projectData.name}</h2>
               <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                 {projectData.department}
               </span>
             </div>
          )}
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors ml-4 shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading || !projectData ? (
             <div className="animate-pulse space-y-6">
                <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-2xl w-full"></div>
                <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-2xl w-full"></div>
             </div>
          ) : (
             <>
                {/* 1. Timeline & Budget Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Timeline Bar */}
                   <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
                     <div className="flex justify-between items-center mb-3">
                       <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                         <Calendar size={16} className="text-primary" /> Timeline
                       </div>
                       <div className="text-xs text-gray-500 font-medium">
                         {projectData.startDate} - {projectData.endDate}
                       </div>
                     </div>
                     
                     <div className="relative pt-6 pb-2">
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full relative" 
                            style={{ width: `${projectData.progress}%` }}
                          >
                            <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full shadow" />
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2 uppercase">
                           <span>Start</span>
                           <span>End</span>
                        </div>
                     </div>
                   </div>

                   {/* Budget Bar */}
                   <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
                     <div className="flex justify-between items-center mb-3">
                       <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                         <Briefcase size={16} className="text-green-500" /> Resources
                       </div>
                       <div className="text-xs text-gray-500 font-medium">
                         {projectData.budgetUsed}h / {projectData.budgetTotal}h
                       </div>
                     </div>
                     
                     <div className="relative pt-6 pb-2">
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${projectData.budgetUsed > projectData.budgetTotal ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min((projectData.budgetUsed / Math.max(projectData.budgetTotal, 1)) * 100, 100)}%` }}
                          />
                        </div>
                     </div>
                   </div>
                </div>

                {/* 2. KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    title="Tasks"
                    value={`${projectData.doneCount}/${projectData.totalTasks}`}
                    trend={12}
                    colorTheme="info"
                  />
                  <KpiCard
                    title="Completion"
                    value={`${projectData.progress}%`}
                    trend={5}
                    colorTheme="success"
                  />
                  <KpiCard
                    title="Overdue"
                    value={projectData.overdueCount.toString()}
                    trend={projectData.overdueCount > 0 ? -2 : 0}
                    colorTheme={projectData.overdueCount > 0 ? 'warning' : 'primary'}
                  />
                  <KpiCard
                    title="Hours Logged"
                    value={`${projectData.budgetUsed}h`}
                    trend={0}
                    colorTheme="primary"
                  />
                </div>

                {/* 3. Team Section */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Team</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {projectData.team.map((member, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-shadow">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                              {member.name.charAt(0)}
                           </div>
                           <div>
                              <h4 className="font-bold text-sm text-gray-900 dark:text-white">{member.name}</h4>
                              <p className="text-xs text-gray-500">{member.role} • {member.hours}h</p>
                           </div>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                           {member.isOverloaded && <AlertTriangle size={14} className="text-red-500" />}
                           <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <MessageSquare size={16} />
                           </button>
                         </div>
                      </div>
                    ))}
                    {projectData.team.length === 0 && (
                       <div className="col-span-full text-sm text-gray-500 p-4 bg-gray-50/80 dark:bg-slate-900/50 rounded-xl text-center border border-gray-200 dark:border-slate-700">
                         No team members assigned yet.
                       </div>
                    )}
                  </div>
                </div>

                {/* 4. Embedded Task Board Placeholder */}
                <div className="p-8 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-center border-dashed">
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Kanban Board</h3>
                   <p className="text-gray-500">Task board specific to this project renders here.</p>
                </div>
             </>
          )}
        </div>
      </div>
    </div>
  );
}
