import re

with open('src/components/features/profile/ProfileHeader.tsx', 'r') as f:
    content = f.read()

conflict_pattern = re.compile(r'<<<<<<< HEAD\n=======\n(.*?)\n>>>>>>> main\n', re.DOTALL)
content = conflict_pattern.sub(r'\1', content)

with open('src/components/features/profile/ProfileHeader.tsx', 'w') as f:
    f.write(content)

