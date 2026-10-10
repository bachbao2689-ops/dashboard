import re

with open('src/pages/TaskList.tsx', 'r') as f:
    c = f.read()

# The task row class is currently:
# className={`cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-all duration-300 group ${selectedTasks.includes(task.id) ? 'bg-primary/5 dark:bg-primary/10' : ''} ${deletingIds.includes(task.id) ? 'animate-fade-out' : ''} ${['done', 'complete', 'completed'].includes((task.status || '').toLowerCase()) ? 'bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20' : ''}`}
c = c.replace("className={`cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-all duration-300 group",
              "className={`cursor-pointer hover-row-effect hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-all duration-300 group")

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(c)

print("added hover row effect to tasks")
