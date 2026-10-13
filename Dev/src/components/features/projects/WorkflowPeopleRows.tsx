import type { WorkflowPerson } from '../../../lib/workflowHub';
import { Avatar } from '../../common/Avatar';

export function WorkflowAvatarGroup({ people, label }: { people: WorkflowPerson[]; label: string }) {
  return <div className="workflow-avatar-group" aria-label={label}>
    {people.length ? people.map(person => <span key={person.id} title={person.name} aria-label={person.name} className="workflow-avatar-wrap"><Avatar name={person.name} src={person.avatar_url} className="h-6 w-6 text-[9px]" /></span>) : <span className="text-xs text-gray-400">—</span>}
  </div>;
}
export function WorkflowPeopleRows({ pics, contributors, en }: { pics: WorkflowPerson[]; contributors: WorkflowPerson[]; en: boolean }) {
  return <div className="workflow-phase-people">
    <div className="workflow-people-row"><span className="workflow-people-label">PIC</span><WorkflowAvatarGroup people={pics} label="PIC"/></div>
    <div className="workflow-people-row"><span className="workflow-people-label">{en ? 'Task team' : 'Subtask'}</span><WorkflowAvatarGroup people={contributors} label={en ? 'Task assignees' : 'Người phụ trách Subtask'}/></div>
  </div>;
}
