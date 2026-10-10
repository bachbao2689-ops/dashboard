import re
with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Add line-through logic for completed tasks
content = content.replace(
    '<div className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary transition-colors line-clamp-2">{task.title}</div>',
    '<div className={`font-medium cursor-pointer hover:text-primary transition-colors line-clamp-2 ${[\'done\', \'complete\', \'completed\'].includes((task.status || \'\').toLowerCase()) ? \'line-through text-gray-400 dark:text-gray-500\' : \'text-gray-900 dark:text-gray-100\'}`}>{task.title}</div>'
)

# Optional: Add a subtle green background to the row if it's completed
# The row starts with: <tr key={task.id} ... className={`... group ${...} ${...}`}>
old_tr = r"<tr key=\{task\.id\} onClick=\{.*?\} className=\{\`(.*?)\`\}>"

def replace_tr(match):
    inner_class = match.group(1)
    # Add green background condition
    new_class = inner_class + " ${['done', 'complete', 'completed'].includes((task.status || '').toLowerCase()) ? 'bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20' : ''}"
    return match.group(0).replace(inner_class, new_class)

content = re.sub(old_tr, replace_tr, content)


with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

print("fixed tasklist done UI")
