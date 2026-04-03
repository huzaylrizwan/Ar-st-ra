import { Pool } from "pg";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _applied_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    const migrationsDir = join(process.cwd(), "migrations");
    let files: string[];
    try {
      files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    } catch {
      console.log("No migrations directory found, skipping.");
      return;
    }

    for (const file of files) {
      const { rows } = await client.query(
        "SELECT 1 FROM _applied_migrations WHERE filename = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`  [skip] ${file} (already applied)`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`  [run]  ${file}`);
      await client.query(sql);
      await client.query(
        "INSERT INTO _applied_migrations (filename) VALUES ($1)",
        [file]
      );
      console.log(`  [ok]   ${file}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
