import re

with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "className={`cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-colors group ${selectedTasks.includes(task.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}",
    "className={`cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-all duration-300 group ${selectedTasks.includes(task.id) ? 'bg-primary/5 dark:bg-primary/10' : ''} ${deletingIds.includes(task.id) ? 'animate-fade-out' : ''}`}"
)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
