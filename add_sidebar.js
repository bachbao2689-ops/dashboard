const fs = require('fs');
const path = 'Dev/src/components/layouts/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "{ name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} /> }",
  "{ name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} /> },\n        { name: 'Dashboard 2', path: '/dashboard-2', icon: <BarChart2 size={18} /> }"
);

fs.writeFileSync(path, content);
