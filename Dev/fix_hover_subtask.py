import re

with open('src/pages/Projects.tsx', 'r') as f:
    c = f.read()

# Replace hover effect for Subtasks in Projects
# Old: hover:border-primary/40 hover:shadow-sm
# New: hover-row-effect hover:border-transparent
c = c.replace("cursor-pointer hover:border-primary/40 hover:shadow-sm", "cursor-pointer hover-row-effect hover:border-transparent")

with open('src/pages/Projects.tsx', 'w') as f:
    f.write(c)

print("added hover row effect to subtasks")
