const fs = require('fs');
const path = 'Dev/src/components/layouts/Header.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useLocation to react-router-dom imports
content = content.replace(
  "import { NavLink } from 'react-router-dom';",
  "import { NavLink, useLocation } from 'react-router-dom';"
);

// 2. Add ChevronDown icon
content = content.replace(
  "AlertCircle } from 'lucide-react';",
  "AlertCircle, ChevronRight } from 'lucide-react';"
);

// 3. Update the definition inside Header component
const oldNavItemsRegex = /const navItems = \[[\s\S]*?\];/;
const newNavGroups = `const location = useLocation();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const navGroups = [
    {
      title: t('nav.main'),
      items: [
        { name: t('nav.home'), path: '/', icon: <Home size={18} /> },
        { name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} /> }
      ]
    },
    {
      title: t('nav.tasksProj'),
      items: [
        { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
        { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={18} /> },
        { name: t('nav.myTasks'), path: '/my-tasks', icon: <Users size={18} /> },
        { name: t('nav.designTeam'), path: '/project', icon: <AlertCircle size={18} /> },
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
        { name: 'Members', path: '/members', icon: <Users size={18} /> },
        { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} /> },
      ]
    }
  ];

  // Auto expand the group that contains the current active route on mount or location change
  useEffect(() => {
    if (!isSidebarOpen) {
      const activeGroup = navGroups.find(g => g.items.some(i => i.path === location.pathname));
      if (activeGroup) {
        setExpandedGroup(activeGroup.title);
      }
    }
  }, [location.pathname, isSidebarOpen, t]);
`;

content = content.replace(oldNavItemsRegex, newNavGroups);

// 4. Update the render logic in !isSidebarOpen condition
const oldRenderRegex = /<div className="hidden md:flex items-center justify-between w-full gap-2 overflow-x-auto hide-scrollbar">[\s\S]*?<\/div>/;
const newRender = `<div className="hidden md:flex items-center gap-1 overflow-x-auto hide-scrollbar w-full">
            {navGroups.map(group => (
              <div 
                key={group.title} 
                className={cn(
                  "flex items-center rounded-xl border transition-all duration-300 overflow-hidden flex-shrink-0",
                  expandedGroup === group.title 
                    ? "bg-gray-50/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 shadow-sm" 
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                <button 
                  onClick={() => setExpandedGroup(expandedGroup === group.title ? null : group.title)}
                  className={cn(
                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1",
                    expandedGroup === group.title 
                      ? "text-primary dark:text-white" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {group.title}
                  <ChevronRight size={14} className={cn("transition-transform duration-300", expandedGroup === group.title && "rotate-90")} />
                </button>
                
                <div 
                  className={cn(
                    "flex items-center transition-all duration-500 ease-in-out",
                    expandedGroup === group.title ? "max-w-[800px] opacity-100 pr-1 pl-0" : "max-w-0 opacity-0 px-0"
                  )}
                >
                  {group.items.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => cn(
                        "px-3 py-1.5 mx-0.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        isActive 
                          ? "bg-white dark:bg-slate-700 text-primary dark:text-primary shadow-sm border border-gray-200 dark:border-slate-600 font-semibold" 
                          : "text-gray-500 hover:text-primary hover:bg-white dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
                      )}
                    >
                      {item.icon}
                      <span className="text-xs">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>`;

content = content.replace(oldRenderRegex, newRender);

fs.writeFileSync(path, content);
console.log("Header groups patched!");
