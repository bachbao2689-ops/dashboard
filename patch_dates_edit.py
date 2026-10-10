import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Fix saveInlineEdit
old_save = "start_date: start || null, due_date: due || null"
new_save = "start_date: parseYMD(start), due_date: parseYMD(due)"
content = content.replace(old_save, new_save)

# Fix saveCampaignEdit
old_camp = "start_date: start || null, end_date: due || null"
new_camp = "start_date: parseYMD(start), end_date: parseYMD(due)"
content = content.replace(old_camp, new_camp)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)
