import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jxrwphjriuqbpdpwpqcn.supabase.co',
  'sb_publishable_azJfzhk-nzUYGWb23zAFiQ_KKRrYLMM'
);

async function testSignIn() {
  let { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@kcoffee.com',
    password: 'admin123'
  });
  
  if (error) {
    console.error("Sign in failed:", error.message);
  } else {
    console.log("Sign in successful!");
  }
}

testSignIn();
