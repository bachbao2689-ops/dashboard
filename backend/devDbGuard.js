const fs = require('node:fs');
const path = require('node:path');

// Compatibility entry point for legacy maintenance scripts: local only, no hosted fallback.
module.exports = function requireLocalDatabase(connectionString) {
  if (!connectionString) {
    const runtime = path.join(__dirname, '../.local-supabase/runtime.json');
    if (fs.existsSync(runtime)) connectionString = JSON.parse(fs.readFileSync(runtime, 'utf8')).env?.DB_URL;
  }
  let database;
  try { database = new URL(connectionString); } catch { /* Fail closed below. */ }
  if (!database || !['postgres:', 'postgresql:'].includes(database.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.search || database.hash) {
    throw new Error('Maintenance scripts require Supabase LOCAL on loopback. Cloud/Main/Develop URLs are blocked. Run npm run local:backend.');
  }
  return connectionString;
};
