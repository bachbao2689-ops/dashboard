import { useState } from 'react';
import { WorkflowScopeHeader } from './WorkflowScopeHeader';
import { WorkflowKpis } from './WorkflowKpis';
import type { WorkflowModel } from '../../../hooks/useWorkflowManagement';

export function WorkflowHeader({ model }: { model: WorkflowModel }) {
  const [showKpis, setShowKpis] = useState(true);

  return (
    <div className="card-hub p-4 sm:p-5 rounded-[8px] grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-stretch relative z-20">
      <div className={showKpis ? 'xl:col-span-4 2xl:col-span-4' : 'xl:col-span-12 2xl:col-span-12'}>
        <WorkflowScopeHeader
          model={model}
          showKpis={showKpis}
          onToggleKpis={() => setShowKpis((v) => !v)}
        />
      </div>
      {showKpis && (
        <div className="xl:col-span-8 2xl:col-span-8">
          <WorkflowKpis model={model} />
        </div>
      )}
    </div>
  );
}
