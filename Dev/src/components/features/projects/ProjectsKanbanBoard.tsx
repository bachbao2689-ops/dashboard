import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Megaphone, FolderKanban, Plus, EyeOff, Trash2, FileText, Check } from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { ActionButton } from '../../common/ActionButton';
import { EntityInfoPopover } from './EntityInfoPopover';
import { CommentPreviewPopover } from '../../common/CommentPreviewPopover';
import { SlidingToolbarGroup } from '../../common/SlidingToolbarGroup';
import { EntityNoteCell } from './EntityNoteCell';
import {
  type Project,
  priorityClass,
  getDueStatusLabel,
  getCampaignPriority
} from './projectPresentation';
import { isTaskDone } from '../../../lib/taskTracking';
import { useTranslation } from '../../../i18n/translations';
import { useRememberedState } from '../../../hooks/useRememberedState';
import { isGlobalManager, isDepartmentLeader, isAdmin } from '../../../lib/roleScope';

export interface ProjectsKanbanBoardProps {
  projects: Project[];
  campaigns: any[];
  entityFilter?: 'all' | 'campaign' | 'project';
  workflowTracks: any[];
  people: any[];
  picMembers: Record<string, string[]>;
  subtaskMembers: Record<string, string[]>;
  projectPrimaryOwners: Record<string, number>;
  projectSubtasksMap?: Record<string, any[]>;
  campaignSubtasksMap?: Record<string, any[]>;
  campaignSubtaskAssigneesMap?: Record<string, any[]>;
  hasComments: Record<string, boolean>;
  hasCampaignComments: Record<string, boolean>;
  hasMentionOrUnread: Record<string, boolean>;
  canCreate: boolean;
  canManageProject: (project: Project) => boolean;
  canManageCampaign: (campaign: any) => boolean;
  onSelectProject: (project: Project) => void;
  onSelectCampaign: (campaign: any) => void;
  onCreateItem: (statusKey: string, defaultKind?: 'project' | 'campaign') => void;
  onUpdateProjectStatus: (id: string, nextStatus: string) => Promise<void>;
  onUpdateCampaignStatus: (id: string, nextStatus: string) => Promise<void>;
  onHideProject?: (project: Project, anchorEl?: HTMLElement | null) => void;
  onDeleteProject?: (project: Project, anchorEl?: HTMLElement | null) => void;
  onHideCampaign?: (campaign: any, anchorEl?: HTMLElement | null) => void;
  onDeleteCampaign?: (campaign: any, anchorEl?: HTMLElement | null) => void;
  profile?: any;
}

interface ColumnConfig {
  key: 'draft_on_hold' | 'planning' | 'active' | 'completed';
  labelVi: string;
  labelEn: string;
  dotColor: string;
  pillClass: string;
  countBadgeClass: string;
  glowClass: string;
  targetStatus: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: 'draft_on_hold',
    labelVi: 'DRAFT / TO-DO & ON HOLD',
    labelEn: 'DRAFT / TO-DO & ON HOLD',
    dotColor: 'bg-slate-400',
    pillClass: 'bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700/80',
    countBadgeClass: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700',
    glowClass: 'board-glow-slate',
    targetStatus: 'draft'
  },
  {
    key: 'planning',
    labelVi: 'PLANNING',
    labelEn: 'PLANNING',
    dotColor: 'bg-purple-500',
    pillClass: 'bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
    countBadgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
    glowClass: 'board-glow-purple',
    targetStatus: 'planning'
  },
  {
    key: 'active',
    labelVi: 'IN PROGRESS',
    labelEn: 'IN PROGRESS',
    dotColor: 'bg-sky-500',
    pillClass: 'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
    countBadgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60',
    glowClass: 'board-glow-sky',
    targetStatus: 'active'
  },
  {
    key: 'completed',
    labelVi: 'COMPLETED',
    labelEn: 'COMPLETED',
    dotColor: 'bg-emerald-500',
    pillClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    countBadgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
    glowClass: 'board-glow-emerald',
    targetStatus: 'completed'
  }
];

function matchColumn(status?: string | null): ColumnConfig['key'] {
  const norm = (status || 'active').toLowerCase().trim();
  if (['draft', 'todo', 'pending', 'on_hold', 'paused', 'holding'].includes(norm)) return 'draft_on_hold';
  if (norm === 'planning') return 'planning';
  if (['done', 'complete', 'completed', 'pending_approval'].includes(norm)) return 'completed';
  return 'active';
}

export const ProjectsKanbanBoard: React.FC<ProjectsKanbanBoardProps> = ({
  projects,
  campaigns,
  entityFilter: externalEntityFilter,
  workflowTracks,
  people,
  picMembers,
  subtaskMembers,
  projectPrimaryOwners,
  projectSubtasksMap,
  campaignSubtasksMap,
  campaignSubtaskAssigneesMap,
  hasComments,
  hasCampaignComments,
  hasMentionOrUnread,
  canCreate,
  canManageProject,
  canManageCampaign,
  onSelectProject,
  onSelectCampaign,
  onCreateItem,
  onUpdateProjectStatus,
  onUpdateCampaignStatus,
  onHideProject,
  onDeleteProject,
  onHideCampaign,
  onDeleteCampaign,
  profile
}) => {
  const { lang, t } = useTranslation();
  const isManager = Boolean(profile && (isGlobalManager(profile) || isAdmin(profile)));
  const isLeader = Boolean(profile && isDepartmentLeader(profile));
  const canApprove = isManager || isLeader;

  // Use passed entityFilter or fallback to remembered state
  const [localEntityFilter] = useRememberedState<'all' | 'campaign' | 'project'>('projects.boardEntityFilter', 'all');
  const entityFilter = externalEntityFilter ?? localEntityFilter;
  const [colOneSubFilter, setColOneSubFilter] = useState<'all' | 'draft' | 'on_hold'>('all');
  const [draggedItem, setDraggedItem] = useState<{ kind: 'project' | 'campaign'; id: string; fromStatus: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [noteOpenRequests, setNoteOpenRequests] = useState<Record<string, number>>({});
  const [draftPlusOpen, setDraftPlusOpen] = useState(false);
  const [draftBottomPlusOpen, setDraftBottomPlusOpen] = useState(false);
  const draftPlusRef = useRef<HTMLDivElement>(null);
  const draftBottomPlusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (draftPlusRef.current && !draftPlusRef.current.contains(e.target as Node)) {
        setDraftPlusOpen(false);
      }
      if (draftBottomPlusRef.current && !draftBottomPlusRef.current.contains(e.target as Node)) {
        setDraftBottomPlusOpen(false);
      }
    };
    if (draftPlusOpen || draftBottomPlusOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [draftPlusOpen, draftBottomPlusOpen]);

  const handleTriggerNote = (itemKey: string) => {
    setNoteOpenRequests((prev) => ({
      ...prev,
      [itemKey]: (prev[itemKey] || 0) + 1,
    }));
  };

  // Group items by column (4 columns)
  const columnItems = useMemo(() => {
    const map: Record<ColumnConfig['key'], Array<{ kind: 'project' | 'campaign'; raw: any }>> = {
      draft_on_hold: [],
      planning: [],
      active: [],
      completed: []
    };

    if (entityFilter !== 'project') {
      campaigns.forEach(c => {
        const colKey = matchColumn(c.status);
        map[colKey].push({ kind: 'campaign', raw: c });
      });
    }

    if (entityFilter !== 'campaign') {
      projects.forEach(p => {
        const colKey = matchColumn(p.status);
        map[colKey].push({ kind: 'project', raw: p });
      });
    }

    return map;
  }, [campaigns, projects, entityFilter]);

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, kind: 'project' | 'campaign', id: string, fromStatus: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind, id, fromStatus }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ kind, id, fromStatus });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, col: ColumnConfig) => {
    e.preventDefault();
    setDragOverCol(null);

    let data: { kind: 'project' | 'campaign'; id: string; fromStatus: string } | null = null;
    try {
      const rawJson = e.dataTransfer.getData('text/plain');
      if (rawJson) {
        data = JSON.parse(rawJson);
      }
    } catch {
      data = null;
    }

    if (!data && draggedItem) {
      data = draggedItem;
    }

    if (!data) return;

    const { kind, id, fromStatus } = data;
    let nextStatus = col.targetStatus;

    if (col.key === 'completed') {
      // Khi Staff kéo sang COMPLETED -> 'pending_approval' (Chờ duyệt)
      // Khi Leader / Manager / Admin kéo sang COMPLETED -> 'completed' (Done)
      nextStatus = canApprove ? 'completed' : 'pending_approval';
    } else if (col.key === 'draft_on_hold') {
      const normFrom = (fromStatus || '').toLowerCase();
      if (['on_hold', 'paused', 'holding'].includes(normFrom)) {
        nextStatus = 'on_hold';
      } else {
        nextStatus = 'draft';
      }
    }

    if (fromStatus === nextStatus) return;

    if (kind === 'project') {
      await onUpdateProjectStatus(id, nextStatus);
    } else {
      await onUpdateCampaignStatus(id, nextStatus);
    }

    setDraggedItem(null);
  };

  return (
    <div className="w-full pb-20 pr-1 select-none">
      {/* Mobile Quick-Jump Pills (< 640px) */}
      <div className="sm:hidden mb-3 grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar py-1 px-1.5 rounded-[8px] bg-white/85 dark:bg-[#152338]/90 border border-gray-200/80 dark:border-[#34465c]">
        {COLUMNS.map((col) => {
          const count = (columnItems[col.key] || []).length;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => {
                const el = document.getElementById(`kanban-col-${col.key}`);
                el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
              }}
              className={`px-2 py-1 rounded-[6px] text-[10.5px] font-bold border transition-all grid grid-flow-col auto-cols-max items-center gap-1 cursor-pointer shrink-0 ${col.pillClass}`}
            >
              <span>{lang === 'en' ? col.labelEn : col.labelVi}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${col.countBadgeClass}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontal Scrollable Kanban Columns */}
      <div className="overflow-x-auto pb-4 -mx-1 px-1 custom-scrollbar snap-x snap-mandatory sm:snap-none scroll-smooth">
        <div className="grid grid-flow-col auto-cols-[minmax(272px,84vw)] sm:auto-cols-[minmax(285px,1fr)] sm:min-w-[1160px] gap-3.5 items-start">
          {COLUMNS.map(col => {
            const items = columnItems[col.key] || [];
            const isDragOver = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                id={`kanban-col-${col.key}`}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => void handleDrop(e, col)}
                className={`card-hub snap-start rounded-[8px] border transition-all duration-150 grid grid-rows-[auto_1fr_auto] gap-2.5 p-2.5 min-h-[380px] sm:min-h-[580px] ${
                  isDragOver
                    ? '!border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200/80 dark:!border-[#34465c]'
                }`}
              >
                {/* Column Header: Status Pill and Count Badge colored according to status */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 pb-2 border-b border-gray-200/70 dark:border-[#293a50]">
                  {col.key === 'draft_on_hold' ? (
                    (() => {
                      const draftCount = items.filter(i => ['draft', 'todo', 'pending'].includes((i.raw.status || '').toLowerCase().trim())).length;
                      const onHoldCount = items.filter(i => ['on_hold', 'paused', 'holding'].includes((i.raw.status || '').toLowerCase().trim())).length;
                      return (
                        <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 overflow-hidden">
                          <SlidingToolbarGroup
                            className="p-0.5 rounded-[6px] bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 gap-1"
                            showHoverPill={true}
                            showActivePill={false}
                          >
                            <button
                              type="button"
                              onClick={() => setColOneSubFilter(curr => curr === 'draft' ? 'all' : 'draft')}
                              title={colOneSubFilter === 'draft' ? (lang === 'en' ? 'Click to show all' : 'Bấm để hiện tất cả') : (lang === 'en' ? 'Filter by Draft / To-Do' : 'Lọc theo Draft / To-Do')}
                              className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold transition-all cursor-pointer ${
                                colOneSubFilter === 'draft'
                                  ? 'bg-slate-200 text-slate-900 border border-slate-400 dark:bg-slate-700 dark:text-white dark:border-slate-500 shadow-xs ring-1 ring-slate-400/50'
                                  : colOneSubFilter === 'on_hold'
                                  ? 'bg-transparent text-slate-400 dark:text-slate-500 border border-transparent opacity-55 hover:opacity-90'
                                  : 'bg-white/80 text-slate-700 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                              }`}
                            >
                              <span>DRAFT / TO-DO</span>
                              <span className="text-[9.5px] font-bold opacity-80">({draftCount})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setColOneSubFilter(curr => curr === 'on_hold' ? 'all' : 'on_hold')}
                              title={colOneSubFilter === 'on_hold' ? (lang === 'en' ? 'Click to show all' : 'Bấm để hiện tất cả') : (lang === 'en' ? 'Filter by On Hold' : 'Lọc theo On Hold')}
                              className={`inline-grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold transition-all cursor-pointer ${
                                colOneSubFilter === 'on_hold'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-400 dark:bg-amber-900/80 dark:text-amber-100 dark:border-amber-600 shadow-xs ring-1 ring-amber-400/50'
                                  : colOneSubFilter === 'draft'
                                  ? 'bg-transparent text-amber-500/70 border border-transparent opacity-55 hover:opacity-90'
                                  : 'bg-white/80 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100/70 dark:hover:bg-amber-900/60'
                              }`}
                            >
                              <span>ON HOLD</span>
                              <span className="text-[9.5px] font-bold opacity-80">({onHoldCount})</span>
                            </button>
                          </SlidingToolbarGroup>
                          <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${col.countBadgeClass}`}>
                            {items.length}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5">
                      <div className={`inline-grid grid-flow-col auto-cols-max items-center px-2 py-0.5 rounded-[6px] text-[11px] font-bold uppercase tracking-wider ${col.pillClass}`}>
                        <span>{lang === 'en' ? col.labelEn : col.labelVi}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${col.countBadgeClass}`}>
                        {items.length}
                      </span>
                    </div>
                  )}

                  {canCreate && (
                    col.key === 'draft_on_hold' ? (
                      colOneSubFilter === 'draft' ? (
                        <button
                          type="button"
                          onClick={() => onCreateItem('draft', entityFilter === 'campaign' ? 'campaign' : 'project')}
                          title={lang === 'en' ? 'Add Draft' : 'Thêm Draft'}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-primary dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      ) : colOneSubFilter === 'on_hold' ? (
                        <button
                          type="button"
                          onClick={() => onCreateItem('on_hold', entityFilter === 'campaign' ? 'campaign' : 'project')}
                          title={lang === 'en' ? 'Add On Hold' : 'Thêm On Hold'}
                          className="p-1 rounded-[6px] text-gray-400 hover:text-primary dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      ) : (
                        <div className="relative" ref={draftPlusRef}>
                          <button
                            type="button"
                            onClick={() => setDraftPlusOpen(!draftPlusOpen)}
                            title={lang === 'en' ? 'Add Item' : 'Thêm mới'}
                            className="p-1 rounded-[6px] text-gray-400 hover:text-primary dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>
                          {draftPlusOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-150 grid grid-cols-1 gap-1"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftPlusOpen(false);
                                  onCreateItem('draft', entityFilter === 'campaign' ? 'campaign' : 'project');
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300"
                              >
                                <span>+ DRAFT / TO-DO</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftPlusOpen(false);
                                  onCreateItem('on_hold', entityFilter === 'campaign' ? 'campaign' : 'project');
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/40 grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer text-amber-700 dark:text-amber-300"
                              >
                                <span>+ ON HOLD</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCreateItem(col.targetStatus, entityFilter === 'campaign' ? 'campaign' : 'project')}
                        title={lang === 'en' ? `Add to ${col.labelEn}` : `Thêm vào ${col.labelVi}`}
                        className="p-1 rounded-[6px] text-gray-400 hover:text-primary dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    )
                  )}
                </div>

                {/* Column Body: Cards List */}
                <div className="grid gap-2.5 content-start overflow-y-auto max-h-[calc(100dvh-250px)] sm:max-h-[calc(100vh-270px)] -mx-1.5 px-1.5 py-1 custom-scrollbar">
                  {(() => {
                    const filteredItems = col.key === 'draft_on_hold'
                      ? items.filter(({ raw }) => {
                          const s = (raw.status || '').toLowerCase().trim();
                          const isDraft = ['draft', 'todo', 'pending'].includes(s);
                          const isOnHold = ['on_hold', 'paused', 'holding'].includes(s);
                          if (colOneSubFilter === 'draft') return isDraft;
                          if (colOneSubFilter === 'on_hold') return isOnHold;
                          return true;
                        })
                      : items;

                    if (filteredItems.length === 0) {
                      return (
                        <div className="py-10 text-center border border-dashed border-gray-200/80 dark:border-[#2c3e55] rounded-[8px] text-xs text-gray-400 dark:text-gray-400">
                          {t('projects.boardEmptyCol') || 'Không có mục nào trong cột này'}
                        </div>
                      );
                    }

                    return filteredItems.map(({ kind, raw }) => {
                      const isCampaign = kind === 'campaign';
                      const id = String(raw.id);
                      const title = isCampaign ? (raw.name || '') : (raw.name || '');
                      const desc = isCampaign ? raw.objective : raw.description;
                      const priority = isCampaign ? getCampaignPriority(raw) : (raw.priority || 'medium');
                      const dueDate = isCampaign ? raw.end_date : raw.due_date;
                      const status = raw.status || 'active';
                      const canManage = isCampaign ? canManageCampaign(raw) : canManageProject(raw);
                      const isDragging = draggedItem?.id === id && draggedItem?.kind === kind;

                      // Phase info
                      const track = workflowTracks.find(
                        (t: any) => t.entity_type === (isCampaign ? 'campaign' : 'project') && String(t.entity_id).trim() === id.trim()
                      );
                      const hasPhases = (track?.phases?.length || 0) > 0;
                      const phases = track?.phases || [];
                      const phaseCount = phases.length;

                      // Unassigned Tasks calculation (accurate for both Project and Campaign)
                      let unassignedCount = 0;
                      let isAllUnassignedDone = false;
                      if (!isCampaign) {
                        const rawSubtasks = (projectSubtasksMap?.[id] || []).filter(
                          (s: any) => s.status !== 'deleted' && s.status !== 'archived'
                        );
                        const unassignedSubtasks = rawSubtasks.filter((s: any) => {
                          if (phaseCount === 0) return true;
                          return !s.workflow_phase_id;
                        });
                        unassignedCount = unassignedSubtasks.length;
                        isAllUnassignedDone = unassignedCount > 0 && unassignedSubtasks.every((s: any) => isTaskDone(s.status));
                      } else {
                        const rawSubtasks = (campaignSubtasksMap?.[id] || []).filter(
                          (s: any) => s.status !== 'deleted' && s.status !== 'archived'
                        );
                        const unassignedSubtasks = rawSubtasks.filter((s: any) => {
                          if (phaseCount === 0) return true;
                          return !s.workflow_phase_id;
                        });
                        unassignedCount = unassignedSubtasks.length;
                        isAllUnassignedDone = unassignedCount > 0 && unassignedSubtasks.every((s: any) => isTaskDone(s.status));
                      }

                      // Primary PIC info
                      const leadId = isCampaign
                        ? raw.lead_id
                        : (projectPrimaryOwners[id] || (picMembers[id] || [])[0]);
                      const leadPerson = leadId
                        ? people.find(x => String(x.id) === String(leadId))
                        : (isCampaign ? raw.lead : null);

                      // Filtered Sub Persons (identical to List view logic)
                      let filteredSubPersons: any[] = [];
                      if (!isCampaign) {
                        const primaryPicIds = new Set([
                          ...(picMembers[id] || []).map(String),
                          raw.lead_id ? String(raw.lead_id) : '',
                          projectPrimaryOwners[id] ? String(projectPrimaryOwners[id]) : ''
                        ].filter(Boolean));
                        filteredSubPersons = (subtaskMembers[id] || [])
                          .filter(memberId => !primaryPicIds.has(String(memberId)))
                          .map(memberId => {
                            const p = people.find(x => String(x.id) === String(memberId));
                            return { id: memberId, name: p?.name || 'Unknown', avatar_url: (p as any)?.avatar_url };
                          });
                      } else {
                        const leadIdStr = raw.lead_id ? String(raw.lead_id) : '';
                        const leadName = String(raw.lead?.name || '').trim().toLowerCase();
                        const rawSubs = campaignSubtaskAssigneesMap?.[id] || [];
                        filteredSubPersons = rawSubs.filter((assignee: any) => {
                          if (leadIdStr && String(assignee.id) === leadIdStr) return false;
                          if (leadName && String(assignee.name || '').trim().toLowerCase() === leadName) return false;
                          return true;
                        });
                      }

                      const itemHasComments = isCampaign ? hasCampaignComments[id] : hasComments[id];
                      const itemHasUnread = Boolean(
                        (leadId && Number(leadId) === Number(raw.profile?.id)) || hasMentionOrUnread?.[id]
                      );

                      return (
                        <article
                          key={`${kind}-${id}`}
                          data-board-card="true"
                          draggable={canManage}
                          onDragStart={(e) => handleDragStart(e, kind, id, status)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (isCampaign) onSelectCampaign(raw);
                            else onSelectProject(raw);
                          }}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                            e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                          }}
                          className={`min-w-0 rounded-[8px] border bg-white dark:bg-[#162436]/95 border-gray-200/90 dark:border-[#2c3e55] hover:border-gray-300 dark:hover:border-[#3e5673] p-3 shadow-2xs hover:shadow-md transition-all relative group grid gap-2 hover-board-card ${col.glowClass} hover:z-30 ${
                            canManage ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                          } ${
                            isDragging
                              ? 'opacity-40 border-dashed border-primary scale-[0.98]'
                              : ''
                          }`}
                        >
                          {/* Card Top Row: 
                              1. Label Project/Campaign 
                              2. Label Task
                              3. Icon Comments
                              4. Icon (i) 
                              Hover Quick Actions on the right */}
                          <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 min-w-0">
                            <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0 overflow-hidden">
                              {/* 1. Label Project / Campaign */}
                              {isCampaign ? (
                                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/50 shrink-0">
                                  <Megaphone size={11} className="text-amber-500" />
                                  <span>{t('projects.col.campaign') || 'Chiến dịch'}</span>
                                </span>
                              ) : (
                                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border border-violet-200/80 dark:border-violet-800/50 shrink-0">
                                  <FolderKanban size={11} className="text-violet-500" />
                                  <span>{t('projects.col.project') || 'Dự án'}</span>
                                </span>
                              )}

                              {/* Label phân biệt rõ DRAFT / TO-DO vs ON HOLD trên Card */}
                              {col.key === 'draft_on_hold' && (
                                ['on_hold', 'paused', 'holding'].includes((status || '').toLowerCase().trim()) ? (
                                  <span className="inline-grid grid-flow-col auto-cols-max items-center text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shrink-0">
                                    ON HOLD
                                  </span>
                                ) : (
                                  <span className="inline-grid grid-flow-col auto-cols-max items-center text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                                    DRAFT / TO-DO
                                  </span>
                                )
                              )}

                              {/* Label Chờ duyệt (nổi bật màu amber đồng bộ) */}
                              {['pending_approval', 'pending-approval', 'in_qa', 'review'].includes((status || '').toLowerCase().trim()) && (
                                <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70 shrink-0">
                                  <span>{lang === 'en' ? 'Pending Approval' : 'Chờ duyệt'}</span>
                                </span>
                              )}

                              {/* 2. Label Task */}
                              {unassignedCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-[5px] font-bold shrink-0 ${
                                  isAllUnassignedDone
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                    : isCampaign
                                    ? 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60'
                                    : 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800/60'
                                }`}>
                                  ({unassignedCount} Tasks)
                                </span>
                              )}

                              {/* 3. Icon Comments */}
                              {itemHasComments && (
                                <CommentPreviewPopover
                                  entityType={isCampaign ? 'campaign' : 'project'}
                                  entityId={id}
                                  entityTitle={title}
                                  hasUnreadDot={itemHasUnread}
                                />
                              )}

                              {/* 4. Icon (i) */}
                              {hasPhases && (
                                <EntityInfoPopover
                                  entityType={isCampaign ? 'campaign' : 'project'}
                                  entity={raw}
                                  track={track}
                                  leadPerson={leadPerson ? { name: leadPerson.name, avatar_url: (leadPerson as any).avatar_url } : null}
                                  subPersons={filteredSubPersons}
                                />
                              )}
                            </div>

                            {/* Right Actions: Tick V tròn duyệt nhanh cho Leader/Manager và Quick Actions */}
                            <div className="grid grid-flow-col auto-cols-max items-center gap-1 shrink-0">
                              {/* Nút Tick V tròn màu xanh lá emerald cho Leader / Manager duyệt nhanh */}
                              {canApprove && ((status || '').toLowerCase() === 'pending_approval') && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (isCampaign) {
                                      await onUpdateCampaignStatus(id, 'completed');
                                    } else {
                                      await onUpdateProjectStatus(id, 'completed');
                                    }
                                  }}
                                  title={lang === 'en' ? 'Approve & Complete' : 'Duyệt hoàn thành'}
                                  aria-label={lang === 'en' ? 'Approve & Complete' : 'Duyệt hoàn thành'}
                                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-all w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md grid place-items-center cursor-pointer hover:scale-110 active:scale-95 ring-2 ring-white dark:ring-slate-900 shrink-0"
                                >
                                  <Check size={13} strokeWidth={2.5} />
                                </button>
                              )}

                              {/* Hover Quick Actions */}
                              {(canManage || canApprove) && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/95 dark:bg-[#111e30]/95 shadow-2xs rounded-[6px] px-1 py-0.5 border border-gray-200/80 dark:border-[#2c3e55] grid grid-flow-col auto-cols-max items-center gap-0.5"
                                >
                                {canManage && (
                                  <ActionButton
                                    icon={<FileText size={12} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerNote(`${kind}-${id}`);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-[4px] transition-colors"
                                    title={lang === 'en' ? 'Add note' : 'Thêm ghi chú'}
                                  />
                                )}
                                {canApprove && (
                                  <>
                                    <ActionButton
                                      icon={<EyeOff size={12} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const el = e.currentTarget as HTMLElement;
                                        if (isCampaign) onHideCampaign?.(raw, el);
                                        else onHideProject?.(raw, el);
                                      }}
                                      className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-[4px] transition-colors cursor-pointer"
                                      title={t('common.hide') || 'Ẩn'}
                                    />
                                    <ActionButton
                                      icon={<Trash2 size={12} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const el = e.currentTarget as HTMLElement;
                                        if (isCampaign) onDeleteCampaign?.(raw, el);
                                        else onDeleteProject?.(raw, el);
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[4px] transition-colors"
                                      title={t('common.delete') || 'Xóa'}
                                    />
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                          {/* Card Title & Description */}
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white leading-snug line-clamp-2 hover:text-primary dark:hover:text-blue-400 transition-colors">
                              {title}
                            </h4>
                            {desc?.trim() ? (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                {desc}
                              </p>
                            ) : null}
                          </div>

                          {/* Card Note Cell (if present) */}
                          <EntityNoteCell
                            entityId={id}
                            entityType={isCampaign ? 'campaign' : 'project'}
                            workspaceId={raw.workspace_id}
                            canEdit={canManage}
                            alignCenter={false}
                            compactBoardMode={true}
                            externalOpenRequestId={noteOpenRequests[`${kind}-${id}`] || 0}
                            className="min-w-0"
                          />

                          {/* Card Bottom Row: PIC & SUB stack (Matching List view) + Due Date & Priority */}
                          <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800/80">
                            {/* Left: PIC & SUB matching List view exactly */}
                            <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0 overflow-hidden">
                              {/* PIC chính avatars */}
                              <div className="grid grid-flow-col auto-cols-max -space-x-2 shrink-0">
                                {isCampaign ? (
                                  <Avatar
                                    name={raw.lead?.name || t('common.unassigned') || '?'}
                                    src={raw.lead?.avatar_url || undefined}
                                    className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10"
                                  />
                                ) : (
                                  (picMembers[id] || []).length > 0 ? (
                                    (picMembers[id] || []).slice(0, 4).map(memberId => {
                                      const p = people.find(x => String(x.id) === String(memberId));
                                      return (
                                        <Avatar
                                          key={'o' + memberId}
                                          name={p?.name || '?'}
                                          src={(p as any)?.avatar_url || undefined}
                                          className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10"
                                        />
                                      );
                                    })
                                  ) : (
                                    leadPerson ? (
                                      <Avatar
                                        name={leadPerson.name || '?'}
                                        src={(leadPerson as any).avatar_url || undefined}
                                        className="w-6 h-6 text-[9px] border-2 border-white dark:border-slate-900 shadow-sm z-10"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full border border-dashed border-gray-300 dark:border-slate-700 grid place-items-center text-[9px] text-gray-400">
                                        ?
                                      </div>
                                    )
                                  )
                                )}
                              </div>

                              {/* Vạch | và cụm SUB */}
                              {filteredSubPersons.length > 0 && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600 px-0.5 shrink-0">|</span>
                                  <div className={`grid grid-flow-col auto-cols-max items-center gap-1 px-1.5 py-0.5 rounded-full border shrink-0 ${
                                    isCampaign
                                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800'
                                      : 'bg-violet-50 dark:bg-violet-900/30 border-violet-100 dark:border-violet-800'
                                  }`}>
                                    <span className={`text-[9px] font-bold ${
                                      isCampaign ? 'text-amber-700 dark:text-amber-400' : 'text-violet-700 dark:text-violet-400'
                                    }`}>
                                      SUB
                                    </span>
                                    <div className="grid grid-flow-col auto-cols-max -space-x-1.5">
                                      {filteredSubPersons.slice(0, 4).map(sp => (
                                        <Avatar
                                          key={'s' + sp.id}
                                          name={(sp.name || 'Unknown') + ' (Subtask)'}
                                          src={sp.avatar_url || undefined}
                                          className="w-5 h-5 text-[8px] border-2 border-white dark:border-slate-900 shadow-sm z-10 opacity-90"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Right: Due Date & Priority */}
                            <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 text-right shrink-0">
                              {dueDate ? (
                                <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1">
                                  {getDueStatusLabel(dueDate, status, lang === 'en')}
                                </div>
                              ) : null}

                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${priorityClass(priority)}`}>
                                {priority}
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    });
                  })()}
                </div>

                {/* Column Bottom: + New Project / Campaign */}
                {canCreate && (
                  col.key === 'draft_on_hold' ? (
                    colOneSubFilter === 'draft' ? (
                      <button
                        type="button"
                        onClick={() => onCreateItem('draft', entityFilter === 'campaign' ? 'campaign' : 'project')}
                        className="w-full py-2 px-3 rounded-[8px] border border-dashed border-gray-200 dark:border-[#2c3e55] text-xs font-semibold text-gray-500 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>{lang === 'en' ? 'New Draft' : 'Thêm mới Draft'}</span>
                      </button>
                    ) : colOneSubFilter === 'on_hold' ? (
                      <button
                        type="button"
                        onClick={() => onCreateItem('on_hold', entityFilter === 'campaign' ? 'campaign' : 'project')}
                        className="w-full py-2 px-3 rounded-[8px] border border-dashed border-gray-200 dark:border-[#2c3e55] text-xs font-semibold text-gray-500 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>{lang === 'en' ? 'New On Hold' : 'Thêm mới On Hold'}</span>
                      </button>
                    ) : (
                      <div className="relative" ref={draftBottomPlusRef}>
                        <button
                          type="button"
                          onClick={() => setDraftBottomPlusOpen(!draftBottomPlusOpen)}
                          className="w-full py-2 px-3 rounded-[8px] border border-dashed border-gray-200 dark:border-[#2c3e55] text-xs font-semibold text-gray-500 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>{lang === 'en' ? 'New' : 'Thêm mới'}</span>
                        </button>
                        {draftBottomPlusOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 bottom-full mb-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[8px] shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-150 grid grid-cols-1 gap-1"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setDraftBottomPlusOpen(false);
                                onCreateItem('draft', entityFilter === 'campaign' ? 'campaign' : 'project');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300"
                            >
                              <span>+ DRAFT / TO-DO</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDraftBottomPlusOpen(false);
                                onCreateItem('on_hold', entityFilter === 'campaign' ? 'campaign' : 'project');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/40 grid grid-flow-col auto-cols-max items-center gap-1.5 cursor-pointer text-amber-700 dark:text-amber-300"
                            >
                              <span>+ ON HOLD</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCreateItem(col.targetStatus, entityFilter === 'campaign' ? 'campaign' : 'project')}
                      className="w-full py-2 px-3 rounded-[8px] border border-dashed border-gray-200 dark:border-[#2c3e55] text-xs font-semibold text-gray-500 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all grid grid-flow-col auto-cols-max items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>{lang === 'en' ? 'New' : 'Thêm mới'}</span>
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
