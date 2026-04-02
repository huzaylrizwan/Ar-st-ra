-- Migration: Rename product_models.glb_url to model_url
-- Reason: shared/schema.ts declares modelUrl as text("model_url") but the column
--         was originally created as glb_url by Task #7. This rename aligns the
--         live DB column with the Drizzle ORM schema expectation.
--
-- Safe to run multiple times (idempotent via DO block).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_models' AND column_name = 'glb_url'
  ) THEN
    ALTER TABLE product_models RENAME COLUMN glb_url TO model_url;
    RAISE NOTICE 'Renamed product_models.glb_url to model_url';
  ELSE
    RAISE NOTICE 'Column product_models.glb_url not found — skipping (already renamed or does not exist)';
  END IF;
END $$;
