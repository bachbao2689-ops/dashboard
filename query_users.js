import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jxrwphjriuqbpdpwpqcn.supabase.co', 'sb_publishable_azJfzhk-nzUYGWb23zAFiQ_KKRrYLMM');

async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(5);
  console.log("Users:", data);
  if (error) console.error(error);
}
check();
