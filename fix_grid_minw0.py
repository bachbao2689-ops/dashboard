import re
with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'r') as f:
    content = f.read()

# Make the wrapper div for the Project/Campaign pill have min-w-0
content = re.sub(r'<div><p className="text-xs text-gray-500 uppercase mb-2">Project / Campaign</p>', r'<div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">Project / Campaign</p>', content)
content = re.sub(r'<div><p className="text-xs text-gray-500 uppercase mb-2"><User ', r'<div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><User ', content)
content = re.sub(r'<div><p className="text-xs text-gray-500 uppercase mb-2"><Calendar ', r'<div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2"><Calendar ', content)
content = re.sub(r'<div><p className="text-xs text-gray-500 uppercase mb-2">Department</p>', r'<div className="min-w-0"><p className="text-xs text-gray-500 uppercase mb-2">Department</p>', content)

with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'w') as f:
    f.write(content)

print("fixed grid min-w-0")
