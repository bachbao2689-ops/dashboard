import React from 'react';
import { isAdmin, isGlobalManager, isDepartmentLeader } from '../../../lib/roleScope';

interface PhasePermissionToggleProps {
  profile: any;
  checked: boolean;
  onChange: (checked: boolean) => void;
  visible?: boolean;
  lang?: string;
}

export const PhasePermissionToggle: React.FC<PhasePermissionToggleProps> = ({
  profile,
  checked,
  onChange,
  visible = true,
  lang = 'vi',
}) => {
  const canManage = Boolean(
    isAdmin(profile) || isGlobalManager(profile) || isDepartmentLeader(profile)
  );

  if (!canManage) return null;

  const isEn = lang === 'en';
  const tooltipText = checked
    ? isEn
      ? 'Phase creation enabled for Staff (PIC) — Click to lock'
      : 'Đang mở quyền tạo Phase cho Nhân viên (PIC) — Bấm để khóa'
    : isEn
    ? 'Phase creation locked for Staff — Click to unlock'
    : 'Đang khóa quyền tạo Phase của Nhân viên — Bấm để mở';

  return (
    <div
      className={`absolute right-2.5 top-1/2 -translate-y-1/2 z-10 transition-all duration-500 ease-out ${
        visible
          ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
          : 'opacity-0 scale-90 translate-x-2 pointer-events-none'
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        title={tooltipText}
        aria-label={tooltipText}
        className={`w-11 h-6 rounded-full p-0.5 inline-grid grid-cols-[1fr] items-center cursor-pointer transition-colors duration-500 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-inner ${
          checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
        }`}
      >
        <span
          style={{ backgroundColor: '#ffffff' }}
          className={`w-5 h-5 rounded-full !bg-white dark:!bg-white shadow-md transform transition-transform duration-500 ease-in-out pointer-events-none ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
