import { supabase } from './supabase';
import { readAll } from './workspaceTasks';
import { taskKey, taskTarget } from '../lib/taskTracking';
import { canViewTeamManagement, isGlobalManager } from '../lib/roleScope';
import { useAuthStore } from '../store/authStore';
import { normalizeOutputs, safeReportUrl, type ReportNotes, type ReportOutput, type ReportSnapshot, type TaskOutputRecord } from '../lib/executiveWeeklyReport';
import { readWeeklyReports } from './weeklyReports';
import { createSharedResource } from '../lib/sharedResource';
import { workspaceScope } from './workspaceResources';

export type TeamReportRecord = {
  id: string; user_id: number; created_at: string; action: string;
  metadata: { department_id: string; notes: ReportNotes; snapshot?: ReportSnapshot; week_start: string; week_end: string };
};

export type ReportMember = { id: string; name: string; avatar_url?: string | null; role?: string | null;
  employment_level?: string | null; department_id?: string | null; department?: { name?: string } | null };

// Historical reporting must retain inactive staff. The active directory used by
// task assignment and Workload intentionally keeps its existing behavior.
export const reportDirectoryResource = createSharedResource<ReportMember[]>(async key => {
  if (key !== workspaceScope()) throw new Error('Phiên làm việc đã thay đổi.');
  const actor = await reportActor();
  let query = supabase.from('users').select('id,name,avatar_url,role,employment_level,department_id').order('name').order('id');
  if (!isGlobalManager(actor)) query = actor.department_id ? query.eq('department_id', actor.department_id) : query.eq('id', actor.id);
  const people = await readAll(query);
  if (key !== workspaceScope()) throw new Error('Phiên làm việc đã thay đổi.');
  return people.map(person => ({ ...person, id: String(person.id) })) as ReportMember[];
}, 60000);

export async function readTeamReportData(keys: string[], start: string, end: string, departmentId: string) {
  const readOutputs = async () => {
    const ids = [...new Set(keys.map(key => taskTarget(key).id))];
    const wanted = new Set(keys), rows: TaskOutputRecord[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const batch = await readAll(supabase.from('activity_log').select('entity_type,entity_id,metadata')
        .eq('action', 'weekly_report_outputs').in('entity_type', ['task', 'project_subtask', 'campaign_subtask'])
        .eq('metadata->>week_start', start).eq('metadata->>week_end', end).in('entity_id', ids.slice(i, i + 200))
        .order('created_at', { ascending: false }).order('id', { ascending: false }));
      rows.push(...batch.filter(row => wanted.has(taskKey(row.entity_type, row.entity_id))));
    }
    return rows;
  };
  const readRecords = () => readAll(supabase.from('activity_log').select('id,user_id,created_at,action,metadata')
    .eq('entity_type', 'user').in('action', ['team_weekly_report_draft', 'team_weekly_report_published'])
    .eq('metadata->>week_start', start).eq('metadata->>week_end', end).eq('metadata->>department_id', departmentId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }));
  const [reports, outputs, records] = await Promise.all([readWeeklyReports(keys, start, end), readOutputs(), readRecords()]);
  return { reports, outputs, records: records as TeamReportRecord[] };
}

async function reportActor() {
  const { profile, user } = useAuthStore.getState();
  if (!profile?.auth_id || !user || profile.auth_id !== user.id || !canViewTeamManagement(profile)) throw new Error('Không có quyền quản lý báo cáo.');
  return profile;
}

export async function saveTeamReport(workspaceId: string, snapshot: ReportSnapshot, publish: boolean) {
  const actor = await reportActor();
  if (!workspaceId || (!isGlobalManager(actor) && actor.department_id !== snapshot.departmentId)) throw new Error('Không có quyền gửi báo cáo phòng ban này.');
  if (publish && (!snapshot.entries.length || !snapshot.notes.summary.trim())) throw new Error('Bổ sung công việc và kết quả nổi bật trước khi gửi báo cáo.');
  const { data, error } = await supabase.from('activity_log').insert({
    workspace_id: workspaceId, user_id: actor.id, entity_type: 'user', entity_id: actor.auth_id,
    action: publish ? 'team_weekly_report_published' : 'team_weekly_report_draft',
    metadata: { schema: 1, department_id: snapshot.departmentId, week_start: snapshot.weekStart, week_end: snapshot.weekEnd,
      notes: snapshot.notes, ...(publish ? { snapshot: { ...snapshot, authorName: actor.name } } : {}) },
  }).select('id').single();
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { tables: ['activity_log'] } }));
  return data.id as string;
}

export async function saveTaskOutputs(taskId: string, workspaceId: string, start: string, end: string, channel: string, outputs: ReportOutput[]) {
  const actor = await reportActor(), target = taskTarget(taskId);
  if (!workspaceId || outputs.some(output => !Number.isInteger(output.quantity) || output.quantity < 1 || output.quantity > 100000 || (output.url && !safeReportUrl(output.url)))) throw new Error('Kiểm tra lại số lượng và đường dẫn minh chứng.');
  const { error } = await supabase.from('activity_log').insert({
    workspace_id: workspaceId, user_id: actor.id, entity_type: target.kind, entity_id: target.id, action: 'weekly_report_outputs',
    metadata: { schema: 1, week_start: start, week_end: end, channel: channel.trim().slice(0, 80), outputs: normalizeOutputs(outputs) },
  });
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { tables: ['activity_log'] } }));
}

export async function uploadReportEvidence(file: File) {
  const actor = await reportActor();
  if (file.size > 20 * 1024 * 1024) throw new Error('Tệp minh chứng tối đa 20 MB.');
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const { data, error } = await supabase.storage.from('attachments').upload(`weekly-reports/${actor.id}/${crypto.randomUUID()}-${filename}`, file, { upsert: false });
  if (error) throw error;
  return { url: supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl,
    name: file.name, kind: file.type.startsWith('image/') ? 'image' as const : 'file' as const };
}
