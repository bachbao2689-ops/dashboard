const fs = require('fs');

// 1. Update DashboardPreview.tsx
const reactPath = 'Dev/src/pages/DashboardPreview.tsx';
let reactContent = fs.readFileSync(reactPath, 'utf8');
reactContent = reactContent.replace(
  '<iframe ',
  '<iframe frameBorder="0" style={{ border: "none", outline: "none" }} '
);
fs.writeFileSync(reactPath, reactContent);

// 2. Update ManagerApp.html to hide footer
const htmlPath = 'Dev/public/ui-hub/ManagerApp.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
htmlContent = htmlContent.replace(
  '#kpis {\\n    display: none !important;\\n  }',
  '#kpis,\\n  footer {\\n    display: none !important;\\n  }'
);
fs.writeFileSync(htmlPath, htmlContent);

console.log("Iframe border removed and footer hidden!");
