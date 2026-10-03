const fs = require('fs');
const reactPath = 'Dev/src/pages/DashboardPreview.tsx';
let reactContent = fs.readFileSync(reactPath, 'utf8');

reactContent = reactContent.replace(
  'src="/ui-hub/ManagerApp.html"',
  'src={`/ui-hub/ManagerApp.html?v=${Date.now()}`}'
);

fs.writeFileSync(reactPath, reactContent);
console.log("Iframe cache buster added!");
