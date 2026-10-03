const fs = require('fs');
const path = 'Dev/src/components/layouts/DashboardLayout.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  'className="flex-1 overflow-auto px-4 md:px-8 pt-4 md:pt-8 pb-4 scrollbar-hide"',
  'className="flex-1 overflow-auto px-4 md:px-8 pt-4 md:pt-8 pb-4 scrollbar-hide relative"'
);
fs.writeFileSync(path, content);
console.log("Layout fixed!");
