with open('Dev/src/hooks/useTasks.ts', 'r') as f:
    content = f.read()

content = content.replace("project:project_id(name),", "project:project_id(name),\n          campaign:campaign_id(name),")

with open('Dev/src/hooks/useTasks.ts', 'w') as f:
    f.write(content)

print("fixed useTasks query")
