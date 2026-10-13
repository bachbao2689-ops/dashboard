import { useState, type ComponentProps } from 'react';
import { Filter, Plus, Search, Download } from 'lucide-react';
import { FilterPanel } from '../../../common/FilterPanel';
import { useTranslation } from '../../../../i18n/translations';

type Props = Pick<ComponentProps<typeof FilterPanel>, 'filters' | 'setFilters'> & {
 searchTerm: string; onSearchChange: (value: string) => void; groupBy: string; onGroupChange: (value: string) => void;
 showFilters: boolean; setShowFilters: (value: boolean) => void; activeFiltersCount: number;
 onExport: () => void; onCreate: () => void; canCreateTask: boolean;
};
export function TaskListToolbar({searchTerm, onSearchChange: setSearchTerm, groupBy, onGroupChange: setGroupBy, showFilters, setShowFilters, filters, setFilters, activeFiltersCount, onExport: exportCSV, onCreate: handleNewTask, canCreateTask}: Props) {
 const { t } = useTranslation();
 const [isSearchExpanded, setIsSearchExpanded] = useState(false);
 return (<div className="task-list-toolbar">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">{t('tasks.title')}</h1>
        <div className="task-list-toolbar-actions">
          {/* Expanding Search */}
          <div className="flex items-center relative h-10">
            <div className="task-list-search-field" data-expanded={isSearchExpanded} inert={!isSearchExpanded}>
              <div className="relative w-full">
                <Search className="task-list-search-icon" />
                <input
                  type="text"
                  placeholder={t('tasks.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="task-list-search-input"
                />
              </div>
            </div>
            <button 
              type="button"
              aria-label={t('tasks.search')}
              aria-expanded={isSearchExpanded}
              onClick={() => setIsSearchExpanded(!isSearchExpanded)} 
              className="task-list-search-toggle"
              data-active={isSearchExpanded}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Group By Filter */}
          <div className="flex items-center">
            <select 
              aria-label="Group tasks"
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              className="task-list-group-select"
            >
              <option value="none">{t('common.none')}</option>
              <option value="project">{t('common.project')}</option>
              <option value="assignee">{t('common.assignee')}</option>
              <option value="status">{t('common.status')}</option>
            </select>
          </div>

          {/* Filters Panel Toggle */}
          <div className="relative flex items-center">
            <button type="button" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)} className="task-list-filter-toggle hover-magnetic-btn magnetic-blue" data-active={showFilters || activeFiltersCount > 0}>
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">{t('btn.filters')}</span>
              {activeFiltersCount > 0 && <span className="task-list-filter-count">{activeFiltersCount}</span>}
            </button>
            <FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} filters={filters} setFilters={setFilters} onApply={() => {}} />
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-0.5 sm:mx-1 self-center"></div>

          <button onClick={exportCSV} className="task-list-export-button hover-magnetic-btn magnetic-blue">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">{t('common.export')}</span>
          </button>
          
          {canCreateTask && <button aria-label={t('tasks.createBtn')} onClick={handleNewTask} className="task-list-create-button btn-add-new">
            <Plus className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">{t('tasks.createBtn')}</span>
          </button>}
        </div>
      </div>);
}
