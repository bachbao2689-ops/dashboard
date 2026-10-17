import {createClient} from '@supabase/supabase-js';

const url=import.meta.env.VITE_OFFICIAL_VIEW_URL || '';
const key=import.meta.env.VITE_OFFICIAL_VIEW_KEY || '';

export const officialReadEnabled=Boolean(
  url.includes('jxrwphjriuqbpdpwpqcn.supabase.co') &&
  key.startsWith('sb_publishable_') &&
  !/^(dashboard-nu-tan-30\.vercel\.app)$/.test(window.location.hostname)
);

// The secondary client is intentionally limited to Auth and SELECT requests.
// Its session has a separate storage key and never enters the Dev app stores.
const readOnlyFetch:typeof fetch=(input,init)=>{
  const requestUrl=new URL(input instanceof Request?input.url:String(input));
  const method=(init?.method || (input instanceof Request?input.method:'GET')).toUpperCase();
  if(requestUrl.origin!==url) return Promise.reject(new Error('Official viewer rejected another origin.'));
  if(requestUrl.pathname.startsWith('/auth/v1/')) return fetch(input,init);
  if(requestUrl.pathname.startsWith('/rest/v1/') && (method==='GET'||method==='HEAD')) return fetch(input,init);
  return Promise.reject(new Error('Official viewer is read-only.'));
};

export const officialReadClient=officialReadEnabled?createClient(url,key,{
  auth:{storageKey:'kcoffee_official_view_session',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true},
  global:{fetch:readOnlyFetch},
}):null;
