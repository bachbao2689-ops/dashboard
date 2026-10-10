import re

with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const [taskToDelete, setTaskToDelete] = useState<any>(null);",
    "const [taskToDelete, setTaskToDelete] = useState<any>(null);\n  const [deletingIds, setDeletingIds] = useState<string[]>([]);"
)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
