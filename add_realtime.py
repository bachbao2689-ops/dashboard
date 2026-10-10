import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Replace the simple useEffect load call with the realtime one
old_effect = "useEffect(() => { load(); }, []);"
new_effect = """useEffect(() => {
    load();
    const channel = supabase.channel('projects_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_subtasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_subtasks' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);"""

content = content.replace(old_effect, new_effect)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)
