import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

old_c_sub = """  const executeRemoveCampaignSubtask = async () => {
    if (!campaignSubtaskToDelete) return;
    const { error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', campaignSubtaskToDelete.id);
    if (error) { toast.error('Không thể xóa subtask'); return; }
    if (profile?.id) {
      const { error: logError } = await recordTaskDeletion({ userId: profile.id, taskId: campaignSubtaskToDelete.id, entityType: 'campaign_subtask', title: campaignSubtaskToDelete.title, parentName: selectedCampaign?.name, parentType: 'campaign' });
      if (logError) toast.error('Subtask đã xóa nhưng chưa ghi được vào Log');
    }
    setCampaignSubtasks(items => items.filter(item => item.id !== campaignSubtaskToDelete.id));
    setCampaignSubtaskToDelete(null);
    window.dispatchEvent(new Event('tasks:changed'));
  };"""

new_c_sub = """  const executeRemoveCampaignSubtask = async () => {
    if (!campaignSubtaskToDelete) return;
    setDeletingIds(prev => [...prev, campaignSubtaskToDelete.id]);
    const cached = campaignSubtaskToDelete;
    setCampaignSubtaskToDelete(null);
    setTimeout(async () => {
      const { error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', cached.id);
      if (error) { toast.error('Không thể xóa subtask'); return; }
      if (profile?.id) {
        const { error: logError } = await recordTaskDeletion({ userId: profile.id, taskId: cached.id, entityType: 'campaign_subtask', title: cached.title, parentName: selectedCampaign?.name, parentType: 'campaign' });
        if (logError) toast.error('Subtask đã xóa nhưng chưa ghi được vào Log');
      }
      setCampaignSubtasks(items => items.filter(item => item.id !== cached.id));
      window.dispatchEvent(new Event('tasks:changed'));
      setDeletingIds(prev => prev.filter(id => id !== cached.id));
    }, 300);
  };"""

content = content.replace(old_c_sub, new_c_sub)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)
