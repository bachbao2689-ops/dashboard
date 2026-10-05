const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1];
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1];
});
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const fields = 'id, auth_id, email, name, avatar_url, role, department_id, employment_level, job_title, department:department_id(name)';
  const { data, error } = await supabase.from('users').select(fields).eq('auth_id', '2b835757-ceb6-4b8b-896c-bfe89a3bea63');
  console.log("Query test result:", JSON.stringify({ data, error }, null, 2));
}
testQuery();
