import fs from 'node:fs';
import { workflowDbClient } from './workflowDbClient.mjs';
const client = workflowDbClient(process.argv[3]);
try {
  await client.connect();
  await client.query(fs.readFileSync(new URL(process.argv[2] || '../migrations/workflow-hub.sql', import.meta.url), 'utf8'));
  console.log('Workflow Hub database checks/migration completed');
} finally { await client.end(); }
