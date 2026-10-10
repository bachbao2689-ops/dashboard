import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jxrwphjriuqbpdpwpqcn.supabase.co', 'sb_publishable_azJfzhk-nzUYGWb23zAFiQ_KKRrYLMM');
async function check() {
  const { data } = await supabase.from('users').select('*').in('role', ['admin', 'manager']).limit(10);
  console.log("Admins:", data);
}
check();
