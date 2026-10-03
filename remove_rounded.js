const fs = require('fs');
const path = 'Dev/src/pages/DashboardPreview.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('overflow-hidden rounded-3xl', 'overflow-hidden');
fs.writeFileSync(path, content);
console.log("Removed rounded-3xl");
