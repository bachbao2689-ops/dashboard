import {notificationLink} from '../_shared/notificationLink.ts';
// Deployed with verify_jwt=false: drain uses a private webhook secret; test uses
// Supabase Auth.getUser and derives the recipient, never a client-supplied ID.
import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import webpush from 'npm:web-push@3.6.7';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const allowedEndpoint=(value:string)=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&( ['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(url.hostname)||/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname));}catch{return false;}};

Deno.serve(async request=>{
 const {data:cfg,error:configError}=await db.from('dashboard_push_config').select('*').eq('id',true).single();
 const origin=request.headers.get('origin');
 const headers={'Content-Type':'application/json','Cache-Control':'no-store',...(origin&&cfg?.allowed_origins?.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(configError||!cfg?.enabled)return reply(503,{error:'Push is not configured'});
 if(origin&&!cfg.allowed_origins.includes(origin))return reply(403,{error:'Origin not enabled'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply(405,{error:'POST required'});
 try{
  const body=await request.json();
  if(body.action==='test'){
   if(!origin)return reply(403,{error:'Origin required'});
   const jwt=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
   const {data:{user},error}=await db.auth.getUser(jwt);
   if(error||!user)return reply(401,{error:'Sign in required'});
   const {data:staff}=await db.from('users').select('id').eq('auth_id',user.id).eq('is_active',true).single();
   if(!staff)return reply(403,{error:'Staff account unavailable'});
   // Rate-limit test notifications to one per minute, across all devices.
   const {count,error:countError}=await db.from('notifications').select('id',{head:true,count:'exact'}).eq('user_id',staff.id).eq('type','push_test').gte('created_at',new Date(Date.now()-60000).toISOString());
   if(countError)throw countError;
   if(count)return reply(429,{error:'Vui lòng chờ một phút rồi thử lại.'});
   const {error:insertError}=await db.from('notifications').insert({user_id:staff.id,type:'push_test',entity_type:'profile',message:'Điện thoại đã kết nối thông báo K COFFEE. Bấm để mở Dashboard.'});
   if(insertError)throw insertError;
   return reply(200,{queued:true});
  }
  if(body.action!=='drain'||request.headers.get('x-push-secret')!==cfg.webhook_secret)return reply(401,{error:'Unauthorized'});
  webpush.setVapidDetails(cfg.subject,cfg.public_key,cfg.private_key);
  const {data:deliveries,error}=await db.rpc('claim_dashboard_push');if(error)throw error;
  let sent=0;
  // Bounded concurrency protects both the Edge runtime and push providers.
  for(let offset=0;offset<(deliveries||[]).length;offset+=5){
   await Promise.all(deliveries.slice(offset,offset+5).map(async (item:any)=>{
    let status=400;
    if(allowedEndpoint(item.subscription.endpoint)&&cfg.allowed_origins.includes(item.origin)){
     const notification=item.notification;
     try{
      const response=await webpush.sendNotification(item.subscription,JSON.stringify({title:'K COFFEE',body:String(notification.message||'Bạn có thông báo mới').slice(0,240),tag:`notification-${notification.id}`,notificationId:notification.id,url:notificationLink(notification.entity_type,notification.entity_id,notification.metadata)||'/my-tasks'}),{TTL:3600,urgency:'normal',timeout:10000});
      status=response.statusCode;sent++;
     }catch(error:any){status=Number(error.statusCode)||503;}
    }
    const {error:finishError}=await db.rpc('finish_dashboard_push',{p_id:item.id,p_status:status});
    if(finishError)console.error('Could not acknowledge push delivery',item.id);
   }));
  }
  return reply(200,{claimed:(deliveries||[]).length,sent});
 }catch{console.error('Push dispatch failed; pending deliveries will retry');return reply(500,{error:'Unable to process notifications'});}
});
