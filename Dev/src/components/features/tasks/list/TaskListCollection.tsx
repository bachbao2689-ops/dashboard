import type { Dispatch, SetStateAction } from 'react';
import { Search, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '../../../common/Skeleton';
import { StatusBadge } from '../../../common/StatusBadge';
import { Avatar } from '../../../common/Avatar';
import type { Task } from '../../../../hooks/useTasks';
import { mapPriority } from './taskListPresentation';
import { useTranslation } from '../../../../i18n/translations';

type Props = {loading: boolean; filteredTasks: Task[]; groupedTasks: Record<string, Task[]>; groupBy: string; collapsedGroups: string[]; toggleGroup: (group: string) => void; selectedTasks: string[]; setSelectedTasks: Dispatch<SetStateAction<string[]>>; toggleSelectTask: (id: string) => void; onOpenTask: (task: Task) => void; deletingIds: string[]};
export function TaskListCollection({loading, filteredTasks, groupedTasks, groupBy, collapsedGroups, toggleGroup, selectedTasks, setSelectedTasks, toggleSelectTask, onOpenTask, deletingIds}: Props) {
 const {t} = useTranslation();
 return (<div className="space-y-6 pb-12 pr-1">
      

      {loading ? (
        <div className="card-hub rounded-2xl p-2"><TableSkeleton rows={8} /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="card-hub rounded-2xl p-16 text-center">
          <div className="task-list-empty-icon">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{t('tasks.noTasksFound')}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('tasks.adjustFilters')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="card-hub rounded-2xl overflow-hidden">
              {groupBy !== 'none' && (
                <div 
                  className="task-list-group-header"
                  onClick={() => toggleGroup(groupName)}
                >
                  <div className="task-list-group-heading">
                    <button className="task-list-group-toggle">
                      {collapsedGroups.includes(groupName) ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide text-sm">{groupName}</h3>
                    <span className="task-list-group-count">{groupTasks.length} tasks</span>
                  </div>
                </div>
              )}
              {!collapsedGroups.includes(groupName) && (
                <>
                <div className="divide-y divide-gray-100 dark:divide-slate-700 md:hidden">
                  {groupTasks.map(task => (
                    <div key={task.id} className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <input type="checkbox" aria-label={`Chọn ${task.title}`} checked={selectedTasks.includes(task.id)} onChange={() => toggleSelectTask(task.id)} className="shrink-0 rounded border-gray-300 text-primary focus:ring-primary" />
                        <button type="button" onClick={() => onOpenTask(task)} className="task-list-mobile-title">
                          <span className="min-w-0 flex-1 truncate">{task.title}</span>
                          <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-gray-400" />
                        </button>
                      </div>
                      <p className="task-list-mobile-meta">
                        <span className="shrink-0">#{task.task_ref || task.id.split('-')[0]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="min-w-0 truncate">{task.assignee?.name || t('common.unassigned')}</span>
                      </p>
                      <div className="task-list-mobile-status">
                        <StatusBadge status={task.status} />
                        <span className="min-w-0 truncate">{task.due_date ? `${t('common.due')} ${new Date(task.due_date).toLocaleDateString()}` : t('common.noDueDate')}</span>
                        {mapPriority(task.priority) === 'High' && <span className="ml-auto shrink-0 font-semibold text-red-600 dark:text-red-400">High</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="task-list-table-scroll hidden md:block" role="region" aria-label={t('tasks.title')} tabIndex={0}>
                <table className="task-list-table">
                  <thead>
                    <tr className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <th className="p-4 w-12">
                        <input 
                          type="checkbox"
                          aria-label={`Chọn nhóm ${groupName}`}
                          checked={groupTasks.length > 0 && groupTasks.every(t => selectedTasks.includes(t.id))}
                          onChange={() => {
                            const allIds = groupTasks.map(t => t.id);
                            const allSelected = groupTasks.every(t => selectedTasks.includes(t.id));
                            if (allSelected) {
                              setSelectedTasks(selectedTasks.filter(id => !allIds.includes(id)));
                            } else {
                              const newSelected = new Set([...selectedTasks, ...allIds]);
                              setSelectedTasks(Array.from(newSelected));
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t('tasks.col.ref')}</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t('tasks.col.title')}</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">{t('tasks.col.projectCampaign')}</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t('tasks.col.assignee')}</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t('tasks.col.status')}</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t('tasks.col.priority')}</th>
                      <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">{t('tasks.col.dueDate')}</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {groupTasks.map((task) => (
                      <tr key={task.id} onClick={() => onOpenTask(task)} className={`task-list-row hover-row-effect group ${task.campaign?.name ? 'hover-row-campaign' : task.project?.name ? 'hover-row-project' : ''} ${deletingIds.includes(task.id) ? 'animate-fade-out' : ''}`} data-selected={selectedTasks.includes(task.id)} data-completed={['done', 'complete', 'completed'].includes((task.status || '').toLowerCase())}>
                        <td className="p-4">
                          <input 
                            type="checkbox"
                            aria-label={`Chọn ${task.title}`}
                            checked={selectedTasks.includes(task.id)}
                            onClick={(e) => e.stopPropagation()} onChange={() => toggleSelectTask(task.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400 font-medium">#{task.task_ref || task.id.split('-')[0]}</td>
                        <td className="p-4">
                          <div className="task-list-row-title" title={task.title}>{task.title}</div>
                          {task.department && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.department.name}</div>}
                        </td>
                        <td className="p-4 text-sm hidden lg:table-cell">
                          {task.project?.name ? (
                            <span className="task-list-project-badge"><span className="truncate">{task.project.name}</span></span>
                          ) : task.campaign?.name ? (
                            <span className="task-list-campaign-badge"><span className="truncate">{task.campaign.name}</span></span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">---</span>
                          )}
                        </td>
                        <td className="p-4">
                          {task.assignee ? (
                            <div className="flex items-center space-x-2">
                              <Avatar name={task.assignee.name} src={task.assignee.avatar_url} />
                              <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpenTask(task); }}>
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="p-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpenTask(task); }}>
                          <span className="task-list-priority" data-priority={mapPriority(task.priority).toLowerCase()}>
                            {mapPriority(task.priority)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">
                          <button aria-label={`Xem ${task.title}`} className="task-list-row-menu">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
              )}
            </div>
          ))}
        </div>
      )}
</div>);
}
