import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const localHost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const developHost = typeof window !== 'undefined' && window.location.hostname === 'dashboard-git-codex-develop-dashboard-bart-c8ff.vercel.app';
const officialHost = typeof window !== 'undefined' && window.location.hostname === 'dashboard-nu-tan-30.vercel.app';
if ((localHost || developHost) && !supabaseUrl.includes('samuuyxxtocqmtujnnhe.supabase.co')) {
  throw new Error('Local/Develop phải kết nối Supabase Dev. Kiểm tra VITE_SUPABASE_URL.');
}
if (officialHost && !supabaseUrl.includes('jxrwphjriuqbpdpwpqcn.supabase.co')) {
  throw new Error('Official phải kết nối Supabase Main. Kiểm tra VITE_SUPABASE_URL.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
