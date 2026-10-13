import type { WorkflowPerson } from '../../../lib/workflowHub';
import { Avatar } from '../../common/Avatar';

export function WorkflowAvatarGroup({ people, label }: { people: WorkflowPerson[]; label: string }) {
  return <div className="workflow-avatar-group" aria-label={label}>
    {people.length ? people.map(person => <span key={person.id} title={person.name} aria-label={person.name} className="workflow-avatar-wrap"><Avatar name={person.name} src={person.avatar_url} className="h-6 w-6 text-[9px]" /></span>) : <span className="text-xs text-gray-400">—</span>}
  </div>;
}

export function WorkflowPeopleRows({ pics, contributors, en, isCampaign = false }: { pics: WorkflowPerson[]; contributors: WorkflowPerson[]; en: boolean; isCampaign?: boolean }) {
  return (
    <div className="workflow-phase-people">
      {/* PIC Row: Badge style with avatar and name like the top board */}
      <div className="workflow-people-row">
        <span className="workflow-people-label">PIC</span>
        {pics.length > 0 ? (
          <div
            className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-gray-200/80 dark:border-slate-700/80 shadow-2xs max-w-full"
            title={pics.map(p => p.name).join(', ')}
          >
            <Avatar name={pics[0].name} src={pics[0].avatar_url} className="w-4 h-4 text-[7px] shrink-0" />
            <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 truncate max-w-[85px]">
              {pics[0].name}
            </span>
            {pics.length > 1 && (
              <span className="text-[8px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                +{pics.length - 1}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </div>

      {/* Subtask Row: SUB capsule pill matching Projects/Campaigns tab */}
      <div className="workflow-people-row">
        <span className="workflow-people-label">{en ? 'Subtask' : 'Subtask'}</span>
        {contributors.length > 0 ? (
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-2xs ${
              isCampaign
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                : 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400'
            }`}
            title={contributors.map(c => c.name).join(', ')}
          >
            <span className={`text-[9px] font-extrabold tracking-wider ${isCampaign ? 'text-amber-700 dark:text-amber-400' : 'text-violet-700 dark:text-violet-400'}`}>
              SUB
            </span>
            <div className="flex -space-x-1.5">
              {contributors.slice(0, 4).map(person => (
                <span key={person.id} title={person.name} className="shrink-0 rounded-full ring-1.5 ring-white dark:ring-slate-900 shadow-2xs">
                  <Avatar name={person.name} src={person.avatar_url} className="h-4 w-4 text-[7px]" />
                </span>
              ))}
            </div>
            {contributors.length > 4 && (
              <span className="text-[8px] font-bold opacity-80 shrink-0">
                +{contributors.length - 4}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </div>
    </div>
  );
}
