import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient('https://jxrwphjriuqbpdpwpqcn.supabase.co', 'sb_publishable_azJfzhk-nzUYGWb23zAFiQ_KKRrYLMM');

async function backup() {
  const { data: tasks } = await supabase.from('tasks').select('*');
  const { data: projects } = await supabase.from('projects').select('*');
  const { data: departments } = await supabase.from('departments').select('*');
  const { data: users } = await supabase.from('users').select('*');
  
  const backupDir = '/Users/admin/.gemini/antigravity/brain/3ab11169-5ec4-4a60-b323-32a140d1c401/scratch';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  
  fs.writeFileSync(`${backupDir}/backup_data.json`, JSON.stringify({ tasks, projects, departments, users }, null, 2));
  console.log('Backup saved to backup_data.json');
  
  const marketingDep = departments.find(d => d.name.toLowerCase().includes('marketing') || d.name.toLowerCase().includes('mkt'));
  console.log('Marketing Department ID:', marketingDep?.id);
  
  if (marketingDep && tasks) {
    const toDeleteIds = tasks.filter(t => t.department_id !== marketingDep.id).map(t => t.id);
    console.log(`Found ${toDeleteIds.length} tasks to delete.`);
    
    // We cannot delete from client if RLS prevents it. Let's output a SQL script for the user to run instead.
    const sql = `
begin;
  delete from tasks where department_id != '${marketingDep.id}' or department_id is null;
commit;
`;
    fs.writeFileSync(`${backupDir}/delete_tasks.sql`, sql);
    console.log('Wrote SQL to delete tasks.');
  }
}
backup();
