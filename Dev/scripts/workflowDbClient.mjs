import fs from 'node:fs';
import pg from 'pg';

export function workflowDbClient(envFile) {
  const runtime = new URL('../../.local-supabase/runtime.json', import.meta.url);
  const saved = fs.existsSync(runtime) ? JSON.parse(fs.readFileSync(runtime, 'utf8')) : {};
  const file = envFile;
  const line = file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).find(x => x.startsWith('DATABASE_URL=')) : '';
  const connectionString = process.env.LOCAL_DATABASE_URL || (file ? line?.slice(13).replace(/^"|"$/g, '') : saved.env?.DB_URL);
  if (!connectionString) throw new Error('Run npm run local:backend or provide a local DATABASE_URL.');
  let database;
  try { database = new URL(connectionString); } catch { /* Missing or invalid URL. */ }
  const local = database && ['postgres:', 'postgresql:'].includes(database.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) && !database.search && !database.hash;
  if (!local) throw new Error('Dev scripts require a loopback Supabase local DATABASE_URL.');
  return new pg.Client({ connectionString, ssl: false, connectionTimeoutMillis: 15000 });
}
