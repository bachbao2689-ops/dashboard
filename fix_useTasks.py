with open('Dev/src/hooks/useTasks.ts', 'r') as f:
    content = f.read()

# Fix the mapping in cTasks
content = content.replace("project: cs.campaigns ? { name: cs.campaigns.name } : null,", "campaign: cs.campaigns ? { name: cs.campaigns.name } : null,")

with open('Dev/src/hooks/useTasks.ts', 'w') as f:
    f.write(content)

print("fixed useTasks")
