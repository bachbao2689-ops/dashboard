import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';
import { parentTasks, taskProgress, workflowLink, displayDate } from '../../../lib/workflowHub';
import type { useWorkflowHub } from '../../../hooks/useWorkflowHub';
import type { Task } from '../../../hooks/useTasks';
import { StatusBadge } from '../../common/StatusBadge';
import { Avatar } from '../../common/Avatar';

export function WorkflowTrackingSummary({ kind, id, hub, onOpenTask, defaultExpanded = false }: {
  kind: 'project' | 'campaign'; id: string; hub: ReturnType<typeof useWorkflowHub>; onOpenTask: (task: Task) => void; defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const en = lang === 'en';
  const track = hub.tracks.find(t => t.entity_type === kind && t.entity_id === id);
  const tasks = parentTasks(hub.tasks, kind, id);
  const progress = taskProgress(tasks);
  const canonical = tasks.filter(t => !t.id.startsWith('ps-') && !t.id.startsWith('cs-'));
  const unplanned = tasks.filter(t => !t.workflow_phase_id).length;

  return (
    <section className="rounded-2xl border border-blue-100 dark:border-slate-700 p-4 transition-all">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer select-none group/wf"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={16} className="text-primary shrink-0" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">Workflow Management</h3>
          {progress.percent != null && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              {progress.done}/{progress.total} · {progress.percent}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span role="status" className="text-[10px] text-gray-400">
            {hub.connected ? (en ? 'Live sync' : 'Realtime') : (en ? 'Reconnecting…' : 'Đang kết nối…')}
          </span>
          <div className={`p-1 rounded-lg text-gray-400 group-hover/wf:text-gray-600 dark:group-hover/wf:text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-3 pt-3.5 mt-3 border-t border-gray-100 dark:border-slate-700/80 animate-in fade-in duration-200">
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
              <div className="flex items-center justify-between gap-3 text-sm">
                <b>{progress.done}/{progress.total} {en ? 'completed' : 'hoàn thành'}</b>
                <b className="text-primary">{progress.percent == null ? '—' : progress.percent + '%'}</b>
              </div>
              {progress.percent != null && (
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress.percent}%` }} />
                </div>
              )}
              <div className="space-y-2 text-xs">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-500">PIC:</span>
                  {track?.pics.map(p => (
                    <span key={p.id} className="flex items-center gap-1.5">
                      <Avatar name={p.name} src={p.avatar_url} className="h-5 w-5 text-[9px]" />{p.name}
                    </span>
                  ))}
                  {!track?.pics.length && '—'}
                </p>
                {!!track?.sub_pics?.length && (
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-500">Sub-PIC:</span>
                    {track.sub_pics.map(p => <span key={p.id}>{p.name}</span>)}
                  </p>
                )}
              </div>
              {!!track?.phases.length && (
                <div className="space-y-2">
                  {track.phases.map(phase => {
                    const rows = tasks.filter(t => t.workflow_phase_id === phase.id);
                    const summary = taskProgress(rows);
                    return (
                      <button
                        key={phase.id}
                        onClick={() => navigate(workflowLink(kind, id, phase.id))}
                        className="flex w-full items-center gap-2 rounded-xl border border-gray-100 dark:border-slate-700 p-2.5 text-left text-xs hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <span className="min-w-0 flex-1">
                          <b className="block truncate">{phase.position}. {phase.title}</b>
                          <span className="text-gray-500">{displayDate(phase.start_date)} – {displayDate(phase.due_date)} · {summary.done}/{summary.total}</span>
                        </span>
                        <StatusBadge status={phase.status}/>
                        <ArrowRight size={14} className="shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
              {!track?.phases.length && <p className="text-xs text-gray-500">{en ? 'No phases in your scope yet.' : 'Chưa có giai đoạn trong phạm vi của bạn.'}</p>}
              {!!unplanned && <p className="text-xs text-amber-600 dark:text-amber-300">{unplanned} {en ? 'tasks not assigned to a phase' : 'công việc chưa gắn giai đoạn'}</p>}
              {!!canonical.length && (
                <div className="space-y-2 border-t border-gray-100 dark:border-slate-700 pt-3">
                  <h4 className="text-xs font-semibold">{en ? 'Tasks' : 'Công việc'} ({canonical.length})</h4>
                  {canonical.map(task => (
                    <button
                      key={task.id}
                      onClick={() => onOpenTask(task)}
                      className="block w-full rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-left text-xs hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <b className="block truncate">{task.title}</b>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span>{task.assignee?.name || (en ? 'Unassigned' : 'Chưa giao PIC')}</span>
                        <StatusBadge status={task.status}/>
                        <span className="text-gray-500">{displayDate(task.due_date)}</span>
                      </span>
                      <span className="mt-1 block truncate text-gray-500">
                        {track?.phases.find(p => p.id === task.workflow_phase_id)?.title || (en ? 'No phase assigned' : 'Chưa gắn giai đoạn')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <button
            onClick={() => navigate(workflowLink(kind, id))}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors px-3 py-2.5 text-sm font-semibold text-primary cursor-pointer"
          >
            {en ? 'Open Workflow Management' : 'Mở Workflow Management'}<ArrowRight size={16}/>
          </button>
        </div>
      )}
    </section>
  );
}
