const fs = require('fs');
const path = 'Dev/src/pages/Dashboard2.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace lucide imports to include BarChart2 to avoid collision
content = content.replace(
  'ChevronRight as ChevronRightIcon',
  'ChevronRight as ChevronRightIcon, BarChart2'
);

// Replace the icon usage
content = content.replace(
  '<BarChart size={12} />',
  '<BarChart2 size={12} />'
);

fs.writeFileSync(path, content);
