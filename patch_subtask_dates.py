import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Fix saveEditedSubtask
old_save = "due_date: editSubtaskDue || null"
new_save = "due_date: parseYMD(editSubtaskDue)"
content = content.replace(old_save, new_save)

# Fix addCampaignSubtask
old_add = "due_date: campaignSubtaskDue || null"
new_add = "due_date: parseYMD(campaignSubtaskDue)"
content = content.replace(old_add, new_add)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)
