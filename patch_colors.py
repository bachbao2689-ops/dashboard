import re

color_func = """
const pillColors = [
  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800',
  'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
];
const getPillColor = (name: string) => {
  if (!name) return pillColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return pillColors[Math.abs(hash) % pillColors.length];
};
"""

# Patch TaskList
with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

if 'getPillColor' not in content:
    content = content.replace('export const TaskList: React.FC = () => {', color_func + '\nexport const TaskList: React.FC = () => {')

content = re.sub(
    r'className="inline-flex items-center px-2\.5 py-1 rounded-md text-\[11px\] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"',
    r'className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getPillColor(task.project.name)} max-w-full`}',
    content
)

content = re.sub(
    r'className="inline-flex items-center px-2\.5 py-1 rounded-md text-\[11px\] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"',
    r'className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getPillColor(task.campaign.name)} max-w-full`}',
    content
)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

# Patch TaskDetailPanel
with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'r') as f:
    content = f.read()

if 'getPillColor' not in content:
    content = content.replace('export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({', color_func + '\nexport const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({')

content = re.sub(
    r'className="inline-flex items-center px-2\.5 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 max-w-full"',
    r'className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getPillColor(task.project?.name || \'\')} max-w-full`}',
    content
)

content = re.sub(
    r'className="inline-flex items-center px-2\.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 max-w-full"',
    r'className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getPillColor(task.campaign?.name || \'\')} max-w-full`}',
    content
)

with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'w') as f:
    f.write(content)

print("patched colors")
