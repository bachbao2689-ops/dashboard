const fs = require('fs');
const path = 'Dev/src/pages/TaskList.tsx';
let content = fs.readFileSync(path, 'utf8');

// Header imports and state
content = content.replace(
  "import toast from 'react-hot-toast';",
  "import toast from 'react-hot-toast';\nimport { ProjectsKanban } from './ProjectsKanban';\nimport { cn } from '../components/common/KpiCard';"
);

const stateRegex = /export const TaskList: React.FC = \(\) => \{\n  const \{ tasks, loading, refetch, updateTaskStatus, updateTaskPriority \} = useTasks\(\);/;
content = content.replace(stateRegex, `export const TaskList: React.FC = () => {\n  const { tasks, loading, refetch, updateTaskStatus, updateTaskPriority } = useTasks();\n  const [viewMode, setViewMode] = useState<'list'|'kanban'>('list');`);

const headerRegex = /<div className="flex justify-between items-center">\n\s*<h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks<\/h1>/;
const newHeader = `<div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
          
          <div className="flex bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
             <button 
               onClick={() => setViewMode('list')} 
               className={cn("px-4 py-1 rounded-lg text-sm font-semibold transition-all duration-300", viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300')}
             >
               List
             </button>
             <button 
               onClick={() => setViewMode('kanban')} 
               className={cn("px-4 py-1 rounded-lg text-sm font-semibold transition-all duration-300", viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300')}
             >
               Kanban
             </button>
          </div>
        </div>`;

content = content.replace(headerRegex, newHeader);

// Body wrap
const filterBarRegex = /<div className="card-hub rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 relative z-20">/;
const newFilterBar = `{viewMode === 'kanban' ? (
        <div className="-mx-4 md:-mx-8 flex-1 flex flex-col"><ProjectsKanban hideHeader={true} /></div>
      ) : (
      <>
      <div className="card-hub rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 relative z-20">`;
content = content.replace(filterBarRegex, newFilterBar);

// Ending wrap: Before <TaskDetailPanel />
const endRegex = /<\/div>\n\s*<TaskDetailPanel task=\{selectedTask\} isOpen=\{!!selectedTask\} onClose=\{\(\) => setSelectedTask\(null\)\} \/>/;
const newEnd = `</>\n      )}\n      </div>\n      <TaskDetailPanel task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} />`;
content = content.replace(endRegex, newEnd);

fs.writeFileSync(path, content);
console.log("TaskList view mode patched safely!");
