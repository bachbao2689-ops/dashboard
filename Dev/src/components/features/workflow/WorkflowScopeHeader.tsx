import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {FolderKanban, ChevronDown, Globe, Search, User, Clock} from 'lucide-react';
import {Avatar} from '../../common/Avatar';

export function WorkflowScopeHeader({model}: {model: WorkflowModel}) {
  const {isEn, entityFilter, isTitleDropdownOpen, setIsTitleDropdownOpen, searchEntityQuery, setSearchEntityQuery, currentEntity, selectedEntityId, isCampaign, filteredEntities, handleFilterChange, handleSelectEntity, daysRemaining, entityTimeline, subTeamMembers, leadInfo} = model;
  if (!currentEntity) return null;
  return (<>
<div className="xl:col-span-4 2xl:col-span-4 flex flex-col justify-between space-y-2.5">
          {/* Top Row: Button trên title scale nhỏ 20% (Projects / Campaigns) & Description (Requirement 1) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => handleFilterChange('project')}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'project'
                    ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/80 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(30,90,170,.18)] ring-1 ring-blue-300/80 dark:from-blue-500/35 dark:to-cyan-500/20 dark:!text-blue-100 dark:ring-blue-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Globe size={11} className={entityFilter === 'project' ? 'text-blue-600 dark:text-blue-300' : ''} />
                <span>Projects</span>
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('campaign')}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'campaign'
                    ? 'bg-gradient-to-b from-amber-100/95 to-amber-200/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(217,119,6,.18)] ring-1 ring-amber-300/80 dark:from-amber-500/35 dark:to-orange-500/20 dark:!text-amber-100 dark:ring-amber-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FolderKanban size={11} className={entityFilter === 'campaign' ? 'text-amber-600 dark:text-amber-300' : ''} />
                <span>Campaigns</span>
              </button>
            </div>

            <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
              • {isCampaign ? (isEn ? 'Marketing & Media Campaign' : 'Chiến dịch truyền thông & Tiếp thị') : 'Website Development Lifecycle'}
            </span>
          </div>

          {/* Main Title as Filter Dropdown */}
          <div className="relative my-0.5 min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
              className="flex w-full min-w-0 items-center gap-2 group text-left focus:outline-none cursor-pointer"
              title={isEn ? "Click to select and filter Project / Campaign" : "Bấm để chọn và lọc Project / Campaign"}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${
                isCampaign
                  ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              }`}>
                {isCampaign ? <FolderKanban size={20} /> : <Globe size={20} />}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <h1 className="min-w-0 flex-1 truncate text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                  {currentEntity.name.startsWith('[Project]') || currentEntity.name.startsWith('[Campaign]') 
                    ? currentEntity.name 
                    : `[${isCampaign ? 'Campaign' : 'Project'}] ${currentEntity.name}`}
                </h1>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 group-hover:text-primary transition-transform duration-200 ${
                    isTitleDropdownOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Menu to choose Project / Campaign */}
            {isTitleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsTitleDropdownOpen(false)}
                />
                <div className="absolute z-50 left-0 top-full mt-2 w-[min(24rem,calc(100vw-3rem))] p-2 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchEntityQuery}
                      onChange={e => setSearchEntityQuery(e.target.value)}
                      placeholder={isEn ? "Search project or campaign..." : "Tìm kiếm dự án hoặc chiến dịch..."}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredEntities.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        {isEn ? 'No matching projects found' : 'Không tìm thấy dự án phù hợp'}
                      </div>
                    ) : (
                      filteredEntities.map(e => {
                        const isSelected = e.id === selectedEntityId;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => handleSelectEntity(e.id)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {e.type === 'campaign' ? (
                                <FolderKanban size={14} className="shrink-0 text-amber-500" />
                              ) : (
                                <Globe size={14} className="shrink-0 text-blue-500" />
                              )}
                              <span className="truncate">{e.name}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                              e.type === 'campaign' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              {e.type === 'campaign' ? 'Campaign' : 'Project'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Time row: Timeline + Workload còn mấy ngày (Requirement 2) */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <span>{entityTimeline}</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Clock size={10} />
              <span>
                {daysRemaining == null
                  ? (isEn ? 'No deadline' : 'Chưa có hạn')
                  : daysRemaining < 0
                  ? (isEn ? `${Math.abs(daysRemaining)}d overdue` : `Trễ ${Math.abs(daysRemaining)} ngày`)
                  : (isEn ? `${daysRemaining}d left` : `Còn ${daysRemaining} ngày`)}
              </span>
            </span>
          </div>

          {/* Lead chính ở dưới time, Sub track avatars, and Project/Campaign status (Requirement 2) */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {/* Lead chính badge */}
            <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs ${
                isCampaign ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
              }`}>
                {leadInfo.avatar ? (
                  <img src={leadInfo.avatar} alt={leadInfo.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={10} />
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                {leadInfo.name}
              </span>
              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-md ${
                isCampaign ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              }`}>
                {leadInfo.role}
              </span>
            </div>

            {/* Sub track avatars */}
            <div className="flex items-center -space-x-1.5">
              {subTeamMembers.map(sub => (
                <div
                  key={sub.id}
                  title={`${sub.name} ${isEn ? '(Team member)' : '(Thành viên tham gia)'}`}
                  className={`w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-extrabold text-white shadow-2xs hover:scale-110 hover:z-10 transition-transform cursor-pointer`}
                >
                  <Avatar name={sub.name} src={sub.avatar_url} className="w-full h-full text-[8px]" />
                </div>
              ))}
            </div>

            {/* Project / Campaign Status Pill */}
            <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              currentEntity.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                currentEntity.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span>{currentEntity.status === 'completed' ? (isEn ? 'Completed' : 'Hoàn thành') : (isEn ? 'In-Progress' : 'Đang thực hiện')}</span>
            </span>

          </div>
        </div>
  </>);
}
