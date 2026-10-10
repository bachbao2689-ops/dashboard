import re

with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

old_bulk = """  const handleBulkDelete = async () => {
    let deletedCount = 0;
    for (const taskId of selectedTasks) {
      const task = tasks.find(item => item.id === taskId);
      let entityType: 'task' | 'project_subtask' | 'campaign_subtask';
      let rawId = taskId;
      let error: any;
      if (taskId.startsWith('ps-')) {
        entityType = 'project_subtask'; rawId = taskId.replace('ps-', '');
        ({ error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', rawId));
      } else if (taskId.startsWith('cs-')) {
        entityType = 'campaign_subtask'; rawId = taskId.replace('cs-', '');
        ({ error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', rawId));
      } else {
        entityType = 'task';
        ({ error } = await supabase.from('tasks').update({ status: 'deleted' }).eq('id', taskId));
      }
      if (!error) {
        deletedCount++;
        if (profileId && task) {
          const { error: logError } = await recordTaskDeletion({ userId: profileId, taskId: rawId, entityType, title: task.title, parentName: task.project?.name, parentType: entityType === 'project_subtask' ? 'project' : entityType === 'campaign_subtask' ? 'campaign' : null });
          if (logError) toast.error(`Đã xóa "${task.title}" nhưng chưa ghi được vào Log`);
        }
      }
    }
    if (deletedCount) toast.success(`Đã chuyển ${deletedCount} task vào thùng rác`);
    if (deletedCount < selectedTasks.length) toast.error(`Không xóa được ${selectedTasks.length - deletedCount} task`);
    setSelectedTasks([]);
    setIsBulkDeleteModalOpen(false);
    window.dispatchEvent(new Event('tasks:changed'));
    refetch();
  };"""

new_bulk = """  const handleBulkDelete = async () => {
    setDeletingIds(prev => [...prev, ...selectedTasks]);
    const cachedSelected = [...selectedTasks];
    setIsBulkDeleteModalOpen(false);
    
    setTimeout(async () => {
      let deletedCount = 0;
      for (const taskId of cachedSelected) {
        const task = tasks.find(item => item.id === taskId);
        let entityType: 'task' | 'project_subtask' | 'campaign_subtask';
        let rawId = taskId;
        let error: any;
        if (taskId.startsWith('ps-')) {
          entityType = 'project_subtask'; rawId = taskId.replace('ps-', '');
          ({ error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', rawId));
        } else if (taskId.startsWith('cs-')) {
          entityType = 'campaign_subtask'; rawId = taskId.replace('cs-', '');
          ({ error } = await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('id', rawId));
        } else {
          entityType = 'task';
          ({ error } = await supabase.from('tasks').update({ status: 'deleted' }).eq('id', taskId));
        }
        if (!error) {
          deletedCount++;
          if (profileId && task) {
            const { error: logError } = await recordTaskDeletion({ userId: profileId, taskId: rawId, entityType, title: task.title, parentName: task.project?.name, parentType: entityType === 'project_subtask' ? 'project' : entityType === 'campaign_subtask' ? 'campaign' : null });
            if (logError) toast.error(`Đã xóa "${task.title}" nhưng chưa ghi được vào Log`);
          }
        }
      }
      if (deletedCount) toast.success(`Đã chuyển ${deletedCount} task vào thùng rác`);
      if (deletedCount < cachedSelected.length) toast.error(`Không xóa được ${cachedSelected.length - deletedCount} task`);
      setSelectedTasks([]);
      window.dispatchEvent(new Event('tasks:changed'));
      refetch();
      setDeletingIds(prev => prev.filter(id => !cachedSelected.includes(id)));
    }, 300);
  };"""

content = content.replace(old_bulk, new_bulk)
with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
