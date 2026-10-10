import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className={`group flex ${mine ? \'justify-end\' : \'justify-start\'} items-end gap-2`}',
    'className={`group flex ${mine ? \'justify-end\' : \'justify-start\'} items-end gap-2 animate-slide-up`}'
)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)
