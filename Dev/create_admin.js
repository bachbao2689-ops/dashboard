import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jxrwphjriuqbpdpwpqcn.supabase.co',
  'sb_publishable_azJfzhk-nzUYGWb23zAFiQ_KKRrYLMM'
);

async function createAdmin() {
  console.log("Signing up admin@kcoffee.com...");
  let { data, error } = await supabase.auth.signUp({
    email: 'admin@kcoffee.com',
    password: 'admin123',
    options: {
      data: {
        full_name: 'Super Admin',
      }
    }
  });
  
  if (error) {
    console.error("Error creating admin:", error.message);
  } else {
    console.log("Admin created! User ID:", data.user?.id);
    console.log("Admin Session exists:", !!data.session);
  }

  console.log("Signing up bachbao2689@gmail.com...");
  let { data: data2, error: error2 } = await supabase.auth.signUp({
    email: 'bachbao2689@gmail.com',
    password: 'admin123',
  });
  if (error2) console.error("Error creating bachbao:", error2.message);
  else console.log("Bachbao created! User ID:", data2.user?.id);
}

createAdmin();
