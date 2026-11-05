import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';
import { parentTasks, taskProgress, workflowLink, displayDate } from '../../../lib/workflowHub';
import type { useWorkflowHub } from '../../../hooks/useWorkflowHub';
import type { Task } from '../../../hooks/useTasks';
import { StatusBadge } from '../../common/StatusBadge';
import { Avatar } from '../../common/Avatar';
import { taskDone } from '../../../lib/taskTracking';

export function WorkflowTrackingSummary({ kind, id, hub, onOpenTask, defaultExpanded = false, statusFilter = 'open' }: {
  kind: 'project' | 'campaign'; id: string; hub: ReturnType<typeof useWorkflowHub>; onOpenTask: (task: Task) => void; defaultExpanded?: boolean; statusFilter?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [isUnplannedOpen, setIsUnplannedOpen] = useState(false);
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const en = lang === 'en';
  const track = hub.tracks.find(t => t.entity_type === kind && t.entity_id === id);
  const tasks = parentTasks(hub.tasks, kind, id);
  const progress = taskProgress(tasks);
  const phaseList = track?.phases || [];

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const unplannedTasks = tasks.filter(t => !t.workflow_phase_id && (statusFilter === 'all' || (statusFilter === 'completed' ? taskDone(t) : !taskDone(t))));

  return (
    <section className="rounded-2xl border border-gray-200/90 dark:border-slate-800 p-4 transition-all bg-white/50 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full grid grid-cols-[1fr_auto] items-center gap-2 text-left cursor-pointer select-none group/wf"
        aria-expanded={isExpanded}
      >
        <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
          <Activity size={16} className="text-primary shrink-0" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {en ? 'Phases' : 'Giai đoạn'}
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 shrink-0">
            {phaseList.length} {en ? (phaseList.length > 1 ? 'Phases' : 'Phase') : 'Giai đoạn'}
          </span>
          {progress.percent != null && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              {progress.done}/{progress.total} · {progress.percent}%
            </span>
          )}
        </div>

        <div className="grid place-content-center shrink-0">
          <div className={`p-1 rounded-lg text-gray-400 group-hover/wf:text-gray-600 dark:group-hover/wf:text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="grid gap-3 pt-3.5 mt-3 border-t border-gray-100 dark:border-slate-700/80 animate-in fade-in duration-200">
          {hub.error ? (
            <div role="alert" className="text-xs text-red-500">
              {hub.error}
              <button onClick={() => void hub.refresh()} className="ml-2 underline">{en ? 'Retry' : 'Thử lại'}</button>
            </div>
          ) : hub.loading ? (
            <p className="text-xs text-gray-500">{en ? 'Loading workflow…' : 'Đang tải luồng…'}</p>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                {track?.root ? (en ? 'All tasks in this Project/Campaign' : 'Toàn bộ công việc của Project/Campaign này') : (en ? 'Tasks within your assigned scope' : 'Công việc trong phạm vi được giao')}
              </p>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <b>{progress.done}/{progress.total} {en ? 'completed' : 'hoàn thành'}</b>
                <b className="text-primary">{progress.percent == null ? '—' : progress.percent + '%'}</b>
              </div>
              {progress.percent != null && (
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress.percent}%` }} />
                </div>
              )}
              <div className="grid gap-2 text-xs">
                <div className="grid grid-flow-col auto-cols-max items-center gap-2 overflow-x-auto">
                  <span className="text-gray-500 shrink-0">PIC:</span>
                  {track?.pics?.map(p => (
                    <span key={p.id} className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0">
                      <Avatar name={p.name} src={p.avatar_url} className="h-5 w-5 text-[9px]" />
                      <span className="text-gray-700 dark:text-gray-200">{p.name}</span>
                    </span>
                  ))}
                  {!track?.pics?.length && <span className="text-gray-400">—</span>}
                </div>
                {!!track?.sub_pics?.length && (
                  <div className="grid grid-flow-col auto-cols-max items-center gap-2 overflow-x-auto">
                    <span className="text-gray-500 shrink-0">Sub-PIC:</span>
                    {track.sub_pics.map(p => (
                      <span key={p.id} className="text-gray-700 dark:text-gray-200 shrink-0">{p.name}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* UI Accordion Cha - Con cho từng phase */}
              {phaseList.length > 0 ? (
                <div className="grid gap-2">
                  {phaseList.map(phase => {
                    const phaseTasks = tasks.filter(t => t.workflow_phase_id === phase.id && (statusFilter === 'all' || (statusFilter === 'completed' ? taskDone(t) : !taskDone(t))));
                    const totalPhaseTasks = tasks.filter(t => t.workflow_phase_id === phase.id);
                    const summary = taskProgress(totalPhaseTasks);
                    const isPhaseOpen = Boolean(expandedPhases[phase.id]);

                    return (
                      <div key={phase.id} className="rounded-xl border border-gray-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                        {/* Phase Header */}
                        <button
                          type="button"
                          onClick={() => togglePhase(phase.id)}
                          className="w-full p-2.5 text-left grid grid-cols-[1fr_auto_auto] items-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <b className="block truncate text-xs text-gray-900 dark:text-white">
                              {phase.position}. {phase.title}
                            </b>
                            <span className="text-[11px] text-gray-500">
                              {displayDate(phase.start_date)} – {displayDate(phase.due_date)} · {summary.done}/{summary.total}
                            </span>
                          </div>
                          <StatusBadge status={phase.status} />
                          <div className={`p-1 text-gray-400 transition-transform duration-200 ${isPhaseOpen ? 'rotate-180 text-primary' : ''}`}>
                            <ChevronDown size={14} />
                          </div>
                        </button>

                        {/* Phase Tasks Dropdown */}
                        {isPhaseOpen && (
                          <div className="border-t border-gray-100 dark:border-slate-800 p-2.5 grid gap-2 bg-white/70 dark:bg-slate-900/60">
                            {phaseTasks.length === 0 ? (
                              <p className="text-xs text-gray-400 py-1 italic">
                                {en ? 'No tasks in this phase' : 'Không có công việc nào trong giai đoạn này'}
                              </p>
                            ) : (
                              phaseTasks.map(task => {
                                const assigneeName = task.assignee?.name || (en ? 'Unassigned' : 'Chưa giao PIC');
                                return (
                                  <div
                                    key={task.id}
                                    onClick={() => onOpenTask(task)}
                                    className="w-full rounded-lg bg-gray-50/80 dark:bg-slate-800/60 hover:bg-primary/10 dark:hover:bg-primary/15 border border-gray-200/60 dark:border-slate-700/60 p-2 text-left grid grid-cols-[1fr_auto] items-center gap-2 transition-all cursor-pointer group/task"
                                  >
                                    <div className="min-w-0">
                                      <span className="block truncate text-xs font-semibold text-gray-800 dark:text-gray-100 group-hover/task:text-primary transition-colors">
                                        {task.title}
                                      </span>
                                      <div className="grid grid-flow-col auto-cols-max items-center gap-2 mt-1 text-[11px] text-gray-500">
                                        <span className="grid grid-flow-col auto-cols-max items-center gap-1">
                                          <Avatar name={assigneeName} src={task.assignee?.avatar_url} className="w-4 h-4 text-[8px]" />
                                          <span className="truncate max-w-[120px]">{assigneeName}</span>
                                        </span>
                                        {task.due_date && (
                                          <span>· {displayDate(task.due_date)}</span>
                                        )}
                                      </div>
                                    </div>
                                    <StatusBadge status={task.status} />
                                  </div>
                                );
                              })
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(workflowLink(kind, id, phase.id));
                              }}
                              className="text-[11px] text-primary hover:underline text-left pt-1 font-medium grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer"
                            >
                              <span>{en ? 'Open phase on Workflow Hub' : 'Xem chi tiết giai đoạn trên Quản lý tiến độ'}</span>
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">{en ? 'No phases in your scope yet.' : 'Chưa có giai đoạn trong phạm vi của bạn.'}</p>
              )}

              {/* Unplanned Tasks Accordion */}
              {unplannedTasks.length > 0 && (
                <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 overflow-hidden bg-amber-50/30 dark:bg-amber-950/20">
                  <button
                    type="button"
                    onClick={() => setIsUnplannedOpen(prev => !prev)}
                    className="w-full p-2.5 text-left grid grid-cols-[1fr_auto] items-center gap-2 hover:bg-amber-100/30 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {unplannedTasks.length} {en ? 'tasks not assigned to a phase' : 'công việc chưa gắn giai đoạn'}
                    </span>
                    <div className={`p-1 text-amber-500 transition-transform duration-200 ${isUnplannedOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown size={14} />
                    </div>
                  </button>
                  {isUnplannedOpen && (
                    <div className="border-t border-amber-200/60 dark:border-amber-900/40 p-2.5 grid gap-2 bg-white/70 dark:bg-slate-900/60">
                      {unplannedTasks.map(task => {
                        const assigneeName = task.assignee?.name || (en ? 'Unassigned' : 'Chưa giao PIC');
                        return (
                          <div
                            key={task.id}
                            onClick={() => onOpenTask(task)}
                            className="w-full rounded-lg bg-gray-50/80 dark:bg-slate-800/60 hover:bg-primary/10 dark:hover:bg-primary/15 border border-gray-200/60 dark:border-slate-700/60 p-2 text-left grid grid-cols-[1fr_auto] items-center gap-2 transition-all cursor-pointer group/task"
                          >
                            <div className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-gray-800 dark:text-gray-100 group-hover/task:text-primary transition-colors">
                                {task.title}
                              </span>
                              <div className="grid grid-flow-col auto-cols-max items-center gap-2 mt-1 text-[11px] text-gray-500">
                                <span className="grid grid-flow-col auto-cols-max items-center gap-1">
                                  <Avatar name={assigneeName} src={task.assignee?.avatar_url} className="w-4 h-4 text-[8px]" />
                                  <span className="truncate max-w-[120px]">{assigneeName}</span>
                                </span>
                                {task.due_date && <span>· {displayDate(task.due_date)}</span>}
                              </div>
                            </div>
                            <StatusBadge status={task.status} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <button
            onClick={() => navigate(workflowLink(kind, id))}
            className="grid grid-flow-col auto-cols-max justify-center items-center gap-2 w-full rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors px-3 py-2.5 text-sm font-semibold text-primary cursor-pointer"
          >
            <span>{en ? 'Open Workflow Management' : 'Mở Quản lý tiến độ'}</span>
            <ArrowRight size={16}/>
          </button>
        </div>
      )}
    </section>
  );
}
