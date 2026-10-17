// Local maintenance scripts must never write to the Official database.
module.exports = function requireDevDatabase(connectionString) {
  let database;
  try { database = new URL(connectionString); } catch { /* Missing or invalid URL. */ }
  const direct = database?.hostname === 'db.samuuyxxtocqmtujnnhe.supabase.co';
  const pooler = database?.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(database.username) === 'postgres.samuuyxxtocqmtujnnhe';
  if (!direct && !pooler) {
    throw new Error('Local backend scripts require Supabase Dev DATABASE_URL.');
  }
  return connectionString;
};
