import React from 'react';
import { LiquidButton } from './LiquidButton';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface LiquidSidebarProps {
  groups: NavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  brandTitle?: string;
  brandLogo?: React.ReactNode;
  footerText?: string;
  className?: string;
}

/**
 * LiquidSidebar: Modular Left Navigation Sidebar.
 * Uses .card-hub shell with light-mode liquid glass active buttons and neon indicator dots.
 */
export const LiquidSidebar: React.FC<LiquidSidebarProps> = ({
  groups,
  activeId,
  onSelect,
  brandTitle = 'K COFFEE',
  brandLogo,
  footerText = 'Making by BART',
  className = '',
}) => {
  return (
    <aside
      className={`app-sidebar card-hub w-64 h-full flex flex-col p-4 border-r border-[#e0eaff] dark:border-blue-500/15 ${className}`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-3 mb-4 border-b border-gray-100 dark:border-slate-800">
        {brandLogo && <div className="shrink-0">{brandLogo}</div>}
        <span className="font-extrabold text-base tracking-wide text-gray-900 dark:text-white">
          {brandTitle}
        </span>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <h5 className="px-3 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              {group.title}
            </h5>
            <div className="space-y-1">
              {group.items.map((item) => (
                <LiquidButton
                  key={item.id}
                  isActive={item.id === activeId}
                  icon={item.icon}
                  onClick={() => onSelect(item.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-blue-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </LiquidButton>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Branding */}
      {footerText && (
        <div className="mt-auto pt-4 px-3 text-center border-t border-gray-100 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-gray-400">
            {footerText}
          </p>
        </div>
      )}
    </aside>
  );
};
