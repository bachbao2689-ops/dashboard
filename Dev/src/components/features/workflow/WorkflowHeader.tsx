import {WorkflowScopeHeader} from './WorkflowScopeHeader';
import {WorkflowKpis} from './WorkflowKpis';
import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';

export function WorkflowHeader({model}: {model: WorkflowModel}) {
  const {} = model;
  return (<>
<div className="card-hub p-4 sm:p-5 rounded-2xl grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-stretch relative z-20">
<WorkflowScopeHeader model={model}/>
<WorkflowKpis model={model}/>
</div>
  </>);
}
