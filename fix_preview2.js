const fs = require('fs');
const reactPath = 'Dev/src/pages/DashboardPreview.tsx';
let reactContent = fs.readFileSync(reactPath, 'utf8');

reactContent = reactContent.replace(
  '<div className="absolute inset-0 top-[88px] left-0 md:left-72">',
  '<div className="absolute inset-0 z-10">'
);

fs.writeFileSync(reactPath, reactContent);
console.log("DashboardPreview fixed 2!");
