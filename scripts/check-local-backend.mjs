import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {loadEnv} from '../Dev/node_modules/vite/dist/node/index.js';
import pg from '../backend/node_modules/pg/lib/index.js';
import {validateBackendTarget} from '../Dev/src/lib/backendTarget.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=JSON.parse(fs.readFileSync(path.join(root,'.local-supabase/runtime.json'),'utf8')).env;
validateBackendTarget('localhost',runtime.API_URL,'local');
const dbUrl=new URL(runtime.DB_URL);
if(!['postgres:','postgresql:'].includes(dbUrl.protocol)||!['127.0.0.1','localhost','[::1]'].includes(dbUrl.hostname)||dbUrl.search||dbUrl.hash)
  throw Error('Health check only connects to a loopback local database.');
for(const mode of ['development','production']) {
  const env=loadEnv(mode,path.join(root,'Dev'),'');
  validateBackendTarget('localhost',env.VITE_SUPABASE_URL,'local');
  if(env.VITE_SUPABASE_URL!==runtime.API_URL||env.VITE_SUPABASE_ANON_KEY!==runtime.ANON_KEY||env.VITE_OFFICIAL_VIEW_URL||env.VITE_OFFICIAL_VIEW_KEY)
    throw Error('Frontend env does not match the private local runtime. Run npm run local:backend.');
}
const legacy=parseEnv(fs.readFileSync(path.join(root,'backend/.env'),'utf8'));
if(legacy.DATABASE_URL!==runtime.DB_URL) throw Error('Legacy backend env does not match local runtime.');
const health=await fetch(runtime.API_URL+'/auth/v1/health',{headers:{apikey:runtime.ANON_KEY},signal:AbortSignal.timeout(5000)});
if(!health.ok) throw Error('Local Auth health failed: '+health.status);
const rest=await fetch(runtime.API_URL+'/rest/v1/departments?select=id&limit=0',{headers:{apikey:runtime.ANON_KEY,Authorization:'Bearer '+runtime.ANON_KEY},signal:AbortSignal.timeout(5000)});
if(!rest.ok) throw Error('Local REST health failed: '+rest.status);
const db=new pg.Client({connectionString:runtime.DB_URL,ssl:false,connectionTimeoutMillis:5000});
try {
  await db.connect();
  const {rows:[state]}=await db.query("select to_regclass('public.tasks') is not null tasks, to_regclass('auth.users') is not null auth");
  if(!state.tasks||!state.auth) throw Error('Local schema missing; do not fall back to cloud.');
} finally {await db.end();}
console.log('PASS: dev/build config, legacy scripts, Auth, REST and database schema use LOCAL only. No cloud request made.');
