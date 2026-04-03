-- Add model_id to product_materials (nullable FK → product_models)
ALTER TABLE product_materials
  ADD COLUMN IF NOT EXISTS model_id INTEGER REFERENCES product_models(id) ON DELETE SET NULL;

-- Add studio UI settings to theme_settings
ALTER TABLE theme_settings
  ADD COLUMN IF NOT EXISTS studio_sidebar_opacity REAL DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS studio_sidebar_color TEXT DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS studio_bottom_bar_opacity REAL DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS studio_bottom_bar_color TEXT DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '$';
