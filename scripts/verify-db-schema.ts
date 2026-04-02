import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifySchema() {
  const client = await pool.connect();
  try {
    const tables = ["product_models", "product_measurements"];

    for (const table of tables) {
      const result = await client.query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      console.log(`\n${table} columns:`);
      result.rows.forEach((row) => {
        console.log(`  ${row.column_name} (${row.data_type})`);
      });
    }

    const modelUrlExists = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'product_models' AND column_name = 'model_url'`
    );
    const glbUrlExists = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'product_models' AND column_name = 'glb_url'`
    );

    console.log("\n--- Schema Verification ---");
    if (modelUrlExists.rowCount && modelUrlExists.rowCount > 0) {
      console.log("✓ product_models.model_url exists (correct)");
    } else {
      console.error("✗ product_models.model_url MISSING");
      process.exit(1);
    }
    if (glbUrlExists.rowCount && glbUrlExists.rowCount > 0) {
      console.error("✗ product_models.glb_url still exists (should be renamed)");
      process.exit(1);
    } else {
      console.log("✓ product_models.glb_url not present (correct)");
    }

    console.log("\nAll schema checks passed.");
  } finally {
    client.release();
    await pool.end();
  }
}

verifySchema().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
