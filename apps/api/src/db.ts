import pg from "pg";
import { env } from "./config/env.js";

const { Pool } = pg;

export const db = new Pool({
  connectionString: env.DATABASE_URL
});

export async function checkDatabaseConnection(): Promise<void> {
  const client = await db.connect();

  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}
