import re
with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 line-clamp-1">{task.project.name}</span>',
    '<span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"><span className="truncate">{task.project.name}</span></span>'
)

content = content.replace(
    '<span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 line-clamp-1">{task.campaign.name}</span>',
    '<span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"><span className="truncate">{task.campaign.name}</span></span>'
)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

print("fixed tasklist pill truncate")
