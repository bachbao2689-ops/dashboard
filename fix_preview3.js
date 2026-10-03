const fs = require('fs');
const reactPath = 'Dev/src/pages/DashboardPreview.tsx';
let reactContent = fs.readFileSync(reactPath, 'utf8');

reactContent = reactContent.replace(
  '<div className="absolute inset-0 z-10">',
  '<div className="w-full h-[calc(100vh-120px)] overflow-hidden">'
);

fs.writeFileSync(reactPath, reactContent);
console.log("DashboardPreview fixed 3!");
