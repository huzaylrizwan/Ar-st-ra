-- Migration: Add AR Studio tab label/icon columns to theme_settings
-- Task #15: Two-tab sidebar with admin-configurable labels

ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS ar_studio_tab1_label TEXT DEFAULT 'Model';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS ar_studio_tab1_icon TEXT;
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS ar_studio_tab2_label TEXT DEFAULT 'Variants';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS ar_studio_tab2_icon TEXT;
