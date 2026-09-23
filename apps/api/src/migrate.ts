import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(currentDir, "../../../db/migrations");

async function migrate(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const existing = await db.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file]
    );

    if (existing.rowCount) {
      continue;
    }

    const sql = await readFile(
      resolve(migrationsDir, file),
      "utf-8"
    );

    const client = await db.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");

      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  await db.end();
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
