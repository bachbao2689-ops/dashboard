with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

content = content.replace('className="btn-new-task"', 'className="btn-add-new"')

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

with open('Dev/src/index.css', 'r') as f:
    css = f.read()
import re
css = re.sub(r'html:not\(\.dark\) \.btn-new-task.*?(?=\n\n|$)', '', css, flags=re.DOTALL)
with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("fixed new task button")
