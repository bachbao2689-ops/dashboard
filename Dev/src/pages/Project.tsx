import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { ProjectPortfolio } from '../components/features/design/ProjectPortfolio';

import { DepartmentHealth } from '../components/features/departments/DepartmentHealth';
import { CrossTeamCapacity } from '../components/features/departments/CrossTeamCapacity';
import { Bottlenecks } from '../components/features/departments/Bottlenecks';

import { ProjectDetailPanel } from '../components/features/design/ProjectDetailPanel';
import { CreateDesignTaskModal } from '../components/features/design/CreateDesignTaskModal';

type ActiveTab = 'portfolio' | 'capacity' | 'bottlenecks';

export const Project: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar p-6 space-y-6 w-full">
        {/* Header & Main Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t('design.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
              {t('design.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            {t('design.newRequest')}
          </button>
        </div>

        {/* Department Health Cards */}
        <DepartmentHealth />

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit overflow-x-auto border border-gray-200 dark:border-slate-700">
          {([
            { id: 'portfolio', label: t('design.tab.portfolio') || 'Portfolio' },
            { id: 'capacity', label: t('design.tab.capacity') || 'Capacity' },
            { id: 'bottlenecks', label: t('design.tab.bottlenecks') || 'Bottlenecks' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'portfolio' && (
            <ProjectPortfolio onSelectProject={(id: string) => setSelectedProjectId(id)} />
          )}
          {activeTab === 'capacity' && <CrossTeamCapacity />}
          {activeTab === 'bottlenecks' && <Bottlenecks />}
        </div>

      </div>
      
      {/* Project Detail Slide-over Panel */}
      <ProjectDetailPanel
        isOpen={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
        projectId={selectedProjectId}
      />

      {/* Create Design Task Modal */}
      <CreateDesignTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

