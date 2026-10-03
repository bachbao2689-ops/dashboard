const fs = require('fs');
const path = 'Dev/src/pages/DashboardPreview.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<div className="w-full h-[calc(100vh-120px)] -mt-6 -mx-6 w-[calc(100%+48px)] overflow-hidden rounded-3xl">',
  '<div className="w-full h-[calc(100vh-120px)] overflow-hidden rounded-3xl">'
);

fs.writeFileSync(path, content);
console.log("DashboardPreview layout fixed!");
