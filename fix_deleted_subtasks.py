import re

# Fix Projects.tsx
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "supabase.from('project_subtasks').select('project_id,assignee_id')",
    "supabase.from('project_subtasks').select('project_id,assignee_id').neq('status', 'deleted')"
)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

# Fix CampaignPanel.tsx
with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "await supabase.from('campaign_subtasks').select('campaign_id').eq('assignee_id', profile?.id);",
    "await supabase.from('campaign_subtasks').select('campaign_id').eq('assignee_id', profile?.id).neq('status', 'deleted');"
)

with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'w') as f:
    f.write(content)
