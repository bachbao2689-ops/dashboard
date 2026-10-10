import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

css = css.replace('.btn-new-task-light', '.btn-new-task')
css += """
.btn-new-task {
  @apply flex items-center space-x-1 sm:space-x-2 text-white px-2.5 py-1.5 sm:px-4 sm:py-2.5 transition-all shadow-sm flex-shrink-0;
}
html.dark .btn-new-task {
  @apply bg-primary rounded-xl hover:bg-primary/90;
}
"""

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

content = content.replace('className="flex items-center space-x-1 sm:space-x-2 text-white px-2.5 py-1.5 sm:px-4 sm:py-2.5 transition-all shadow-sm flex-shrink-0 btn-new-task-light dark:bg-primary dark:rounded-xl dark:hover:bg-primary/90"', 'className="btn-new-task"')

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

print("cleaned tasklist")
