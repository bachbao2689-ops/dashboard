import re

# TaskList
with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'const pillColors = \[.*?\];\nconst getPillColor = \(name: string\) => \{.*?\};\n', '', content, flags=re.DOTALL)
content = content.replace("className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getPillColor(task.project.name)} max-w-full`}",
                          "className=\"inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full\"")
content = content.replace("className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getPillColor(task.campaign.name)} max-w-full`}",
                          "className=\"inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full\"")

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

# TaskDetailPanel
with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'const pillColors = \[.*?\];\nconst getPillColor = \(name: string\) => \{.*?\};\n', '', content, flags=re.DOTALL)
content = content.replace("className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getPillColor(task.project?.name || '')} max-w-full`}",
                          "className=\"inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full\"")
content = content.replace("className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getPillColor(task.campaign?.name || '')} max-w-full`}",
                          "className=\"inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full\"")

with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'w') as f:
    f.write(content)

print("reverted colors")
