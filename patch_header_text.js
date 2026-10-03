const fs = require('fs');
const path = 'Dev/src/components/layouts/Header.tsx';
let content = fs.readFileSync(path, 'utf8');

const leftAreaStartRegex = /<div className="flex items-center gap-4 text-sm font-medium text-gray-600">/;
content = content.replace(leftAreaStartRegex, '<div className="flex items-center gap-4 text-sm font-medium text-gray-600 flex-1 min-w-0 pr-4">');

const navBarRegex = /<div className="hidden md:flex items-center gap-1 overflow-x-auto hide-scrollbar">[\s\S]*?<\/div>/;

const newNavBar = `<div className="hidden md:flex items-center justify-between w-full gap-2 overflow-x-auto hide-scrollbar">
             {navItems.map(item => (
                <NavLink 
                  key={item.path} 
                  to={item.path} 
                  className={({ isActive }) => cn(
                    "px-3 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap",
                    isActive 
                      ? "bg-primary text-white shadow-sm font-semibold" 
                      : "text-gray-500 hover:text-primary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
                  )}
                >
                  {item.icon}
                  <span className="text-xs">{item.name}</span>
                </NavLink>
             ))}
          </div>`;

content = content.replace(navBarRegex, newNavBar);

fs.writeFileSync(path, content);
console.log("Header text patched!");
