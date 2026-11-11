import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from '../backend/node_modules/pg/lib/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2]; // 'local' or 'main'

if (!['local', 'main'].includes(mode)) {
  console.error("Usage: node switch-dataset.mjs <local|main>");
  process.exit(1);
}

const runtime = JSON.parse(fs.readFileSync(path.join(root, '.local-supabase/runtime.json'), 'utf8')).env;
const client = new pg.Client({ connectionString: runtime.DB_URL });
await client.connect();

const filePath = mode === 'local' 
  ? path.join(root, '.local-supabase/backups/local-synthetic-data.json')
  : path.join(root, '.local-supabase/backups/main-live-data.json');

if (!fs.existsSync(filePath)) {
  console.error(`Backup file not found: ${filePath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

try {
  await client.query('BEGIN');

  // Truncate tables with cascade in right order or disable triggers temporarily
  const truncateTables = [
    'project_comments', 'comments',
    'project_subtasks', 'campaign_subtasks',
    'workflow_phase_members', 'workflow_phases', 'workflow_tracks',
    'project_members', 'campaign_members',
    'tasks', 'projects', 'campaigns'
  ];

  for (const t of truncateTables) {
    try {
      await client.query(`TRUNCATE TABLE ${t} CASCADE;`);
    } catch (e) {
      // Ignore if table does not exist
    }
  }

  // Helper to insert rows
  const insertRows = async (table, rows) => {
    if (!rows || rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const colList = cols.map(c => `"${c}"`).join(', ');
    
    for (const row of rows) {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map(c => {
        let val = row[c];
        if (val !== null && typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      });
      try {
        await client.query(`INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`, values);
      } catch (err) {
        // Log individual insert error if needed
      }
    }
  };

  // Insert in dependency order
  await insertRows('campaigns', data.campaigns);
  await insertRows('projects', data.projects);
  await insertRows('campaign_members', data.campaign_members);
  await insertRows('project_members', data.project_members);
  await insertRows('workflow_tracks', data.workflow_tracks);
  await insertRows('workflow_phases', data.workflow_phases);
  await insertRows('workflow_phase_members', data.workflow_phase_members);
  await insertRows('tasks', data.tasks);
  await insertRows('project_subtasks', data.project_subtasks);
  await insertRows('campaign_subtasks', data.campaign_subtasks);
  await insertRows('comments', data.comments);
  await insertRows('project_comments', data.project_comments);

  // Record current active dataset in state
  fs.writeFileSync(path.join(root, '.local-supabase/active-dataset.json'), JSON.stringify({
    mode,
    switchedAt: new Date().toISOString(),
    projectCount: data.projects?.length || 0,
    campaignCount: data.campaigns?.length || 0,
    taskCount: data.tasks?.length || 0
  }, null, 2));

  await client.query('COMMIT');
  console.log(`SUCCESS: Switched database to [${mode.toUpperCase()}] mode! (${data.projects?.length || 0} projects, ${data.campaigns?.length || 0} campaigns, ${data.tasks?.length || 0} tasks)`);
} catch (e) {
  await client.query('ROLLBACK');
  console.error("FAILED to switch dataset:", e);
  process.exit(1);
} finally {
  await client.end();
}
