import re

with open('Dev/src/components/features/projects/SubtaskDetailPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className={`flex gap-3 ${mine ? \'flex-row-reverse\' : \'flex-row\'} items-end group`}',
    'className={`flex gap-3 ${mine ? \'flex-row-reverse\' : \'flex-row\'} items-end group animate-slide-up`}'
)

with open('Dev/src/components/features/projects/SubtaskDetailPanel.tsx', 'w') as f:
    f.write(content)
