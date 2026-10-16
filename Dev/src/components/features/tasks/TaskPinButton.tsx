import React, { useEffect } from 'react';
import { useSidebarPinStore } from '../../../store/sidebarPinStore';
import { useAuthStore } from '../../../store/authStore';
import { StylizedPinIcon } from '../../common/StylizedPinIcon';

interface TaskPinButtonProps {
  taskId?: string | number | null;
  size?: number | 'sm' | 'md';
  className?: string;
}

export const TaskPinButton: React.FC<TaskPinButtonProps> = ({
  taskId,
  size = 16,
  className = '',
}) => {
  const profileId = useAuthStore(s => s.profile?.id);
  const syncOwner = useSidebarPinStore(s => s.syncOwner);
  const pinnedIds = useSidebarPinStore(s => s.pinnedIds);
  const togglePin = useSidebarPinStore(s => s.togglePin);

  useEffect(() => {
    syncOwner(profileId);
  }, [profileId, syncOwner]);

  if (!taskId) return null;
  const idStr = String(taskId);
  const isPinned = pinnedIds.includes(idStr);
  const resolvedSize = typeof size === 'number' ? size : size === 'sm' ? 14 : 16;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        togglePin(idStr, profileId);
      }}
      title={isPinned ? 'Bỏ ghim khỏi Sidebar' : 'Ghim công việc lên Sidebar'}
      aria-label={isPinned ? 'Bỏ ghim khỏi Sidebar' : 'Ghim công việc lên Sidebar'}
      className={`p-2 rounded-xl transition-colors shrink-0 ${
        isPinned
          ? 'text-slate-900 bg-gray-100 hover:bg-gray-200/80 dark:text-slate-100 dark:bg-slate-700/80 dark:hover:bg-slate-700'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'
      } ${className}`}
    >
      <StylizedPinIcon size={resolvedSize} pinned={isPinned} />
    </button>
  );
};
