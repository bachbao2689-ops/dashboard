import re

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# 1. Add deletingIds state
if "const [deletingIds, setDeletingIds] = useState<string[]>([]);" not in content:
    content = content.replace("const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);", "const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);\n  const [deletingIds, setDeletingIds] = useState<string[]>([]);")

# 2. Update executeRemoveProject
old_proj = """  const executeRemoveProject = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('projects').update({ status: 'deleted' }).eq('id', projectToDelete.id);
    if (!error) {
      await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('project_id', projectToDelete.id);
      if (profile?.id) {
        const { error: logError } = await recordTaskDeletion({ userId: profile?.id, taskId: projectToDelete.id, entityType: 'project', title: projectToDelete.name });
        if (logError) toast.error('Project đã xóa nhưng chưa ghi được vào Log');
      }
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
      if (selected?.id === projectToDelete.id) setSelected(null);
      window.dispatchEvent(new Event('tasks:changed'));
    } else {
      toast.error('Lỗi khi xóa Dự án');
    }
  };"""

new_proj = """  const executeRemoveProject = async () => {
    if (!projectToDelete) return;
    setDeletingIds(prev => [...prev, projectToDelete.id]);
    const cached = projectToDelete;
    setProjectToDelete(null);
    if (selected?.id === cached.id) setSelected(null);
    setTimeout(async () => {
      const { error } = await supabase.from('projects').update({ status: 'deleted' }).eq('id', cached.id);
      if (!error) {
        await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('project_id', cached.id);
        if (profile?.id) {
          const { error: logError } = await recordTaskDeletion({ userId: profile?.id, taskId: cached.id, entityType: 'project', title: cached.name });
          if (logError) toast.error('Project đã xóa nhưng chưa ghi được vào Log');
        }
        setProjects(projects => projects.filter(p => p.id !== cached.id));
        window.dispatchEvent(new Event('tasks:changed'));
      } else {
        toast.error('Lỗi khi xóa Dự án');
      }
      setDeletingIds(prev => prev.filter(id => id !== cached.id));
    }, 300);
  };"""

content = content.replace(old_proj, new_proj)

# 3. Update executeRemoveSubtask
old_sub = """  const executeRemoveSubtask = async () => {
    if (!subtaskToDelete) return;
    const { error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', subtaskToDelete);
    if (error) { toast.error('Không thể xóa subtask'); return; }
    if (profile?.id) {
      const st = subtasks.find(s => s.id === subtaskToDelete);
      const { error: logError } = await recordTaskDeletion({ userId: profile?.id, taskId: subtaskToDelete, entityType: 'project_subtask', title: st?.title || 'Subtask', parentName: selected?.name, parentType: 'project' });
      if (logError) toast.error('Subtask đã xóa nhưng chưa ghi được vào Log');
    }
    setSubtasks(subtasks.filter(s => s.id !== subtaskToDelete));
    setSubtaskToDelete(null);
    window.dispatchEvent(new Event('tasks:changed'));
  };"""

new_sub = """  const executeRemoveSubtask = async () => {
    if (!subtaskToDelete) return;
    setDeletingIds(prev => [...prev, subtaskToDelete]);
    const cachedId = subtaskToDelete;
    setSubtaskToDelete(null);
    setTimeout(async () => {
      const { error } = await supabase.from('project_subtasks').update({ status: 'deleted' }).eq('id', cachedId);
      if (error) { toast.error('Không thể xóa subtask'); return; }
      if (profile?.id) {
        const st = subtasks.find(s => s.id === cachedId);
        const { error: logError } = await recordTaskDeletion({ userId: profile?.id, taskId: cachedId, entityType: 'project_subtask', title: st?.title || 'Subtask', parentName: selected?.name, parentType: 'project' });
        if (logError) toast.error('Subtask đã xóa nhưng chưa ghi được vào Log');
      }
      setSubtasks(subtasks => subtasks.filter(s => s.id !== cachedId));
      window.dispatchEvent(new Event('tasks:changed'));
      setDeletingIds(prev => prev.filter(id => id !== cachedId));
    }, 300);
  };"""

content = content.replace(old_sub, new_sub)

# 4. Apply deletingIds to Projects row
content = content.replace(
    'className="group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-primary/5"',
    'className={`group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-primary/5 transition-all duration-300 ${deletingIds.includes(project.id) ? "animate-fade-out" : ""}`}'
)

# 5. Apply deletingIds to subtask row
content = content.replace(
    'className="group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-colors text-sm cursor-pointer"',
    'className={`group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-all duration-300 text-sm cursor-pointer ${deletingIds.includes(s.id) ? "animate-fade-out" : ""}`}'
)

# 6. Apply deletingIds to campaign subtask row (Note: campaign subtask deletion is handled via executeRemoveCampaignSubtask but wait, removeCampaignSubtask is direct!)
# Let's check if executeRemoveCampaignSubtask exists
with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)
