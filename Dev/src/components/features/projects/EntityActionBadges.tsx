import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Edit3, Settings, History } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';
import { getStatusLabel, getStatusBadgeVisual } from '../../../utils/statusTheme';
import { priorityClass } from './projectPresentation';
import { TaskActivityLogPopover } from '../tasks/TaskActivityLogPopover';
import { StylizedPinIcon } from '../../common/StylizedPinIcon';
import { useSidebarPinStore } from '../../../store/sidebarPinStore';
import { useAuthStore } from '../../../store/authStore';
import { taskKey } from '../../../lib/taskTracking';

export interface StatusOption {
  value: string;
  label: string;
  dotClass: string;
}

interface EntityActionBadgesProps {
  priority: string;
  status: string;
  onPriorityChange?: (newPriority: string) => unknown;
  onStatusChange?: (newStatus: string) => unknown;
  onEdit?: () => void;
  canManage?: boolean;
  statusOptions?: StatusOption[];
  children?: React.ReactNode;
  entityType?: 'project' | 'campaign' | 'task' | 'project_subtask' | 'campaign_subtask' | string;
  entityId?: string | number | null;
  entityName?: string | null;
  workspaceId?: string;
  hideStatus?: boolean;
}

export const EntityActionBadges: React.FC<EntityActionBadgesProps> = ({
  priority,
  status,
  onPriorityChange,
  onStatusChange,
  onEdit,
  canManage = true,
  statusOptions: statusOptionsProp,
  children,
  entityType,
  entityId,
  entityName,
  workspaceId,
  hideStatus = false,
}) => {
  const { lang, t } = useTranslation();
  const isEn = lang === 'en';

  const [priorityOpen, setPriorityOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const profileId = useAuthStore(s => s.profile?.id);
  const syncOwner = useSidebarPinStore(s => s.syncOwner);
  const pinnedIds = useSidebarPinStore(s => s.pinnedIds);
  const pinnedEntities = useSidebarPinStore(s => s.pinnedEntities);
  const togglePin = useSidebarPinStore(s => s.togglePin);
  const toggleEntityPin = useSidebarPinStore(s => s.toggleEntityPin);

  useEffect(() => {
    syncOwner(profileId);
  }, [profileId, syncOwner]);

  const isPinned = React.useMemo(() => {
    if (!entityId || !entityType) return false;
    if (entityType === 'project' || entityType === 'campaign') {
      return pinnedEntities.some(e => e.kind === entityType && String(e.id) === String(entityId));
    }
    const pk = taskKey(entityType, String(entityId));
    return Boolean(pk && pinnedIds.includes(String(pk)));
  }, [entityId, entityType, pinnedEntities, pinnedIds]);

  const handleTogglePin = () => {
    if (!entityId || !entityType) return;
    if (entityType === 'project' || entityType === 'campaign') {
      toggleEntityPin({ kind: entityType as any, id: String(entityId), name: entityName || String(entityId) }, profileId);
    } else {
      togglePin(taskKey(entityType, String(entityId)), profileId);
    }
  };

  // Close dropdowns on click outside or Escape
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPriorityOpen(false);
        setStatusOpen(false);
        setSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPriorityOpen(false);
        setStatusOpen(false);
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentPriority = (priority || 'medium').toLowerCase();
  const currentStatus = (status || 'planning').toLowerCase();

  const priorityOptions = [
    { value: 'urgent', label: isEn ? 'Urgent' : 'Khẩn cấp', dotClass: 'bg-rose-500' },
    { value: 'high', label: isEn ? 'High' : 'Cao', dotClass: 'bg-red-500' },
    { value: 'medium', label: isEn ? 'Medium' : 'Trung bình', dotClass: 'bg-amber-500' },
    { value: 'low', label: isEn ? 'Low' : 'Thấp', dotClass: 'bg-slate-500' },
  ];

  const defaultStatusOptions: StatusOption[] = [
    { value: 'draft', label: isEn ? 'Draft / To-do' : 'Bản nháp', dotClass: 'bg-slate-400' },
    { value: 'planning', label: isEn ? 'Planning' : 'Lên kế hoạch', dotClass: 'bg-purple-500' },
    { value: 'active', label: isEn ? 'In Progress' : 'Đang thực hiện', dotClass: 'bg-sky-500' },
    { value: 'pending_approval', label: isEn ? 'Pending Approval' : 'Chờ duyệt', dotClass: 'bg-amber-500' },
    { value: 'on_hold', label: isEn ? 'On Hold' : 'Tạm dừng', dotClass: 'bg-amber-500' },
    { value: 'completed', label: isEn ? 'Completed' : 'Hoàn thành', dotClass: 'bg-emerald-500' },
  ];
  const statusOptions = statusOptionsProp || defaultStatusOptions;

  const currentPriorityOpt = priorityOptions.find((p) => p.value === currentPriority) || {
    value: currentPriority,
    label: t(`common.${currentPriority}` as any) || currentPriority,
    dotClass: 'bg-amber-500',
  };

  const currentStatusLabel = getStatusLabel(currentStatus, lang);
  const statusVisual = getStatusBadgeVisual(currentStatus);

  return (
    <div
      ref={containerRef}
      className="relative grid grid-cols-[1fr_auto] items-start sm:items-center gap-2 w-full"
    >
      <div className="grid grid-flow-row sm:grid-flow-col auto-cols-max items-start sm:items-center gap-1.5 sm:gap-2 min-w-0">
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 sm:gap-2">
      {/* 1. Priority Dropdown Button */}
      <div className="relative inline-block">
        <button
          type="button"
          disabled={!canManage || !onPriorityChange}
          onClick={() => {
            setStatusOpen(false);
            setPriorityOpen((v) => !v);
          }}
          className={`inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold capitalize transition-all ${priorityClass(
            currentPriority,
          )} ${
            canManage && onPriorityChange
              ? 'cursor-pointer hover:shadow-xs hover:border-black/10 dark:hover:border-white/10'
              : 'cursor-default'
          }`}
          aria-expanded={priorityOpen}
          aria-haspopup="listbox"
          title={isEn ? 'Change priority' : 'Đổi mức ưu tiên'}
        >
          <span>{currentPriorityOpt.label}</span>
          {canManage && onPriorityChange && (
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${priorityOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {priorityOpen && (
          <div
            className="absolute top-full left-0 mt-1.5 z-[100] w-36 rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] shadow-xl py-1 backdrop-blur-md"
            role="listbox"
          >
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setPriorityOpen(false);
                  if (opt.value !== currentPriority) {
                    onPriorityChange?.(opt.value);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium grid grid-flow-col auto-cols-max items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#0f1e36] transition-colors ${
                  currentPriority === opt.value
                    ? 'bg-primary/10 text-primary dark:text-blue-300 dark:bg-blue-950/40 font-bold'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Status Dropdown Button */}
      {!hideStatus && (
        <div className="relative inline-block">
          <button
            type="button"
            disabled={!canManage || !onStatusChange}
            onClick={() => {
              setPriorityOpen(false);
              setStatusOpen((v) => !v);
            }}
            className={`inline-grid grid-flow-col auto-cols-max items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold border transition-all ${statusVisual.badgeClass} ${
              canManage && onStatusChange
                ? 'cursor-pointer hover:shadow-xs hover:border-black/10 dark:hover:border-white/10'
                : 'cursor-default'
            }`}
            aria-expanded={statusOpen}
            aria-haspopup="listbox"
            title={isEn ? 'Change status' : 'Đổi trạng thái'}
          >
            <span>{currentStatusLabel}</span>
            {canManage && onStatusChange && (
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${statusOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>

          {statusOpen && (
            <div
              className="absolute top-full left-0 mt-1.5 z-[100] w-44 rounded-[8px] border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#0a192f] shadow-xl py-1 backdrop-blur-md"
              role="listbox"
            >
              {statusOptions.map((opt) => {
                const isSelected =
                  currentStatus === opt.value ||
                  (opt.value === 'draft' && (currentStatus === 'todo' || currentStatus === 'not_started' || currentStatus === 'chưa bắt đầu')) ||
                  (opt.value === 'active' && (currentStatus === 'in_progress' || currentStatus === 'doing')) ||
                  (opt.value === 'planning' && (currentStatus === 'planned' || currentStatus === 'backlog')) ||
                  (opt.value === 'pending_approval' && (currentStatus === 'in_qa' || currentStatus === 'in_review' || currentStatus === 'review' || currentStatus === 'pending-approval' || currentStatus === 'chờ duyệt')) ||
                  (opt.value === 'on_hold' && (currentStatus === 'paused' || currentStatus === 'on-hold')) ||
                  (opt.value === 'completed' && (currentStatus === 'done' || currentStatus === 'complete'));
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStatusOpen(false);
                      if (!isSelected) {
                        onStatusChange?.(opt.value);
                      }
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium grid grid-flow-col auto-cols-max items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#0f1e36] transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary dark:text-blue-300 dark:bg-blue-950/40 font-bold'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Children (e.g. Department badge or SL badge) */}
      {children && (
        <div className="grid grid-flow-col auto-cols-max items-center gap-1.5 min-w-0 max-w-full">
          {children}
        </div>
      )}
    </div>

      {/* 2. Action Setting Button on the far right */}
      {((canManage && onEdit) || (entityType && entityId)) && (
        <div className="justify-self-end grid grid-flow-col auto-cols-max items-center gap-1.5">
          {/* Setting Button (Gear) - Borderless */}
          <div className="relative inline-block" ref={settingsRef}>
            <button
              type="button"
              onClick={() => {
                setPriorityOpen(false);
                setStatusOpen(false);
                setSettingsOpen(v => !v);
              }}
              className={`w-7 h-7 rounded-[6px] border border-transparent transition-colors grid place-items-center cursor-pointer ${
                settingsOpen
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
              title={isEn ? 'Settings & options' : 'Cài đặt & Tùy chọn'}
              aria-label={isEn ? 'Settings & options' : 'Cài đặt & Tùy chọn'}
              aria-expanded={settingsOpen}
            >
              <Settings size={14} />
            </button>

            {settingsOpen && (
              <div
                className="absolute top-full right-0 mt-1.5 z-[100] w-48 rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0a192f] shadow-xl py-1 backdrop-blur-md"
                role="menu"
              >
                {canManage && onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      onEdit();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium grid grid-flow-col auto-cols-max items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <Edit3 size={14} className="text-gray-500 dark:text-gray-400" />
                    <span>{isEn ? 'Edit details' : 'Chỉnh sửa'}</span>
                  </button>
                )}

                {entityType && entityId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setIsLogOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium grid grid-flow-col auto-cols-max items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <History size={14} className="text-gray-500 dark:text-gray-400" />
                    <span>{isEn ? 'Activity log' : 'Nhật ký hoạt động'}</span>
                  </button>
                )}

                {entityType && entityId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      handleTogglePin();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium grid grid-flow-col auto-cols-max items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <StylizedPinIcon size={14} pinned={isPinned} />
                    <span>
                      {isPinned
                        ? (isEn ? 'Unpin from Sidebar' : 'Bỏ ghim khỏi Sidebar')
                        : (isEn ? 'Pin to Sidebar' : 'Ghim lên Sidebar')}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Standalone Activity Log Popover (detached from settingsOpen dropdown) */}
            {entityType && entityId && isLogOpen && (
              <TaskActivityLogPopover
                entityType={entityType}
                entityId={String(entityId)}
                workspaceId={workspaceId}
                isOpen={isLogOpen}
                onOpenChange={setIsLogOpen}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
