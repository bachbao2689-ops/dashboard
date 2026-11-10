import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from '../backend/node_modules/pg/lib/index.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'.local-supabase/runtime.json'))).env;
const dbTarget=new URL(config.DB_URL);
if(!['postgres:','postgresql:'].includes(dbTarget.protocol)||!['127.0.0.1','localhost','[::1]'].includes(dbTarget.hostname)||dbTarget.search||dbTarget.hash)throw Error('Realtime bootstrap chỉ chạy trên local.');
// Same business sources watched by workspaceResources and the notification/asset hooks.
// Do not publish Auth, keys, subscriptions, or push configuration.
const tables=['tasks','project_subtasks','campaign_subtasks','projects','campaigns','project_members','campaign_members','workflow_tracks','workflow_phases','workflow_phase_members','comments','project_comments','activity_log','notifications','borrow_requests','assets','users','departments'];
const db=new pg.Client({connectionString:config.DB_URL,ssl:false});await db.connect();
try{
 await db.query('begin');
 await db.query("do $$ begin if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if; end $$");
 for(const table of tables){
  const {rows}=await db.query("select exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=$1) present, to_regclass('public.'||quote_ident($1)) is not null available",[table]);
  if(rows[0].available&&!rows[0].present)await db.query('alter publication supabase_realtime add table public."'+table+'"');
 }
 await db.query('commit');
 console.log('Đã kiểm tra nguồn Realtime local; giữ nguyên RLS hiện có.');
}catch(error){await db.query('rollback');throw error;}finally{await db.end();}
