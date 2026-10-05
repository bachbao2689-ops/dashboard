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
  const { data: d2, error: e2 } = await supabase.from('users').select('id, department:department_id(id)').limit(1);
  console.log("users department_id:", JSON.stringify({error: e2}, null, 2));

  const { data: d3, error: e3 } = await supabase.from('users').select('id, departments(id)').limit(1);
  console.log("users departments table:", JSON.stringify({error: e3}, null, 2));
}
testQuery();
