import re

# 1. CampaignPanel
with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'r') as f:
    c = f.read()
c = c.replace("hover-row-effect hover:bg-primary/5", "hover-row-effect hover-row-campaign hover:bg-primary/5")
with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'w') as f:
    f.write(c)

# 2. Projects
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    c = f.read()
c = c.replace("hover-row-effect hover:bg-primary/5", "hover-row-effect hover-row-project hover:bg-primary/5")
with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(c)

# 3. TaskList
with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    c = f.read()
# The class list in TaskList starts with: className={`cursor-pointer hover-row-effect hover:bg-gray-50/80...
# We will inject ${task.campaign?.name ? 'hover-row-campaign' : task.project?.name ? 'hover-row-project' : ''}
c = c.replace("className={`cursor-pointer hover-row-effect hover:bg-gray-50/80", "className={`cursor-pointer hover-row-effect ${task.campaign?.name ? 'hover-row-campaign' : task.project?.name ? 'hover-row-project' : ''} hover:bg-gray-50/80")
with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(c)

print("applied color row classes")
