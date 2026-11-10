import React from 'react';
import { List, LayoutGrid } from 'lucide-react';
import { useTranslation } from '../../../i18n/translations';

export interface ProjectViewModeDropdownProps {
  viewMode: 'list' | 'board';
  onChange: (mode: 'list' | 'board') => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  compact?: boolean;
  align?: 'left' | 'right';
}

export const ProjectViewModeDropdown: React.FC<ProjectViewModeDropdownProps> = ({
  viewMode,
  onChange,
}) => {
  const { lang } = useTranslation();

  const isBoard = viewMode === 'board';
  const nextMode = isBoard ? 'list' : 'board';
  // Đang ở List: icon LayoutGrid (chuyển sang dạng Bảng); Đang ở Board: icon List (chuyển sang dạng Danh sách)
  const ToggleIcon = isBoard ? List : LayoutGrid;
  const tooltip = isBoard
    ? (lang === 'en' ? 'Switch to List view' : 'Chuyển sang dạng Danh sách')
    : (lang === 'en' ? 'Switch to Board view' : 'Chuyển sang dạng Bảng');

  return (
    <div className="mobile-filter-control relative inline-grid text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(nextMode);
        }}
        title={tooltip}
        aria-label={tooltip}
        className="w-[34px] h-[34px] rounded-[8px] p-0 grid place-items-center text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        <ToggleIcon size={14} />
      </button>
    </div>
  );
};

