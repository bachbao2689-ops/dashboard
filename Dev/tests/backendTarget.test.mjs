import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolveBackendMode, validateBackendTarget, MAIN_BACKEND_ORIGIN} from '../src/lib/backendTarget.ts';
import {workflowDbClient} from '../scripts/workflowDbClient.mjs';
const require=createRequire(import.meta.url);
const requireLocalDatabase=require('../../backend/devDbGuard.js');

test('dev, local production-mode build and LAN preview remain local',()=>{
  assert.equal(resolveBackendMode({}),'local');
  for(const host of ['localhost','127.0.0.1','[::1]','192.168.1.20','preview.example']) {
    for(const local of ['http://127.0.0.1:29130','http://localhost:29130','http://[::1]:29130'])
      assert.doesNotThrow(()=>validateBackendTarget(host,local,'local'));
    for(const cloud of [MAIN_BACKEND_ORIGIN,'https://samuuyxxtocqmtujnnhe.supabase.co'])
      assert.throws(()=>validateBackendTarget(host,cloud,'local'),/Local phải/);
  }
});
test('only Vercel Production/main can select the cloud build mode',()=>{
  assert.equal(resolveBackendMode({VERCEL:'1',VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'}),'main');
  for(const env of [
    {VERCEL:'1',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL:'1',VERCEL_ENV:'development',VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL:'1',VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'feature/test'},
    {VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL:'1',VERCEL_ENV:'production'},
  ]) assert.throws(()=>resolveBackendMode(env),/Chỉ Vercel Production/);
});
test('main accepts only its exact HTTPS origin and cannot run on localhost',()=>{
  assert.doesNotThrow(()=>validateBackendTarget('dashboard-bart-c8ff.vercel.app',MAIN_BACKEND_ORIGIN,'main'));
  for(const host of ['localhost','127.0.0.1','[::1]'])
    assert.throws(()=>validateBackendTarget(host,MAIN_BACKEND_ORIGIN,'main'),/Bản Main/);
  for(const url of ['https://samuuyxxtocqmtujnnhe.supabase.co','http://127.0.0.1:29130',MAIN_BACKEND_ORIGIN+':444','https://evil.test/?jxrwphjriuqbpdpwpqcn.supabase.co'])
    assert.throws(()=>validateBackendTarget('production.example',url,'main'));
});
test('malformed or credential-bearing origins fail before client initialization',()=>{
  for(const url of ['invalid','file:///tmp/db','javascript:alert(1)','http://localhost:29130/proxy','http://user:EXAMPLE_PASSWORD@localhost:29130','http://localhost:29130?host=cloud','http://localhost:29130#cloud'])
    assert.throws(()=>validateBackendTarget('localhost',url));
});
test('legacy maintenance rejects hosted DBs and query-string host overrides before connecting',()=>{
  for(const url of ['postgresql://user:EXAMPLE_PASSWORD@127.0.0.1:24627/postgres','postgres://user:EXAMPLE_PASSWORD@[::1]:24627/postgres'])
    assert.equal(requireLocalDatabase(url),url);
  for(const url of ['postgresql://user:EXAMPLE_PASSWORD@db.jxrwphjriuqbpdpwpqcn.supabase.co/postgres','postgresql://postgres.samuuyxxtocqmtujnnhe:EXAMPLE_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com/postgres','postgresql://user:EXAMPLE_PASSWORD@127.0.0.1/postgres?host=cloud.example','http://localhost/postgres'])
    assert.throws(()=>requireLocalDatabase(url),/LOCAL/);
});
test('all Workflow DB tests reject hosted overrides before constructing a connection',()=>{
  const saved=process.env.LOCAL_DATABASE_URL;
  try {
    for(const url of ['postgresql://user:EXAMPLE_PASSWORD@db.jxrwphjriuqbpdpwpqcn.supabase.co/postgres','postgresql://user:EXAMPLE_PASSWORD@127.0.0.1/postgres?host=cloud.example','http://localhost/postgres']) {
      process.env.LOCAL_DATABASE_URL=url;
      assert.throws(()=>workflowDbClient(),/loopback/);
    }
  } finally {
    if(saved===undefined) delete process.env.LOCAL_DATABASE_URL; else process.env.LOCAL_DATABASE_URL=saved;
  }
});
