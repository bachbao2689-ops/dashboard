import fs from 'node:fs';
import pg from 'pg';

export function workflowDbClient(envFile) {
  const file = envFile || new URL('../../backend/.env', import.meta.url);
  const line = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).find(x => x.startsWith('DATABASE_URL=')) : '';
  const connectionString = process.env.DATABASE_URL || line?.slice(13).replace(/^"|"$/g, '');
  if (!connectionString) throw new Error('Set DATABASE_URL or provide an environment file');
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
}
