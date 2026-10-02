import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, CheckSquare, FolderKanban, 
  Users, BarChart2, History, Box, AlertCircle
} from 'lucide-react';
import { cn } from '../common/KpiCard';
import { useTranslation } from '../../i18n/translations';

const User = ({size}: {size: number}) => <Users size={size} />; 

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();

  const navGroups = [
    {
      title: t('nav.main'),
      items: [
        { name: t('nav.home'), path: '/', icon: <Home size={18} /> },
      ]
    },
    {
      title: t('nav.tasksProj'),
      items: [
        { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
        { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={18} /> },
        { name: t('nav.myTasks'), path: '/my-tasks', icon: <User size={18} /> },
        { name: t('nav.overdue'), path: '/overdue', icon: <AlertCircle size={18} /> },
      ]
    },
    {
      title: t('nav.assets'),
      items: [
        { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
        { name: t('nav.borrow'), path: '/borrow-requests', icon: <History size={18} /> },
      ]
    },
    {
      title: t('nav.teamRep'),
      items: [
        { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
        { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} /> },
      ]
    }
  ];

  return (
    <aside className="w-64 border-r border-white/40 h-screen glass-panel flex flex-col pt-6 pb-4 flex-shrink-0 m-4 rounded-3xl z-10 relative shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]">
      
      <div className="mb-8 flex items-center justify-center bg-white/30 mx-6 p-4 rounded-xl border border-white/50 backdrop-blur-sm shadow-sm transition-transform hover:scale-105">
        <img src="/logo.svg" alt="K COFFEE Logo" className="h-8 w-auto filter drop-shadow-md" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx} className="mb-6">
            <h4 className="px-3 text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">{group.title}</h4>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                      isActive 
                        ? "bg-white/60 text-primary shadow-sm border border-white/80 backdrop-blur-md font-semibold dark:bg-gray-700/60 dark:text-purple-400" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/40 dark:hover:bg-gray-700/40"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 px-6 text-center">
        <p className="text-xs font-semibold text-gray-500 tracking-wider">
          Making by <span className="text-primary">K COFFEE</span>
        </p>
      </div>
    </aside>
  );
};
