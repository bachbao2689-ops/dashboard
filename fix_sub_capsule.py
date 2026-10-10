import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    c = f.read()

# Replace the amber classes with violet in the SUB capsule for projects
c = c.replace(
    'bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-800',
    'bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full border border-violet-100 dark:border-violet-800'
)
c = c.replace(
    '<span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">SUB</span>',
    '<span className="text-[9px] font-bold text-violet-700 dark:text-violet-400">SUB</span>'
)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(c)

print("fixed SUB capsule color for Projects")
