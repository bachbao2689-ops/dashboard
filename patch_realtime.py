import re
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Add a toggle state to force refresh details
content = content.replace("const [recentlyCompletedSubtaskId, setRecentlyCompletedSubtaskId] = useState<string | null>(null);", "const [recentlyCompletedSubtaskId, setRecentlyCompletedSubtaskId] = useState<string | null>(null);\n  const [refreshDetailTrigger, setRefreshDetailTrigger] = useState(0);")

# Update the dependencies of the two useEffects
content = content.replace("}, [selected]);", "}, [selected, refreshDetailTrigger]);")
content = content.replace("}, [selectedCampaign]);", "}, [selectedCampaign, refreshDetailTrigger]);")

# Update the realtime channel to include project_comments, activity_log and trigger refreshDetail
old_sub = r"\.on\('postgres_changes', \{ event: '\*', schema: 'public', table: 'campaign_subtasks' \}, load\)\n\s*\.subscribe\(\);"

new_sub = """.on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_subtasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_comments' }, () => { load(); setRefreshDetailTrigger(v => v + 1); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => { load(); setRefreshDetailTrigger(v => v + 1); })
      .subscribe();"""

content = re.sub(old_sub, new_sub, content)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("patched realtime")
