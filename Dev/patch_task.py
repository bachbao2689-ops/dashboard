import re
def patch_file(path):
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace("project?: { name: string };", "project?: { name: string };\n  campaign?: { name: string };")
    with open(path, 'w') as f:
        f.write(content)

patch_file('src/hooks/useTasks.ts')
patch_file('src/types/index.ts')

try:
    patch_file('src/hooks/useMyTasks.ts')
except:
    pass

print("patched Task interfaces")
