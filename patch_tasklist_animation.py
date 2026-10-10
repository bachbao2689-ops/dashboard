import re

with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# 1. Add deletingIds state
if "const [deletingIds, setDeletingIds] = useState<string[]>([]);" not in content:
    content = content.replace("const [taskToDelete, setTaskToDelete] = useState<any | null>(null);", "const [taskToDelete, setTaskToDelete] = useState<any | null>(null);\n  const [deletingIds, setDeletingIds] = useState<string[]>([]);")

# 2. Update handleSingleDelete
old_single = """  const handleSingleDelete = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete.id;
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
    if (error) { toast.error('Không thể xóa task'); return; }
    if (profileId) {
      const { error: logError } = await recordTaskDeletion({ userId: profileId, taskId: rawId, entityType, title: taskToDelete.title, parentName: taskToDelete.project?.name, parentType: entityType === 'project_subtask' ? 'project' : entityType === 'campaign_subtask' ? 'campaign' : null });
      if (logError) toast.error('Task đã xóa nhưng chưa ghi được vào Log');
    }
    toast.success(`Đã chuyển task vào thùng rác`);
    setTaskToDelete(null);
    window.dispatchEvent(new Event('tasks:changed'));
    refetch();
  };"""

new_single = """  const handleSingleDelete = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete.id;
    let entityType: 'task' | 'project_subtask' | 'campaign_subtask';
    let rawId = taskId;
    let error: any;
    
    setDeletingIds(prev => [...prev, taskId]);
    const cachedTask = taskToDelete;
    setTaskToDelete(null);
    
    setTimeout(async () => {
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
      if (error) { toast.error('Không thể xóa task'); return; }
      if (profileId) {
        const { error: logError } = await recordTaskDeletion({ userId: profileId, taskId: rawId, entityType, title: cachedTask.title, parentName: cachedTask.project?.name, parentType: entityType === 'project_subtask' ? 'project' : entityType === 'campaign_subtask' ? 'campaign' : null });
        if (logError) toast.error('Task đã xóa nhưng chưa ghi được vào Log');
      }
      toast.success(`Đã chuyển task vào thùng rác`);
      window.dispatchEvent(new Event('tasks:changed'));
      refetch();
      setDeletingIds(prev => prev.filter(id => id !== taskId));
    }, 300);
  };"""

content = content.replace(old_single, new_single)

# 3. Add deletingIds to row rendering
content = content.replace(
    'className={`group overflow-hidden rounded-2xl bg-white transition-all',
    'className={`group overflow-hidden rounded-2xl bg-white transition-all duration-300 ${deletingIds.includes(task.id) ? "animate-fade-out" : ""}'
)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
