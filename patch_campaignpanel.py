import re

with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'r') as f:
    content = f.read()

if "const [deletingIds, setDeletingIds] = useState<string[]>([]);" not in content:
    content = content.replace("const [campaignToDelete, setCampaignToDelete] = useState<any>(null);", "const [campaignToDelete, setCampaignToDelete] = useState<any>(null);\n  const [deletingIds, setDeletingIds] = useState<string[]>([]);")

old_rem = """  const executeRemove = async () => {
    if (!campaignToDelete) return;
    const { error } = await supabase.from('campaigns').update({ status: 'deleted' }).eq('id', campaignToDelete.id);
    if (!error) {
      await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('campaign_id', campaignToDelete.id);
      toast.success('Đã chuyển Campaign vào thùng rác');
      await load();
      window.dispatchEvent(new Event('tasks:changed'));
    } else {
      toast.error('Lỗi khi xóa Campaign');
    }
    setCampaignToDelete(null);
  };"""

new_rem = """  const executeRemove = async () => {
    if (!campaignToDelete) return;
    setDeletingIds(prev => [...prev, campaignToDelete.id]);
    const cached = campaignToDelete;
    setCampaignToDelete(null);
    setTimeout(async () => {
      const { error } = await supabase.from('campaigns').update({ status: 'deleted' }).eq('id', cached.id);
      if (!error) {
        await supabase.from('campaign_subtasks').update({ status: 'deleted' }).eq('campaign_id', cached.id);
        toast.success('Đã chuyển Campaign vào thùng rác');
        await load();
        window.dispatchEvent(new Event('tasks:changed'));
      } else {
        toast.error('Lỗi khi xóa Campaign');
      }
      setDeletingIds(prev => prev.filter(id => id !== cached.id));
    }, 300);
  };"""

content = content.replace(old_rem, new_rem)

content = content.replace(
    'className={`group border-t border-amber-100 dark:border-slate-800 cursor-pointer',
    'className={`group border-t border-amber-100 dark:border-slate-800 cursor-pointer transition-all duration-300 ${deletingIds.includes(campaign.id) ? "animate-fade-out" : ""}'
)

with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'w') as f:
    f.write(content)
