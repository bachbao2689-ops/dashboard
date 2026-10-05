const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Add it to backend/.env.');
}

async function seed() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    
    // Clear old data for safe reseeding
    await client.query(`DELETE FROM users WHERE email = 'admin@kcoffee.com'`);
    
    // Create User first
    const resUser = await client.query(`INSERT INTO users (email, name, role) VALUES ('admin@kcoffee.com', 'Admin', 'admin') RETURNING id`);
    const userId = resUser.rows[0].id;
    
    // Create Workspace
    const resWorkspace = await client.query(`INSERT INTO workspaces (name, slug, owner_id) VALUES ('K COFFEE', 'k-coffee', $1) RETURNING id`, [userId]);
    const workspaceId = resWorkspace.rows[0].id;
    
    // Add columns
    const columns = [
      { name: 'Yet to Start', color: 'gray', position: 1 },
      { name: 'In Progress', color: 'blue', position: 2 },
      { name: 'Feedback', color: 'orange', position: 3 },
      { name: 'Completed', color: 'green', position: 4 }
    ];
    
    const colMap = {};
    for (const col of columns) {
      const resCol = await client.query(`INSERT INTO columns (workspace_id, name, color, position) VALUES ($1, $2, $3, $4) RETURNING id`, [workspaceId, col.name, col.color, col.position]);
      colMap[col.name] = resCol.rows[0].id;
    }
    
    // Import inventory
    const inventoryData = JSON.parse(fs.readFileSync(path.join(__dirname, '../Dev/src/data/inventory.json')));
    for (const item of inventoryData) {
      try {
        await client.query(`INSERT INTO assets (workspace_id, asset_code, name, condition, location, status, added_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [workspaceId, item.code || 'UNK_'+Math.random(), item.name || 'Unknown', item.condition, item.location, item.status.toLowerCase(), userId]
        );
      } catch (e) {
        console.error("Asset insert err:", item.code, e.message);
      }
    }
    
    // Import tasks
    const tasksData = JSON.parse(fs.readFileSync(path.join(__dirname, '../Dev/src/data/tasks.json')));
    for (const task of tasksData) {
      let status = 'todo';
      let columnId = colMap['Yet to Start'];
      
      if (task.status === 'Completed') {
        status = 'done';
        columnId = colMap['Completed'];
      } else if (task.status === 'In Progress') {
        status = 'in_progress';
        columnId = colMap['In Progress'];
      }
      
      try {
        await client.query(`INSERT INTO tasks (workspace_id, task_ref, title, status, column_id, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
          [workspaceId, task.id, task.title, status, columnId, userId]
        );
      } catch (e) {
        // ignore duplicate tasks
      }
    }
    
    console.log('Seed completed successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
seed();
