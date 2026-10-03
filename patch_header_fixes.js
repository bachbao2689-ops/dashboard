const fs = require('fs');
const path = 'Dev/src/components/layouts/Header.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the useEffect dependency array loop issue
content = content.replace(
  "}, [location.pathname, isSidebarOpen, t]);",
  "}, [location.pathname, isSidebarOpen]); // eslint-disable-line react-hooks/exhaustive-deps"
);

// 2. Fix the active tab button style
const activeRegex = /\? "bg-white dark:bg-slate-700 text-primary dark:text-primary shadow-sm border border-gray-200 dark:border-slate-600 font-semibold"/;
const newActiveStyle = `? "bg-primary text-white shadow-md font-semibold"`;
content = content.replace(activeRegex, newActiveStyle);

// 3. Make sure the NavLink has duration-300 for smooth color transition
content = content.replace(
  '"px-3 py-1.5 mx-0.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",',
  '"px-3 py-1.5 mx-0.5 rounded-lg transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap",'
);

fs.writeFileSync(path, content);
console.log("Header fixes applied!");
