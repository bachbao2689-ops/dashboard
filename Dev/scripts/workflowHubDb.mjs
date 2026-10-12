import fs from 'node:fs';
import pg from 'pg';
const line = fs.readFileSync(process.argv[3] || new URL('../../backend/.env', import.meta.url), 'utf8').split(/\r?\n/).find(x => x.startsWith('DATABASE_URL='));
if (!line) throw new Error('DATABASE_URL missing');
const client = new pg.Client({ connectionString: line.slice(13).replace(/^"|"$/g, ''), ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(fs.readFileSync(new URL(process.argv[2] || '../migrations/workflow-hub.sql', import.meta.url), 'utf8'));
  console.log('Workflow Hub database checks/migration completed');
} finally { await client.end(); }
