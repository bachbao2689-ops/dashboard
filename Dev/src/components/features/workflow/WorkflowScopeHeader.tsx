import type {WorkflowModel} from '../../../hooks/useWorkflowManagement';
import {FolderKanban, Megaphone, ChevronDown, ChevronUp, Search, User, Clock, ArrowLeft, X, Info} from 'lucide-react';
import {Avatar} from '../../common/Avatar';

export function WorkflowScopeHeader({
  model,
  showKpis = true,
  onToggleKpis,
}: {
  model: WorkflowModel;
  showKpis?: boolean;
  onToggleKpis?: () => void;
}) {
  const {isEn, entityFilter, isTitleDropdownOpen, setIsTitleDropdownOpen, searchEntityQuery, setSearchEntityQuery, currentEntity, selectedEntityId, isCampaign, filteredEntities, handleFilterChange, handleSelectEntity, handleBackToHub, entities, daysRemaining, entityTimeline, subTeamMembers, leadInfo} = model;
  if (!currentEntity) return null;

  const primaryLeads = (currentEntity?.pics && currentEntity.pics.length > 1) 
    ? currentEntity.pics.slice(0, 2) 
    : (currentEntity?.pics?.[0] ? [currentEntity.pics[0]] : ((currentEntity as any)?.lead ? [(currentEntity as any).lead] : []));
  const primaryLeadIds = new Set(primaryLeads.map(p => String(p.id)));
  const otherMembers = subTeamMembers.filter(m => !primaryLeadIds.has(String(m.id)));
  return (
    <div className="grid content-between gap-2.5 w-full">
      {/* Top Row: Button trên title scale nhỏ 20% (Projects / Campaigns) & Toggle KPI (Requirement 1 & 2) */}
      <div className="grid grid-flow-col auto-cols-max items-center gap-2">
            {/* Back to All Projects / Campaigns */}
            <button
              type="button"
              onClick={handleBackToHub}
              className="px-2.5 py-1 rounded-[8px] text-[11px] font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 hover:bg-gray-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer"
              title={isEn ? "Back to All Projects & Campaigns" : "Quay lại danh sách Tất cả Dự án / Chiến dịch"}
            >
              <ArrowLeft size={12} className="text-gray-500 dark:text-slate-400" />
              <span>{isEn ? `All (${entities.length})` : `Tất cả (${entities.length})`}</span>
            </button>
        <div className="inline-grid grid-flow-col auto-cols-max items-center p-0.5 rounded-[8px] bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
          <button
            type="button"
            onClick={() => handleFilterChange('project')}
            className={`px-2.5 py-0.5 rounded-[6px] text-[10.5px] font-bold transition-all duration-200 grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer ${
              entityFilter === 'project'
                ? 'bg-gradient-to-b from-violet-100/95 to-violet-200/80 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(124,58,237,.18)] ring-1 ring-violet-300/80 dark:from-violet-500/35 dark:to-purple-500/20 dark:!text-violet-100 dark:ring-violet-400/40'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <FolderKanban size={11} className={entityFilter === 'project' ? 'text-violet-600 dark:text-violet-300' : ''} />
            <span>Projects</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('campaign')}
            className={`px-2.5 py-0.5 rounded-[6px] text-[10.5px] font-bold transition-all duration-200 grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer ${
              entityFilter === 'campaign'
                ? 'bg-gradient-to-b from-amber-100/95 to-amber-200/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(217,119,6,.18)] ring-1 ring-amber-300/80 dark:from-amber-500/35 dark:to-orange-500/20 dark:!text-amber-100 dark:ring-amber-300/40'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Megaphone size={11} className={entityFilter === 'campaign' ? 'text-amber-600 dark:text-amber-300' : ''} />
            <span>Campaigns</span>
          </button>
        </div>

        {onToggleKpis && (
          <button
            type="button"
            onClick={onToggleKpis}
            className="px-2 py-1 rounded-[8px] text-[10.5px] font-bold text-gray-600 dark:text-slate-300 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs transition-all grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer"
            title={isEn ? (showKpis ? 'Collapse Performance cards' : 'Expand Performance cards') : (showKpis ? 'Đóng thẻ Performance' : 'Mở thẻ Performance')}
            aria-label={isEn ? 'Toggle KPIs' : 'Đóng mở thẻ Performance'}
          >
            <span>{isEn ? 'Performance' : 'Performance'}</span>
            {showKpis ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Main Title as Filter Dropdown */}
      <div className="relative my-0.5 min-w-0 max-w-full">
        <button
          type="button"
          onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
          className={`inline-grid grid-flow-col auto-cols-max max-w-full min-w-0 items-center gap-2.5 px-3 py-2 -ml-1 rounded-[10px] border transition-all duration-200 group text-left focus:outline-none cursor-pointer w-fit shadow-2xs ${
            isTitleDropdownOpen
              ? isCampaign
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-700/60 shadow-xs'
                : 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-300/80 dark:border-violet-700/60 shadow-xs'
              : 'bg-gray-50/60 hover:bg-gray-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-gray-200/80 dark:border-slate-700/80 hover:border-violet-300/70 dark:hover:border-violet-500/40'
          }`}
          title={isEn ? "Click to select and filter Project / Campaign" : "Bấm để chọn và lọc Project / Campaign"}
        >
          <div className={`p-1.5 rounded-[8px] shrink-0 transition-colors border ${
            isCampaign
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25 group-hover:bg-amber-500/25'
              : 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/25 group-hover:bg-violet-500/25'
          }`}>
            {isCampaign ? <Megaphone size={18} /> : <FolderKanban size={18} />}
          </div>
          <h1 className={`min-w-0 max-w-[min(650px,50vw)] truncate text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight transition-colors ${
            isCampaign ? 'group-hover:text-amber-600 dark:group-hover:text-amber-300' : 'group-hover:text-violet-600 dark:group-hover:text-violet-300'
          }`}>
            {currentEntity.name.startsWith('[Project]') || currentEntity.name.startsWith('[Campaign]') 
              ? currentEntity.name 
              : `[${isCampaign ? 'Campaign' : 'Project'}] ${currentEntity.name}`}
          </h1>
          <span className={`w-6 h-6 rounded-[6px] grid place-items-center shrink-0 border transition-all duration-200 ${
            isTitleDropdownOpen
              ? isCampaign
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-600 dark:text-amber-300'
                : 'bg-violet-500/20 border-violet-400/50 text-violet-600 dark:text-violet-300'
              : 'bg-white dark:bg-slate-900/80 border-gray-200/90 dark:border-slate-700 text-gray-500 dark:text-slate-400 group-hover:border-violet-300 dark:group-hover:border-violet-600 group-hover:text-violet-600 dark:group-hover:text-violet-300'
          }`}>
            <ChevronDown
              size={15}
              strokeWidth={2.4}
              className={`transition-transform duration-200 ${
                isTitleDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>

        {/* Dropdown Menu to choose Project / Campaign */}
        {isTitleDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsTitleDropdownOpen(false)}
            />
            <div className="absolute z-50 left-0 top-full mt-2 w-[min(24rem,calc(100vw-3rem))] p-2 rounded-[8px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchEntityQuery}
                  onChange={e => setSearchEntityQuery(e.target.value)}
                  placeholder={isEn ? "Search project or campaign..." : "Tìm kiếm dự án hoặc chiến dịch..."}
                  className="w-full pl-8 pr-8 py-1.5 text-xs rounded-[8px] border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-violet-500"
                  autoFocus
                />
                {searchEntityQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchEntityQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                    title={isEn ? "Clear search" : "Xóa tìm kiếm"}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {!model.canManagePhases && (
                <div className="mb-2 p-2 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] font-semibold text-amber-700 dark:text-amber-300 grid grid-flow-col auto-cols-max items-center gap-1.5">
                  <Info size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{isEn ? 'You are not authorized to create Phases' : 'Bạn không được phân quyền tạo Phase'}</span>
                </div>
              )}

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                      {!model.isSearchingEntities
                        ? (isEn ? 'Recent • Active' : 'Gần đây • Đang hoạt động')
                        : (isEn ? 'Search results (including completed)' : 'Kết quả tìm kiếm (gồm cả mục đã xong)')}
                    </div>
                    {filteredEntities.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        {isEn ? 'No matching projects found' : 'Không tìm thấy dự án phù hợp'}
                      </div>
                    ) : (
                      filteredEntities.map(e => {
                        const isSelected = e.id === selectedEntityId;
                        const isCompleted = Boolean((e as any).isCompletedEntity);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              handleSelectEntity(e.id);
                              setIsTitleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center gap-2 transition-colors cursor-pointer ${
                              isSelected
                                ? e.type === 'campaign'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
                                  : 'bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="grid grid-flow-col auto-cols-max items-center gap-2 min-w-0">
                              {e.type === 'campaign' ? (
                                <Megaphone size={14} className="shrink-0 text-amber-500" />
                              ) : (
                                <FolderKanban size={14} className="shrink-0 text-violet-500" />
                              )}
                              <span className="truncate">{e.name}</span>
                            </div>
                            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 shrink-0">
                              {isCompleted && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {isEn ? 'Done' : 'Hoàn thành'}
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px] ${
                                e.type === 'campaign' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                              }`}>
                                {e.type === 'campaign' ? 'Campaign' : 'Project'}
                              </span>
                            </div>
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
          <div className="grid grid-flow-col auto-cols-max items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{entityTimeline}</span>
            <span className="grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
          <div className="grid grid-flow-col auto-cols-max items-center gap-2 pt-0.5">
            {/* Lead chính badge (1 hoặc 2 người) */}
            <div title={primaryLeads.length > 0 ? primaryLeads.map(p => p.name).join(" · ") : leadInfo.name} className={`grid grid-flow-col auto-cols-max items-center gap-1.5 px-2 py-0.5 rounded-[6px] border shadow-2xs ${
              isCampaign
                ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60"
                : "bg-violet-50/90 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/60"
            }`}>
              {primaryLeads.length > 1 ? (
                <div className="grid grid-flow-col auto-cols-max items-center -space-x-1.5">
                  {primaryLeads.map(lead => (
                    <div key={lead.id} className="w-4 h-4 rounded-full border border-white dark:border-slate-900 overflow-hidden shadow-2xs">
                      {lead.avatar_url ? (
                        <img src={lead.avatar_url} alt={lead.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full grid place-items-center text-[8px] font-bold text-white ${
                          isCampaign ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-violet-600 to-purple-600'
                        }`}>
                          <User size={8} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`w-4 h-4 rounded-full grid place-items-center text-[9px] font-bold text-white shadow-xs ${
                  isCampaign ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-violet-600 to-purple-600'
                }`}>
                  {leadInfo.avatar || primaryLeads[0]?.avatar_url ? (
                    <img src={leadInfo.avatar || primaryLeads[0]?.avatar_url} alt={leadInfo.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={10} />
                  )}
                </div>
              )}
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-[6px] ${
                isCampaign ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300" : "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
              }`}>
                Lead
              </span>
            </div>

            {/* Sub track members dạng avatar tròn xếp chồng */}
            {otherMembers.length > 0 && (
              <div className="grid grid-flow-col auto-cols-max items-center -space-x-1.5">
                {otherMembers.slice(0, 4).map(sub => (
                  <div
                    key={sub.id}
                    title={`${sub.name} ${isEn ? '(Team member)' : '(Thành viên tham gia)'}`}
                    className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 border-2 border-white dark:border-slate-900 grid place-items-center text-[8px] font-extrabold text-white shadow-2xs hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                  >
                    <Avatar name={sub.name} src={sub.avatar_url || undefined} className="w-full h-full text-[8px]" />
                  </div>
                ))}
                {otherMembers.length > 4 && (
                  <div
                    className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 grid place-items-center text-[8px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs z-10"
                    title={`${otherMembers.length - 4} ${isEn ? 'more members' : 'thành viên khác'}`}
                  >
                    +{otherMembers.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Project / Campaign Status Pill */}
            <span className={`grid grid-flow-col auto-cols-max items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-[10px] font-bold border ${
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
  );
}
