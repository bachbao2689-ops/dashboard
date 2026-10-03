const fs = require('fs');
const path = 'Dev/src/pages/TaskList.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "export const TaskList: React.FC = () => {",
  "export const TaskList: React.FC = () => {\n  const [viewMode, setViewMode] = useState<'list'|'kanban'>('list');"
);

fs.writeFileSync(path, content);
console.log("State fixed!");
