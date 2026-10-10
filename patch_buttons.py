import re

# Update TaskDetailPanel.tsx
with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'r') as f:
    task_content = f.read()

task_content = re.sub(
    r'className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"',
    r'className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary hover:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:hover:bg-primary"',
    task_content
)

with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'w') as f:
    f.write(task_content)


# Update Projects.tsx
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    proj_content = f.read()

proj_content = re.sub(
    r'className="flex-1 px-4 py-2.5 bg-\[#002e6d\] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-\[#001f4d\] transition-colors"',
    r'className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"',
    proj_content
)

proj_content = re.sub(
    r'className="flex-1 px-4 py-2.5 bg-\[#002e6d\] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-\[#001f4d\]"',
    r'className="flex-1 px-4 py-2.5 bg-[#002e6d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"',
    proj_content
)

# Also update subtasks in Projects.tsx
proj_content = re.sub(
    r'className="group flex flex-col gap-2 p-2.5 rounded-xl hover:bg-blue-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors relative"',
    r'className="group flex flex-col gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-700/60 bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-600 shadow-sm cursor-pointer transition-all relative"',
    proj_content
)
proj_content = re.sub(r'className="space-y-1">\{projectSubtasks', r'className="space-y-2">{projectSubtasks', proj_content)
proj_content = re.sub(r'className="space-y-1">\{campaignSubtasks', r'className="space-y-2">{campaignSubtasks', proj_content)


with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(proj_content)

print("Buttons and Subtasks updated.")
