import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, CheckSquare, 
  Users, BarChart2, History, Box, FolderKanban
} from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';
import { useAuthStore } from '../../store/authStore';

const User = ({size}: {size: number}) => <Users size={size} />; 

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const profile = useAuthStore(s => s.profile);
  const role = profile?.role || 'member';
   
   
   
  
  

  const navGroups = [
    {
      title: t('nav.main'),
      items: [
        { name: t('nav.home'), path: '/', icon: <Home size={18} />, hidden: role !== 'admin' },
        { name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} />, hidden: !['admin', 'leader', 'manager'].includes(role?.toLowerCase()) }
      ]
    },
    {
      title: t('nav.tasksProj'),
      items: [
        { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
        { name: 'Projects/Campaigns', path: '/projects', icon: <FolderKanban size={18} /> },
        { name: 'Profile', path: '/my-tasks', icon: <User size={18} /> },
        { name: 'Departments 2', path: '/departments-2', icon: <Users size={18} />, hidden: role !== 'admin' },
      ]
    },
    {
      title: t('nav.assets'),
      items: [
        { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
        { name: t('nav.borrow'), path: '/borrow-requests', icon: <History size={18} />, hidden: role === 'member' || role === 'staff' },
      ]
    },
    {
      title: t('nav.teamRep'),
      items: [
        { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
        { name: 'Members', path: '/members', icon: <Users size={18} /> },
        { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} />, hidden: role === 'member' || role === 'staff' },
      ]
    }
  ];

  return (
    <aside className="w-full h-full card-hub flex flex-col pt-6 pb-4 flex-shrink-0 rounded-3xl z-10 relative shadow-sm">
      
      <div className="mb-8 flex items-center justify-center bg-white dark:bg-slate-800 mx-6 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-105">
        <img src="/logo-light.svg" alt="K COFFEE Logo" className="h-11 w-auto filter drop-shadow-md block dark:hidden" />
        <img src="/logo-dark.svg" alt="K COFFEE Logo" className="h-11 w-auto filter drop-shadow-md hidden dark:block" />
      </div>

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
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                      isActive 
                        ? "bg-white text-primary shadow-sm border border-gray-200 font-semibold dark:bg-slate-700 dark:border-slate-600 dark:text-purple-400" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )})}
      </div>

      <div className="mt-auto pt-4 px-6 text-center">
        <p className="text-xs font-semibold text-gray-500 tracking-wider">
          Making by <span className="text-primary">K COFFEE</span>
        </p>
      </div>
    </aside>
  );
};
