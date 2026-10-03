const fs = require('fs');
const path = 'Dev/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { Dashboard2 } from './pages/Dashboard2';",
  "import { Dashboard } from './pages/Dashboard';"
);

content = content.replace(
  '<Route path="ui-dashboard" element={<Dashboard2 />} />',
  '<Route path="ui-dashboard" element={<Dashboard />} />'
);

fs.writeFileSync(path, content);
