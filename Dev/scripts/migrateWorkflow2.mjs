import fs from "node:fs";
import pg from "pg";
const line = fs
  .readFileSync(
    process.argv[2] || new URL("../../backend/.env", import.meta.url),
    "utf8",
  )
  .split(/\r?\n/)
  .find((x) => x.startsWith("DATABASE_URL="));
if (!line) throw new Error("DATABASE_URL missing");
const client = new pg.Client({
  connectionString: line.slice(13).replace(/^"|"$/g, ""),
  ssl: { rejectUnauthorized: false },
});
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
