const { Client } = require('pg');
require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });

const connectionString = require('./devDbGuard')(process.env.DATABASE_URL);
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Add it to backend/.env.');
}

async function test() {
  const client = new Client({ connectionString, ssl: false });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log(res.rows.map(r => r.table_name));
  await client.end();
}
test();
