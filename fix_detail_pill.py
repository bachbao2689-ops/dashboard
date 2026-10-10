import re
with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'r') as f:
    content = f.read()

# Replace inline-flex + line-clamp-1 with inline-flex + max-w-full + truncate on inner span
old_proj = r'<span className="inline-flex items-center px-2\.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 line-clamp-1">\{task\.project\.name\}</span>'
new_proj = r'<span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"><span className="truncate">{task.project.name}</span></span>'

old_camp = r'<span className="inline-flex items-center px-2\.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 line-clamp-1">\{task\.campaign\.name\}</span>'
new_camp = r'<span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"><span className="truncate">{task.campaign.name}</span></span>'

content = re.sub(old_proj, new_proj, content)
content = re.sub(old_camp, new_camp, content)

with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'w') as f:
    f.write(content)

print("fixed detail pill")
