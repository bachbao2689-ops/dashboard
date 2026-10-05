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
  const { error: e2 } = await supabase.from('borrow_requests').select('id, department:department_id(id)').limit(1);
  console.log("br department_id:", JSON.stringify({error: e2}, null, 2));
}
testQuery();
