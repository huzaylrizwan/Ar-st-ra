ALTER TABLE "product_materials" ADD COLUMN IF NOT EXISTS "model_id" integer REFERENCES "product_models"("id") ON DELETE CASCADE;
