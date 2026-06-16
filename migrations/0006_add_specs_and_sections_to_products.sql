ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "specs" json;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sections" json;
