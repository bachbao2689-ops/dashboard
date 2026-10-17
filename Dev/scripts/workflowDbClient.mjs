import fs from 'node:fs';
import pg from 'pg';

export function workflowDbClient(envFile) {
  const file = envFile || new URL('../../backend/.env', import.meta.url);
  const line = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).find(x => x.startsWith('DATABASE_URL=')) : '';
  const connectionString = process.env.DATABASE_URL || line?.slice(13).replace(/^"|"$/g, '');
  if (!connectionString) throw new Error('Set DATABASE_URL or provide an environment file');
  let database;
  try { database = new URL(connectionString); } catch { /* Missing or invalid URL. */ }
  const direct = database?.hostname === 'db.samuuyxxtocqmtujnnhe.supabase.co';
  const pooler = database?.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(database.username) === 'postgres.samuuyxxtocqmtujnnhe';
  if (!direct && !pooler) throw new Error('Dev scripts require the Supabase Dev DATABASE_URL.');
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
}
