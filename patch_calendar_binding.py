import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

old_listener = """    const handleChange = (e: any) => {
      const id = e.target?.id;
      if (id === 'subtask-due-input') setSubtaskDue(e.target.value);
      else if (id && id.startsWith('edit-subtask-due-')) setEditSubtaskDue(e.target.value);
    };"""

new_listener = """    const handleChange = (e: any) => {
      const id = e.target?.id;
      if (id === 'subtask-due-input') setSubtaskDue(e.target.value);
      else if (id === 'campaign-subtask-due-input') setCampaignSubtaskDue(e.target.value);
      else if (id && id.startsWith('edit-subtask-due-')) setEditSubtaskDue(e.target.value);
      else if (id && id.startsWith('edit-campaign-subtask-due-')) setCampaignEditSubtaskDue(e.target.value);
    };"""

if old_listener in content:
    content = content.replace(old_listener, new_listener)
    with open('Dev/src/pages/Projects.tsx', 'w') as f:
        f.write(content)
    print("Patched Projects.tsx")
else:
    print("Could not find the old listener.")
