import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { WorkflowModel } from '../../../hooks/useWorkflowManagement';
import {
  Layers,
  Search,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  FolderKanban,
  Megaphone,
  Check,
  X,
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { useWorkspaceDirectory } from '../../../hooks/useWorkspaceData';
import { isGlobalManager } from '../../../lib/roleScope';
import { displayDate, daysUntil, isDone, taskProgress } from '../../../lib/workflowHub';
import { priorityClass, getCampaignPriority } from '../projects/projectPresentation';

interface WorkflowHubViewProps {
  model: WorkflowModel;
}

export const WorkflowHubView: React.FC<WorkflowHubViewProps> = ({ model }) => {
  const { isEn, entities, hub, handleSelectEntity } = model;
  const directory = useWorkspaceDirectory();

  // Filters state
  const [hubTab, setHubTab] = useState<'all' | 'project' | 'campaign'>('all');
  const [hubSearch, setHubSearch] = useState('');
  const userIsRestricted = !isGlobalManager(hub.profile) && Boolean(hub.profile?.department_id);
  const [hubDept, setHubDept] = useState<string>(
    userIsRestricted && hub.profile?.department_id ? String(hub.profile.department_id) : 'all'
  );
  const [hubPic, setHubPic] = useState<string>('all');
  const [hubStatus, setHubStatus] = useState<string>('all');
  const [activePopup, setActivePopup] = useState<'search' | 'dept' | 'pic' | 'status' | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!activePopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActivePopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopup]);

  // Accessible departments
  const availableDepartments = useMemo(() => {
    const rawDepts = directory.data?.departments || [];
    if (userIsRestricted && hub.profile?.department_id) {
      return rawDepts.filter((d) => String(d.id) === String(hub.profile?.department_id));
    }
    return rawDepts;
  }, [directory.data?.departments, userIsRestricted, hub.profile?.department_id]);

  // People list for PIC dropdown
  const peopleList = useMemo(() => {
    return (hub.people || []).map((p) => ({
      id: p.id,
      name: p.name,
      avatar_url: p.avatar_url || null,
    }));
  }, [hub.people]);

  const [picSearchQuery, setPicSearchQuery] = useState('');
  const filteredPeople = useMemo(() => {
    if (!picSearchQuery.trim()) return peopleList;
    const q = picSearchQuery.trim().toLowerCase();
    return peopleList.filter((p) => p.name.toLowerCase().includes(q));
  }, [peopleList, picSearchQuery]);

  // Filter entities
  const filteredHubEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (hubTab === 'project' && entity.type !== 'project') return false;
      if (hubTab === 'campaign' && entity.type !== 'campaign') return false;

      if (hubSearch.trim()) {
        const q = hubSearch.trim().toLowerCase();
        if (!entity.name.toLowerCase().includes(q)) return false;
      }
      if (hubDept && hubDept !== 'all') {
        if (String(entity.department_id || '') !== String(hubDept)) return false;
      }
      if (hubPic && hubPic !== 'all') {
        const picMatched =
          entity.pics.some((p) => String(p.id) === hubPic) ||
          (entity.sub_pics || []).some((p) => String(p.id) === hubPic) ||
          (entity.creator && String(entity.creator.id) === hubPic) ||
          entity.phases.some((ph) => ph.members.some((m) => String(m.id) === hubPic));
        if (!picMatched) return false;
      }
      if (hubStatus === 'done') {
        if (!entity.isCompletedEntity && !isDone(entity.status)) return false;
      } else if (hubStatus === 'overdue') {
        const days = daysUntil(entity.due_date);
        if (entity.isCompletedEntity || isDone(entity.status) || days == null || days >= 0) return false;
      } else if (hubStatus === 'open') {
        const days = daysUntil(entity.due_date);
        if (entity.isCompletedEntity || isDone(entity.status) || (days != null && days < 0)) return false;
      }

      return true;
    });
  }, [entities, hubTab, hubSearch, hubDept, hubPic, hubStatus]);

  // Formatted update time (HH:mm)
  const [updateTimeStr] = useState(() => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());
  });

  return (
    <section className="card-hub rounded-[12px] border border-gray-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#0b1324]/95 shadow-sm overflow-hidden w-full">
      {/* Khu vực 1: Top Header & Toolbar */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800/80 space-y-4">
        {/* Dòng 1: Tiêu đề */}
        <div className="grid grid-flow-col auto-cols-max items-center gap-2.5">
          <Layers size={20} className="text-primary dark:text-sky-400 shrink-0" />
          <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {isEn ? 'Workflow Management' : 'Quản lý tiến độ'}
          </h1>
        </div>

        {/* Dòng 2: Tabs bên trái & 4 Nút Icon Filter bên phải */}
        <div ref={toolbarRef} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center justify-between gap-3">
          {/* Bên trái: Nút Tất cả & Hộp segmented Projects | Campaigns */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-2">
            <button
              type="button"
              onClick={() => setHubTab('all')}
              className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold border border-gray-200/80 dark:border-slate-700/80 shadow-2xs transition-all grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer ${
                hubTab === 'all'
                  ? 'bg-gradient-to-b from-blue-100/95 to-blue-200/80 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(37,99,235,.18)] ring-1 ring-blue-300/80 dark:from-sky-500/30 dark:to-blue-500/20 dark:!text-sky-100 dark:ring-sky-400/40'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>{isEn ? 'All' : 'Tất cả'}</span>
            </button>

            <div className="inline-grid grid-flow-col auto-cols-max items-center p-0.5 rounded-[8px] bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setHubTab('project')}
                className={`px-2.5 py-0.5 rounded-[6px] text-[10.5px] font-bold transition-all duration-200 grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer ${
                  hubTab === 'project'
                    ? 'bg-gradient-to-b from-violet-100/95 to-violet-200/80 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(124,58,237,.18)] ring-1 ring-violet-300/80 dark:from-violet-500/35 dark:to-purple-500/20 dark:!text-violet-100 dark:ring-violet-400/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FolderKanban
                  size={11}
                  className={hubTab === 'project' ? 'text-violet-600 dark:text-violet-300' : ''}
                />
                <span>Projects</span>
              </button>

              <button
                type="button"
                onClick={() => setHubTab('campaign')}
                className={`px-2.5 py-0.5 rounded-[6px] text-[10.5px] font-bold transition-all duration-200 grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer ${
                  hubTab === 'campaign'
                    ? 'bg-gradient-to-b from-amber-100/95 to-amber-200/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_6px_rgba(217,119,6,.18)] ring-1 ring-amber-300/80 dark:from-amber-500/35 dark:to-orange-500/20 dark:!text-amber-100 dark:ring-amber-300/40'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Megaphone
                  size={11}
                  className={hubTab === 'campaign' ? 'text-amber-600 dark:text-amber-300' : ''}
                />
                <span>Campaigns</span>
              </button>
            </div>
          </div>

          {/* Bên phải: 4 Nút Icon Vuông w-9 h-9 */}
          <div className="grid grid-flow-col auto-cols-max items-center gap-2 relative">
            {/* 1. Nút Search */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopup((prev) => (prev === 'search' ? null : 'search'))}
                title={isEn ? 'Search' : 'Tìm kiếm'}
                className={`w-9 h-9 rounded-[8px] border grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'search' || hubSearch.trim()
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <Search size={15} />
              </button>
              {activePopup === 'search' && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 p-2.5 rounded-[8px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      value={hubSearch}
                      onChange={(e) => setHubSearch(e.target.value)}
                      placeholder={isEn ? 'Search by name...' : 'Tìm kiếm theo tên...'}
                      className="w-full h-8 pl-8 pr-7 text-xs rounded-[6px] border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-sky-400"
                    />
                    {hubSearch && (
                      <button
                        type="button"
                        onClick={() => setHubSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Nút Phòng ban */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopup((prev) => (prev === 'dept' ? null : 'dept'))}
                title={isEn ? 'Filter by department' : 'Lọc theo phòng ban'}
                className={`w-9 h-9 rounded-[8px] border grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'dept' || (hubDept && hubDept !== 'all')
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <Building2 size={15} />
              </button>
              {activePopup === 'dept' && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 p-1.5 rounded-[8px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setHubDept('all');
                      setActivePopup(null);
                    }}
                    className={`w-full text-left p-2 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center cursor-pointer transition-colors ${
                      hubDept === 'all'
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{isEn ? 'All Departments' : 'Tất cả phòng ban'}</span>
                    {hubDept === 'all' && <Check size={13} />}
                  </button>
                  {availableDepartments.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setHubDept(String(d.id));
                        setActivePopup(null);
                      }}
                      className={`w-full text-left p-2 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center cursor-pointer transition-colors ${
                        String(hubDept) === String(d.id)
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      {String(hubDept) === String(d.id) && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Nút PIC */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopup((prev) => (prev === 'pic' ? null : 'pic'))}
                title={isEn ? 'Filter by PIC' : 'Lọc theo PIC'}
                className={`w-9 h-9 rounded-[8px] border grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'pic' || (hubPic && hubPic !== 'all')
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <Users size={15} />
              </button>
              {activePopup === 'pic' && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 p-2 rounded-[8px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  <div className="relative mb-1.5">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={picSearchQuery}
                      onChange={(e) => setPicSearchQuery(e.target.value)}
                      placeholder={isEn ? 'Filter PIC...' : 'Tìm nhân sự...'}
                      className="w-full h-7 pl-7 pr-2 text-xs rounded-[6px] border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHubPic('all');
                      setActivePopup(null);
                    }}
                    className={`w-full text-left p-1.5 rounded-[6px] text-xs grid grid-cols-[1fr_auto] items-center cursor-pointer transition-colors ${
                      hubPic === 'all'
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{isEn ? 'All PICs' : 'Tất cả PIC'}</span>
                    {hubPic === 'all' && <Check size={13} />}
                  </button>
                  {filteredPeople.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setHubPic(String(p.id));
                        setActivePopup(null);
                      }}
                      className={`w-full text-left p-1.5 rounded-[6px] text-xs grid grid-cols-[auto_1fr_auto] items-center gap-2 cursor-pointer transition-colors ${
                        String(hubPic) === String(p.id)
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Avatar name={p.name} src={p.avatar_url || undefined} className="w-5 h-5 text-[9px]" />
                      <span className="truncate">{p.name}</span>
                      {String(hubPic) === String(p.id) && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Nút Trạng thái */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePopup((prev) => (prev === 'status' ? null : 'status'))}
                title={isEn ? 'Filter by status' : 'Lọc theo trạng thái'}
                className={`w-9 h-9 rounded-[8px] border grid place-items-center transition-colors cursor-pointer ${
                  activePopup === 'status' || (hubStatus && hubStatus !== 'all')
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 size={15} />
              </button>
              {activePopup === 'status' && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-52 p-1.5 rounded-[8px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  {[
                    { key: 'all', label: isEn ? 'All Status' : 'Mọi trạng thái', dot: 'bg-slate-400' },
                    { key: 'open', label: isEn ? 'In Progress' : 'Đang thực hiện', dot: 'bg-blue-400' },
                    { key: 'done', label: isEn ? 'Completed' : 'Đã hoàn thành', dot: 'bg-emerald-400' },
                    { key: 'overdue', label: isEn ? 'Overdue' : 'Quá hạn', dot: 'bg-rose-400' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        setHubStatus(s.key);
                        setActivePopup(null);
                      }}
                      className={`w-full text-left p-2 rounded-[6px] text-xs grid grid-cols-[auto_1fr_auto] items-center gap-2 cursor-pointer transition-colors ${
                        hubStatus === s.key
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 font-bold'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span>{s.label}</span>
                      {hubStatus === s.key && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực 2: Lưới Thẻ Dự Án & Chiến Dịch (6 cột trên màn hình lớn, khoảng thở thoáng đẹp) */}
      <div className="p-5 sm:p-6">
        {filteredHubEntities.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">
            {isEn ? 'No projects or campaigns match your filter' : 'Không có dự án hoặc chiến dịch nào phù hợp bộ lọc'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
            {filteredHubEntities.map((entity) => {
              const daysLeft = daysUntil(entity.due_date);
              const isCompleted = entity.isCompletedEntity || isDone(entity.status);

              // Badge thời hạn (🕒 11d left)
              let daysLeftText = isEn ? 'No deadline' : 'Chưa có hạn';
              let daysLeftBadgeStyle = 'bg-slate-500/10 text-slate-400 border-slate-600/30';

              if (isCompleted) {
                daysLeftText = isEn ? 'Completed' : 'Hoàn thành';
                daysLeftBadgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
              } else if (daysLeft != null) {
                if (daysLeft < 0) {
                  daysLeftText = isEn ? `${Math.abs(daysLeft)}d overdue` : `Trễ ${Math.abs(daysLeft)}d`;
                  daysLeftBadgeStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
                } else if (daysLeft === 0) {
                  daysLeftText = isEn ? 'Today' : 'Hôm nay';
                  daysLeftBadgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
                } else {
                  daysLeftText = isEn ? `${daysLeft}d left` : `${daysLeft}d left`;
                  daysLeftBadgeStyle =
                    'bg-emerald-500/10 text-emerald-600 dark:text-[#34d399] border-emerald-500/30';
                }
              }

              // Card Status Class & Magnetic Hover Accent
              let statusClass = 'card-status-task';
              let magneticColor = 'magnetic-blue';

              if (isCompleted) {
                statusClass = 'card-status-done';
                magneticColor = 'magnetic-emerald';
              } else if (daysLeft != null && daysLeft < 0) {
                statusClass = 'card-status-overdue';
                magneticColor = 'magnetic-rose';
              } else if (entity.type === 'campaign') {
                statusClass = 'card-status-campaign';
                magneticColor = 'magnetic-amber';
              } else if (entity.type === 'project') {
                statusClass = 'card-status-project';
                magneticColor = 'magnetic-violet';
              }

              // Phase progress bar calculation (X/Y Giai đoạn xong)
              const totalPhases = entity.phases?.length || 0;
              const donePhases = (entity.phases || []).filter(
                (p) => p.status === 'completed' || isDone(p.status)
              ).length;

              const entityTasks = hub.tasks.filter((t) =>
                entity.type === 'project' ? t.project_id === entity.entity_id : t.campaign_id === entity.entity_id
              );
              const entityTaskProgress = taskProgress(entityTasks);

              let progressFillPct = 0;
              let progressLabel = '';
              if (totalPhases > 0) {
                progressFillPct = donePhases === 0 ? 0 : Math.max(16, Math.round((donePhases / totalPhases) * 100));
                progressLabel = isEn
                  ? `${donePhases}/${totalPhases} Phases done`
                  : `${donePhases}/${totalPhases} Giai đoạn xong`;
              } else {
                progressFillPct = entityTaskProgress.done === 0 ? 0 : Math.max(16, entityTaskProgress.percent || 0);
                progressLabel = isEn
                  ? `${entityTaskProgress.done}/${entityTaskProgress.total} Tasks done`
                  : `${entityTaskProgress.done}/${entityTaskProgress.total} Giai đoạn xong`;
              }

              // Lead / PIC Info
              const lead = (entity as any).lead || entity.pics?.[0] || entity.creator;
              const leadName = lead?.name || (isEn ? 'Unassigned' : 'Chưa giao');
              const leadAvatar = lead?.avatar_url || undefined;

              // Member Avatar Stack (excluding Lead)
              const memberMap = new Map<string, { id: string | number; name: string; avatar_url?: string | null }>();
              for (const p of entity.pics || []) {
                if (lead && String(p.id) === String(lead.id)) continue;
                memberMap.set(String(p.id), p);
              }
              for (const p of entity.sub_pics || []) {
                if (lead && String(p.id) === String(lead.id)) continue;
                memberMap.set(String(p.id), p);
              }
              for (const phase of entity.phases || []) {
                for (const m of phase.members || []) {
                  if (lead && String(m.id) === String(lead.id)) continue;
                  memberMap.set(String(m.id), m);
                }
              }
              const otherMembers = Array.from(memberMap.values());

              const rawPriority =
                entity.type === 'campaign'
                  ? getCampaignPriority({ id: entity.entity_id, priority: entity.priority, budget: entity.budget })
                  : entity.priority || 'medium';

              return (
                <button
                  key={`${entity.type}-${entity.id}`}
                  type="button"
                  onClick={() => handleSelectEntity(entity.id)}
                  className={`p-3.5 sm:p-4 rounded-[10px] transition-all duration-200 cursor-pointer text-left relative group/card min-w-0 hover-magnetic-card ${magneticColor} ${statusClass} hover:scale-[1.02] active:scale-[0.99] grid content-start gap-2`}
                >
                  {/* Hàng 1: Tên Dự án/Chiến dịch + Badge ({N} Phases) bên trái & Badge In-Progress/Completed bên phải */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-2 w-full min-w-0">
                    <div className="grid grid-cols-[minmax(0,max-content)_auto] items-center justify-start gap-1.5 min-w-0 overflow-hidden">
                      <h3 className="text-xs font-extrabold uppercase tracking-tight text-gray-900 dark:text-white truncate min-w-0">
                        {entity.name}
                      </h3>
                      <span
                        className={`w-fit px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold leading-none whitespace-nowrap shrink-0 border ${
                          entity.type === 'campaign'
                            ? 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-[#3b2510] dark:text-[#f59e0b] dark:border-amber-800/40'
                            : 'bg-violet-500/15 text-violet-700 border-violet-500/30 dark:bg-violet-950/70 dark:text-violet-300 dark:border-violet-800/40'
                        }`}
                      >
                        ({totalPhases} Phases)
                      </span>
                    </div>

                    {/* Status Pill */}
                    {isCompleted ? (
                      <span className="w-fit justify-self-end inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-bold leading-none border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="w-fit justify-self-end inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-bold leading-none border bg-amber-500/10 text-amber-600 dark:text-[#fbbf24] border-amber-500/35 shrink-0 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>In-Progress</span>
                      </span>
                    )}
                  </div>

                  {/* Hàng 2: Khoảng thời gian + Badge Thời hạn */}
                  <div className="grid grid-flow-col auto-cols-max items-center justify-start gap-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-0 overflow-hidden">
                    <span className="truncate min-w-0">
                      {displayDate(entity.start_date)} - {displayDate(entity.due_date)}
                    </span>
                    <span
                      className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border whitespace-nowrap shrink-0 ${daysLeftBadgeStyle}`}
                    >
                      <Clock size={10} />
                      <span>{daysLeftText}</span>
                    </span>
                  </div>

                  {/* Hàng 3: Thanh Tiến Độ Giai Đoạn (h-5 thanh thoát) */}
                  <div className="relative w-full h-5 rounded-full overflow-hidden bg-slate-100 dark:bg-[#0d1b2a] border border-gray-200/60 dark:border-slate-800 grid place-items-center">
                    {progressFillPct > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${progressFillPct}%` }}
                      />
                    )}
                    <span className="text-[10px] font-bold leading-none text-gray-800 dark:text-white relative z-10 select-none drop-shadow-sm">
                      {progressLabel}
                    </span>
                  </div>

                  {/* Hàng 4: Cụm Lead + Stack Avatar bên trái | Pill Priority bên phải */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-2 pt-2 border-t border-gray-200/60 dark:border-slate-800/80 min-w-0">
                    <div className="grid grid-flow-col auto-cols-max items-center justify-start gap-1.5 min-w-0 overflow-hidden">
                      {/* Pill Lead */}
                      <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1 pl-2 pr-0.5 py-0.5 rounded-full border border-amber-500/35 bg-amber-500/10 dark:bg-[#151c2c] dark:border-amber-600/40 w-fit">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-[#fbbf24]">Lead</span>
                        <Avatar
                          name={leadName}
                          src={leadAvatar}
                          className="w-4 h-4 rounded-full text-[8px] ring-1 ring-amber-400/50"
                        />
                      </div>

                      {/* Stack Avatar Thành viên */}
                      {otherMembers.length > 0 && (
                        <div className="grid grid-flow-col auto-cols-max items-center -space-x-1">
                          {otherMembers.slice(0, 3).map((m, idx) => (
                            <Avatar
                              key={`${m.id}-${idx}`}
                              name={m.name}
                              src={m.avatar_url || undefined}
                              className="w-4 h-4 rounded-full ring-1 ring-white dark:ring-[#0f172a] text-[7.5px] font-bold"
                            />
                          ))}
                          {otherMembers.length > 3 && (
                            <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[7.5px] font-bold grid place-items-center ring-1 ring-white dark:ring-[#0f172a]">
                              +{otherMembers.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pill Priority đồng bộ theo chuẩn Dashboard */}
                    <span
                      className={`w-fit justify-self-end px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize truncate shrink-0 ${priorityClass(rawPriority)}`}
                    >
                      {rawPriority}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Khu vực 3: Thanh Footer Chú Thích Màu + Giờ Cập Nhật */}
      <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-slate-400">
        {/* Bên trái: 5 chấm tròn màu chú thích */}
        <div className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-max items-center gap-x-4 gap-y-1.5">
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400 dark:!bg-[#61baff]" />
            <span>Task</span>
          </div>
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400 dark:!bg-[#6c2bff]" />
            <span>Project</span>
          </div>
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 dark:!bg-[#ffb500]" />
            <span>Campaign</span>
          </div>
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 dark:!bg-[#63f858]" />
            <span>{isEn ? 'Completed' : 'Đã hoàn thành'}</span>
          </div>
          <div className="grid grid-flow-col auto-cols-max items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400 dark:!bg-[#ff324b]" />
            <span>{isEn ? 'Overdue' : 'Quá hạn'}</span>
          </div>
        </div>

        {/* Bên phải: Giờ Cập Nhật */}
        <span className="text-[11px] text-gray-400 justify-self-end">
          {isEn ? `Updated ${updateTimeStr}` : `Cập nhật ${updateTimeStr}`}
        </span>
      </div>
    </section>
  );
};
