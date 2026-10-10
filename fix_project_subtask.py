import re
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Fix the condition in line 568
old_cond = r"\(\(s\.status \|\| ''\)\.toLowerCase\(\) === 'completed' \?"
new_cond = r"(['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ?"

content = re.sub(old_cond, new_cond, content)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("fixed project subtask condition")
