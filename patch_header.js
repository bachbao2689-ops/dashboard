const fs = require('fs');

const path = 'Dev/src/components/layouts/Header.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  "import { Search, Sun, Moon, History, Bell, Sidebar, Globe, LogOut } from 'lucide-react';",
  "import { Search, Sun, Moon, History, Bell, Sidebar, Globe, LogOut, Home, CheckSquare, FolderKanban, Users, BarChart2, Box, AlertCircle } from 'lucide-react';\nimport { NavLink } from 'react-router-dom';\nimport { cn } from '../common/KpiCard';"
);

// 2. Add isSidebarOpen to useUiStore destructuring
content = content.replace(
  "const { theme, toggleTheme, lang, setLang, toggleSidebar } = useUiStore();",
  "const { theme, toggleTheme, lang, setLang, toggleSidebar, isSidebarOpen } = useUiStore();"
);

// 3. Add navItems array before return
const navItemsDef = `
  const navItems = [
    { name: t('nav.home'), path: '/', icon: <Home size={18} /> },
    { name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} /> },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
    { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={18} /> },
    { name: t('nav.myTasks'), path: '/my-tasks', icon: <Users size={18} /> },
    { name: t('nav.designTeam'), path: '/project', icon: <AlertCircle size={18} /> },
    { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
    { name: t('nav.borrow'), path: '/borrow-requests', icon: <History size={18} /> },
    { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
    { name: 'Members', path: '/members', icon: <Users size={18} /> },
    { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} /> },
  ];
`;

content = content.replace(
  "return (",
  navItemsDef + "\n  return ("
);

// 4. Replace the LEFT AREA with the conditional logic
const leftAreaRegex = /<div className="hidden md:flex items-center gap-2">[\s\S]*?<\/div>/;
const newLeftArea = `{isSidebarOpen ? (
          <div className="hidden md:flex items-center gap-2">
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={toggleSidebar}>{t('header.dashboards')}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold bg-gray-50 dark:bg-slate-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-600">Default</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1 overflow-x-auto hide-scrollbar">
             {navItems.map(item => (
                <NavLink 
                  key={item.path} 
                  to={item.path} 
                  title={item.name}
                  className={({ isActive }) => cn(
                    "p-2 rounded-xl transition-all flex items-center justify-center relative group",
                    isActive 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-gray-500 hover:text-primary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
                  )}
                >
                  {item.icon}
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    {item.name}
                  </span>
                </NavLink>
             ))}
          </div>
        )}`;

content = content.replace(leftAreaRegex, newLeftArea);

fs.writeFileSync(path, content);
console.log("Header patched!");
