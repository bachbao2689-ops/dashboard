const { Client } = require('pg');
const connectionString = 'postgresql://postgres.jxrwphjriuqbpdpwpqcn:Bachbao1235@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function test() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log(res.rows.map(r => r.table_name));
  await client.end();
}
test();
