const { Client } = require('pg');

const connectionString = 'postgresql://postgres.jxrwphjriuqbpdpwpqcn:Bachbao1235@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function migrate() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase via Pooler!');
    await client.end();
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
