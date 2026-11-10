import fs from "node:fs";
import { workflowDbClient } from './workflowDbClient.mjs';
const client = workflowDbClient(process.argv[2]);
try {
  await client.connect();
  await client.query(
    fs.readFileSync(
      new URL("../migrations/workflow-management-2.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log("Workflow Management 2 migration applied");
} finally {
  await client.end();
}
