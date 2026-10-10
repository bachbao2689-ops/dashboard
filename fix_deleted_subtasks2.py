import re

# Fix useProfileCalendar.ts
with open('Dev/src/hooks/useProfileCalendar.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "allRows(supabase.from('project_subtasks').select('*,assignee:assignee_id(name,avatar_url)').eq('assignee_id', profileId).order('id')),",
    "allRows(supabase.from('project_subtasks').select('*,assignee:assignee_id(name,avatar_url)').eq('assignee_id', profileId).neq('status', 'deleted').order('id')),"
)
content = content.replace(
    "allRows(supabase.from('campaign_subtasks').select('*,assignee:assignee_id(name,avatar_url)').eq('assignee_id', profileId).order('id')),",
    "allRows(supabase.from('campaign_subtasks').select('*,assignee:assignee_id(name,avatar_url)').eq('assignee_id', profileId).neq('status', 'deleted').order('id')),"
)

with open('Dev/src/hooks/useProfileCalendar.ts', 'w') as f:
    f.write(content)

# Fix Projects.tsx (notifyStakeholders)
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "await supabase.from('project_subtasks').select('assignee_id').eq('project_id', entityId);",
    "await supabase.from('project_subtasks').select('assignee_id').eq('project_id', entityId).neq('status', 'deleted');"
)
content = content.replace(
    "await supabase.from('campaign_subtasks').select('assignee_id').eq('campaign_id', entityId);",
    "await supabase.from('campaign_subtasks').select('assignee_id').eq('campaign_id', entityId).neq('status', 'deleted');"
)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)
