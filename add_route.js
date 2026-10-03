const fs = require('fs');
const path = 'Dev/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { DashboardPreview } from './pages/DashboardPreview';",
  "import { DashboardPreview } from './pages/DashboardPreview';\nimport { Dashboard2 } from './pages/Dashboard2';"
);

content = content.replace(
  '<Route path="ui-dashboard" element={<DashboardPreview />} />',
  '<Route path="ui-dashboard" element={<DashboardPreview />} />\n            <Route path="dashboard-2" element={<Dashboard2 />} />'
);

fs.writeFileSync(path, content);
