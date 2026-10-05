const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required in backend/.env.');

const source = JSON.parse(fs.readFileSync(path.join(__dirname, '.import-source.json'), 'utf8'));
const taskHeaders = source.taskRows[0];
const assetHeaders = source.assetRows[0];
const taskRows = source.taskRows.slice(1).filter(row => String(row?.[0] || '').trim());
const assetRows = source.assetRows.slice(1).filter(row => String(row?.[0] || '').trim());

const clean = value => {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result && result.toLowerCase() !== 'fill' ? result : null;
};
const serialDate = value => {
  if (typeof value !== 'number') return null;
  return new Date(Date.UTC(1899, 11, 30 + value)).toISOString().slice(0, 10);
};
const taskSourceData = row => Object.fromEntries(taskHeaders.map((header, index) => [header, row[index] ?? null]));
const assetSourceData = row => Object.fromEntries(assetHeaders.map((header, index) => [header, row[index] ?? null]));
const statusFor = value => {
  const normalized = clean(value)?.toLowerCase();
  if (normalized === 'done') return 'done';
  if (normalized === 'on going' || normalized === 'ongoing' || normalized === 'in progress') return 'in_progress';
  return 'todo';
};
const priorityFor = value => {
  const normalized = clean(value)?.toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
};
const namesFromPic = value => (clean(value) || '').split(',').map(name => name.trim()).filter(Boolean);
const initialsFor = name => name.split(/\s+/).map(word => word[0]).join('').slice(0, 4).toUpperCase();
const emailFor = name => `imported+${Buffer.from(name).toString('hex')}@kcoffee.local`;

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN');

    await client.query('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_ref_key');
    await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_row_key TEXT');
    await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_data JSONB');
    await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS source_row_key TEXT');
    await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS source_data JSONB');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS tasks_source_row_key_unique ON tasks (source_row_key) WHERE source_row_key IS NOT NULL');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS assets_source_row_key_unique ON assets (source_row_key) WHERE source_row_key IS NOT NULL');

    const workspaceResult = await client.query("SELECT id, owner_id FROM workspaces WHERE slug = 'k-coffee' LIMIT 1");
    if (!workspaceResult.rowCount) throw new Error('Workspace k-coffee was not found.');
    const workspace = workspaceResult.rows[0];
    const createdBy = workspace.owner_id;

    const userMap = new Map((await client.query('SELECT id, name FROM users')).rows.map(row => [row.name.trim().toUpperCase(), row.id]));
    for (const name of [...new Set(taskRows.flatMap(row => namesFromPic(row[8])))]) {
      const key = name.toUpperCase();
      if (!userMap.has(key)) {
        const result = await client.query(
          'INSERT INTO users (email, name, initials, role, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [emailFor(name), name, initialsFor(name), 'member']
        );
        userMap.set(key, result.rows[0].id);
      }
    }

    const departmentMap = new Map();
    for (const name of [...new Set(taskRows.map(row => clean(row[1])).filter(Boolean))]) {
      const existing = await client.query('SELECT id FROM departments WHERE workspace_id = $1 AND name = $2 LIMIT 1', [workspace.id, name]);
      const id = existing.rowCount ? existing.rows[0].id : (await client.query('INSERT INTO departments (workspace_id, name) VALUES ($1, $2) RETURNING id', [workspace.id, name])).rows[0].id;
      departmentMap.set(name, id);
    }

    const projectMap = new Map();
    for (const name of [...new Set(taskRows.map(row => clean(row[3])).filter(Boolean))]) {
      const existing = await client.query('SELECT id FROM projects WHERE workspace_id = $1 AND name = $2 LIMIT 1', [workspace.id, name]);
      const id = existing.rowCount ? existing.rows[0].id : (await client.query('INSERT INTO projects (workspace_id, name, created_by) VALUES ($1, $2, $3) RETURNING id', [workspace.id, name, createdBy])).rows[0].id;
      projectMap.set(name, id);
    }

    const columnDefs = [
      ['Yet to Start', 'gray', 1, true],
      ['In Progress', 'blue', 2, false],
      ['Completed', 'green', 3, false]
    ];
    const columnMap = new Map();
    for (const [name, color, position, isDefault] of columnDefs) {
      const existing = await client.query('SELECT id FROM columns WHERE workspace_id = $1 AND name = $2 LIMIT 1', [workspace.id, name]);
      const id = existing.rowCount ? existing.rows[0].id : (await client.query('INSERT INTO columns (workspace_id, name, color, position, is_default) VALUES ($1, $2, $3, $4, $5) RETURNING id', [workspace.id, name, color, position, isDefault])).rows[0].id;
      columnMap.set(name, id);
    }

    let taskCount = 0;
    for (const [index, row] of taskRows.entries()) {
      const sourceKey = `task-master:${index + 2}`;
      const pic = clean(row[8]);
      const primaryAssignee = namesFromPic(pic)[0];
      const status = statusFor(row[12]);
      const columnName = status === 'done' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Yet to Start';
      const description = [
        clean(row[6]) && `Brief: ${clean(row[6])}`,
        clean(row[7]) && `Deliverable: ${clean(row[7])}`,
        pic && `PIC source: ${pic}`,
        clean(row[13]) && `Note: ${clean(row[13])}`,
        clean(row[14]) && `Source link: ${clean(row[14])}`
      ].filter(Boolean).join('\n\n') || null;

      await client.query(
        `INSERT INTO tasks (
          workspace_id, project_id, task_ref, title, description, department_id, assignee_id,
          priority, status, start_date, due_date, column_id, position, created_by, source_row_key, source_data
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
        ) ON CONFLICT (source_row_key) WHERE source_row_key IS NOT NULL DO UPDATE SET
          project_id = EXCLUDED.project_id, task_ref = EXCLUDED.task_ref, title = EXCLUDED.title,
          description = EXCLUDED.description, department_id = EXCLUDED.department_id, assignee_id = EXCLUDED.assignee_id,
          priority = EXCLUDED.priority, status = EXCLUDED.status, start_date = EXCLUDED.start_date,
          due_date = EXCLUDED.due_date, column_id = EXCLUDED.column_id, position = EXCLUDED.position,
          source_data = EXCLUDED.source_data`,
        [
          workspace.id, projectMap.get(clean(row[3])) || null, clean(row[0]), clean(row[4]) || `Untitled ${sourceKey}`,
          description, departmentMap.get(clean(row[1])) || null, primaryAssignee ? userMap.get(primaryAssignee.toUpperCase()) : null,
          priorityFor(row[5]), status, serialDate(row[9]), serialDate(row[10]), columnMap.get(columnName),
          index + 1, createdBy, sourceKey, JSON.stringify(taskSourceData(row))
        ]
      );
      taskCount += 1;
    }

    const categoryMap = new Map();
    for (const name of [...new Set(assetRows.map(row => clean(row[1])).filter(Boolean))]) {
      const existing = await client.query('SELECT id FROM asset_categories WHERE workspace_id = $1 AND name = $2 LIMIT 1', [workspace.id, name]);
      const id = existing.rowCount ? existing.rows[0].id : (await client.query('INSERT INTO asset_categories (workspace_id, name, icon) VALUES ($1, $2, $3) RETURNING id', [workspace.id, name, 'Box'])).rows[0].id;
      categoryMap.set(name, id);
    }

    let assetCount = 0;
    for (const [index, row] of assetRows.entries()) {
      const sourceKey = `asset-setup:${index + 5}`;
      const price = typeof row[6] === 'number' ? row[6] : null;
      const values = [
        workspace.id, clean(row[0]), clean(row[3]) || `Unnamed asset ${sourceKey}`,
        categoryMap.get(clean(row[1])) || null, clean(row[7]), clean(row[5]),
        clean(row[2]) ? `Brand: ${clean(row[2])}` : null, price, clean(row[4]), createdBy,
        sourceKey, JSON.stringify(assetSourceData(row))
      ];
      const existing = await client.query(
        'SELECT id FROM assets WHERE source_row_key = $1 OR asset_code = $2 LIMIT 1',
        [sourceKey, clean(row[0])]
      );
      if (existing.rowCount) {
        await client.query(
          `UPDATE assets SET
            workspace_id = $1, asset_code = $2, name = $3, category_id = $4, condition = $5,
            location = $6, description = $7,
            purchase_price = $8, serial_number = $9, added_by = $10, source_row_key = $11,
            source_data = $12
          WHERE id = $13`,
          [...values, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO assets (
            workspace_id, asset_code, name, category_id, condition, location, status, is_available,
            description, purchase_price, serial_number, added_by, source_row_key, source_data
          ) VALUES (
            $1,$2,$3,$4,$5,$6,'available',true,$7,$8,$9,$10,$11,$12
          )`,
          values
        );
      }
      assetCount += 1;
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ imported: { tasks: taskCount, assets: assetCount }, created: { users: userMap.size, departments: departmentMap.size, projects: projectMap.size, asset_categories: categoryMap.size } }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
