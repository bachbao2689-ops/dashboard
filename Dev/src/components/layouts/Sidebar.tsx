import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CheckSquare, Layers,
  Users, User, BarChart2, History, Box, FolderKanban, MessageSquare
} from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const profile = useAuthStore(s => s.profile);
  const role = profile?.role || 'member';
  const isLeader = (profile?.employment_level || '').toLowerCase() === 'leader' || ['leader', 'manager', 'admin'].includes(role.toLowerCase());
  const badges = useSidebarBadges();

  const navGroups = [
    {
      title: t('nav.main'),
      items: [
        { name: t('nav.dashboard'), path: '/ui-dashboard', icon: <BarChart2 size={18} />, hidden: !['admin', 'leader', 'manager'].includes(role?.toLowerCase()) },
        {
          name: t('nav.home'),
          path: '/workflow',
          icon: <Layers size={18} />,
          inlineBadge: badges.workflowCount > 0 ? (
            <span title="Có bình luận / nhắc đến" className="relative inline-flex items-center ml-1 shrink-0">
              <MessageSquare size={13} className="text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-xs" />
            </span>
          ) : null
        }
      ]
    },
    {
      title: t('nav.tasksProj'),
      items: [
        { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
        {
          name: t('nav.projects'),
          path: '/projects',
          icon: <FolderKanban size={18} />,
          inlineBadge: badges.projectCount > 0 ? (
            <span title="Có bình luận / nhắc đến" className="relative inline-flex items-center ml-1 shrink-0">
              <MessageSquare size={13} className="text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-xs" />
            </span>
          ) : null
        },
        { name: t('nav.profile'), path: '/my-tasks', icon: <User size={18} /> },
        { name: t('nav.departments'), path: '/departments-2', icon: <Users size={18} />, hidden: role !== 'admin' },
      ]
    },
    {
      title: t('nav.assets'),
      items: [
        { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
        {
          name: ['admin', 'manager'].includes(role) ? t('nav.borrow') : t('nav.myBorrow'),
          path: ['admin', 'manager'].includes(role) ? '/borrow-requests' : '/borrow-requests?scope=mine',
          icon: <History size={18} />,
          rightBadge: badges.borrowCount > 0 ? (
            <span className="shrink-0 ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white font-bold text-[11px] shadow-xs" title="Đơn cần duyệt / mượn">
              {badges.borrowCount > 99 ? '99+' : badges.borrowCount}
            </span>
          ) : null
        },
      ]
    },
    {
      title: t('nav.teamRep'),
      items: [
        { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
        { name: t('nav.members'), path: '/members', icon: <Users size={18} /> },
        { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} />, hidden: role !== 'admin' && (role === 'member' || role === 'staff') && !isLeader },
      ]
    }
  ];

  return (
    <aside className="app-sidebar w-full h-full card-hub flex flex-col pt-6 pb-4 flex-shrink-0 rounded-3xl z-10 relative shadow-sm">

      <NavLink to="/" className="mb-8 flex items-center justify-center bg-white dark:bg-slate-800 mx-6 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-105">
        <img src="/logo-light.svg" alt="K COFFEE Logo" className="h-11 w-auto filter drop-shadow-md block dark:hidden" />
        <img src="/logo-dark.svg" alt="K COFFEE Logo" className="h-11 w-auto filter drop-shadow-md hidden dark:block" />
      </NavLink>

      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        {navGroups.map((group, idx) => {
          const visibleItems = group.items.filter(item => !(item as any).hidden);
          if (visibleItems.length === 0) return null;
          return (
          <div key={idx} className="mb-6">
            <h4 className="px-3 text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">{group.title}</h4>
            <ul className="space-y-1">
              {visibleItems.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => cn(
                      "sidebar-link flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                      isActive
                        ? "sidebar-link-active font-semibold"
                        : "sidebar-link-idle"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.icon}
                      <span className="truncate">{item.name}</span>
                      {(item as any).inlineBadge}
                    </div>
                    {(item as any).rightBadge}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )})}
      </div>

      <div className="mt-auto pt-4 px-6 text-center">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
          Making by <span className="text-primary dark:text-blue-400 font-bold">BART</span>
        </p>
      </div>
    </aside>
  );
};
