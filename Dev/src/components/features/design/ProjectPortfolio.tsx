import React, { useState, useMemo } from 'react';
import { Search, Filter, LayoutGrid, List, LayoutTemplate } from 'lucide-react';
import { useTasks } from '../../../hooks/useTasks';
import type { Task } from '../../../hooks/useTasks';
import { useTranslation } from '../../../i18n/translations';

interface ProjectSummary {
  id: string;
  name: string;
  department: string;
  tasks: Task[];
  totalTasks: number;
  completed: number;
  overdue: number;
  inProgress: number;
  team: string[];
  progress: number;
}

function parseDate(dateStr: string): Date {
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(dateStr);
}

function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const due = parseDate(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today && task.status !== 'done';
}

export const ProjectPortfolio: React.FC<{ onSelectProject?: (id: string) => void }> = ({ onSelectProject }) => {
  const { t } = useTranslation();
  const { tasks, loading } = useTasks();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Aggregate tasks into projects
  const projects = useMemo<ProjectSummary[]>(() => {
    const projectMap = new Map<string, Task[]>();
    tasks.forEach(task => {
      const projName = task.project?.name || 'Unassigned';
      if (!projectMap.has(projName)) projectMap.set(projName, []);
      projectMap.get(projName)!.push(task);
    });

    return Array.from(projectMap.entries())
      .map(([name, projectTasks], idx) => {
        const teamSet = new Set<string>();
        projectTasks.forEach(t => {
          if (t.assignee?.name) teamSet.add(t.assignee.name);
        });
        const overdueCount = projectTasks.filter(isOverdue).length;
        const doneCount = projectTasks.filter(t => t.status === 'done').length;
        const inProgressCount = projectTasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress').length;
        const progress = projectTasks.length > 0 ? Math.round((doneCount / projectTasks.length) * 100) : 0;

        const mockDepts = ['E-Commerce', 'Design', 'Marketing', 'E-Commerce', 'HR & Admin'];
        const dept = projectTasks[0]?.department?.name || mockDepts[idx % mockDepts.length];

        return {
          id: `proj-${idx}`,
          name,
          department: dept,
          tasks: projectTasks,
          totalTasks: projectTasks.length,
          completed: doneCount,
          overdue: overdueCount,
          inProgress: inProgressCount,
          team: Array.from(teamSet),
          progress,
        };
      })
      .filter(p => {
        if (!searchQuery) return true;
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => b.totalTasks - a.totalTasks);
  }, [tasks, searchQuery]);

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 animate-pulse">
              <div className="h-5 w-2/3 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
              <div className="h-2 w-full bg-gray-200 dark:bg-slate-700 rounded mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t('header.search')}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shrink-0">
            <Filter size={16} />
            {t('btn.filters')}
          </button>

          <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shrink-0">
            {(['grid', 'list', 'kanban'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-colors ${viewMode === mode ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {mode === 'grid' && <LayoutGrid size={18} />}
                {mode === 'list' && <List size={18} />}
                {mode === 'kanban' && <LayoutTemplate size={18} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="flex items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-nowrap pb-2">
        <span>{projects.length} {t('nav.designTeam')}</span>
        <span>•</span>
        <span>{tasks.length} {t('nav.tasks')}</span>
        <span>•</span>
        <span className="text-red-500">{tasks.filter(isOverdue).length} overdue</span>
      </div>

      {/* Project Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => onSelectProject?.(project.id)}
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">🎨</span>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">
                    {project.name}
                  </h3>
                </div>
                {project.department && (
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    project.department === 'E-Commerce' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    project.department === 'Design' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    project.department === 'Marketing' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    {project.department}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 font-medium">Progress</span>
                    <span className="text-gray-700 dark:text-gray-300 font-bold">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${project.progress >= 60 ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Team & Stats */}
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Team</span>
                    <div className="flex items-center gap-1 mt-1">
                      {project.team.slice(0, 3).map((name, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold border-2 border-white dark:border-slate-800 -ml-1 first:ml-0">
                          {name.charAt(0)}
                        </div>
                      ))}
                      {project.team.length > 3 && (
                        <span className="text-xs text-gray-500 ml-1">+{project.team.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Tasks</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium mt-1">
                      {project.completed}/{project.totalTasks} done
                    </span>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex gap-3 text-sm font-medium flex-wrap">
                  {project.overdue > 0 && (
                    <span className="flex items-center text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-md text-xs">
                      🔴 {project.overdue} overdue
                    </span>
                  )}
                  <span className="flex items-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md text-xs">
                    📊 {project.totalTasks} tasks
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Project</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Dept</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Tasks</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Progress</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Overdue</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Team</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} onClick={() => onSelectProject?.(p.id)} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      p.department === 'E-Commerce' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      p.department === 'Design' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      p.department === 'Marketing' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {p.department}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{p.totalTasks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${p.progress >= 60 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${p.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.overdue > 0 ? <span className="text-red-600 font-bold">{p.overdue}</span> : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-1">
                      {p.team.slice(0, 3).map((name, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold border-2 border-white dark:border-slate-800">
                          {name.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="text-center p-10 text-gray-500 dark:text-gray-400">
          Kanban view coming soon...
        </div>
      )}
    </div>
  );
};
