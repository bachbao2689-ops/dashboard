import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const home=path.join(root,'.local-supabase'),runtimeFile=path.join(home,'runtime.json');
fs.mkdirSync(home,{recursive:true,mode:0o700});
const env={...process.env,SUPABASE_EXPERIMENTAL_STACK:'1'};
function cli(args){const run=spawnSync('npx',['--yes','supabase@3.0.0',...args,'--workdir',home,'--output-format','json'],{cwd:root,env,encoding:'utf8',maxBuffer:8*1024*1024});if(run.status!==0)throw Error('Không khởi động được Supabase local. '+(run.stderr||run.stdout).slice(0,500));const line=run.stdout.trim().split('\n').reverse().find(x=>x.startsWith('{'));return line?JSON.parse(line):null;}
if(!fs.existsSync(path.join(home,'supabase/config.toml')))cli(['init']);
let saved=fs.existsSync(runtimeFile)?JSON.parse(fs.readFileSync(runtimeFile,'utf8')):{};
const state=cli(['start','--runtime','native','--exclude','analytics,pooler',...(saved.id?['--stack-id',saved.id]:[])]);
const local=state.env||{};const target=new URL(local.API_URL);if(!['127.0.0.1','localhost'].includes(target.hostname))throw Error('Local backend phải dùng loopback.');
const dbTarget=new URL(local.DB_URL);if(!['postgres:','postgresql:'].includes(dbTarget.protocol)||!['127.0.0.1','localhost','[::1]'].includes(dbTarget.hostname)||dbTarget.search||dbTarget.hash)throw Error('DB local phải dùng PostgreSQL loopback.');
fs.writeFileSync(runtimeFile,JSON.stringify({id:state.id||state.identity?.id||saved.id,env:local},null,2),{mode:0o600});
const filename=path.join(root,'Dev/.env.local');let source=fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):'';
for(const [key,value] of Object.entries({VITE_SUPABASE_URL:local.API_URL,VITE_SUPABASE_ANON_KEY:local.ANON_KEY,VITE_OFFICIAL_VIEW_URL:'',VITE_OFFICIAL_VIEW_KEY:''})){
 const line=key+'='+value;const pattern=new RegExp('^'+key+'=.*$','m');source=pattern.test(source)?source.replace(pattern,line):source.trimEnd()+'\n'+line+'\n';
}
fs.writeFileSync(filename,source,{mode:0o600});
const backendFile=path.join(root,'backend/.env');
let backendSource=fs.existsSync(backendFile)?fs.readFileSync(backendFile,'utf8'):'';
const databaseLine='DATABASE_URL='+local.DB_URL;
backendSource=/^DATABASE_URL=.*$/m.test(backendSource)?backendSource.replace(/^DATABASE_URL=.*$/m,databaseLine):backendSource.trimEnd()+'\n'+databaseLine+'\n';
fs.writeFileSync(backendFile,backendSource,{mode:0o600});
await import('./local-realtime.mjs');
console.log('Supabase local: '+local.API_URL);console.log('Studio local: '+local.STUDIO_URL);console.log('Dữ liệu giữ nguyên trên máy; Main/Develop cloud không được sử dụng.');
