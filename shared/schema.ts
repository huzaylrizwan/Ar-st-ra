export * from "./models/auth";
import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url").notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  arLink: text("ar_link").notNull(),
  colors: text("colors").array().notNull(), // e.g. ["#FF0000", "#0000FF"]
  sizes: text("sizes").array().notNull(),   // e.g. ["S", "M", "L"]
  images: text("images").array().notNull(), // array of image URLs
  isHidden: boolean("is_hidden").default(false).notNull(),
});

export const themeSettings = pgTable("theme_settings", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").default("Luxury Furniture").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#000000").notNull(),
  fontFamily: text("font_family").default("Inter").notNull(),
  // Extended settings
  activeThemePreset: text("active_theme_preset").default("gold"),
  heroImageUrl: text("hero_image_url"),
  // Contact settings
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  whatsappNumber: text("whatsapp_number"),
  address: text("address"),
  mapEmbedUrl: text("map_embed_url"),
  // Visibility toggles
  showBanner: boolean("show_banner").default(true),
  showCollections: boolean("show_collections").default(true),
  showNewArrivals: boolean("show_new_arrivals").default(true),
  showPhilosophy: boolean("show_philosophy").default(true),
  showARSection: boolean("show_ar_section").default(true),
});

// Promo Banners - multiple rotating banners
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// FAQ items
export const faqItems = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
});

// Hero images - preset and custom options
export const heroImages = pgTable("hero_images", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  isPreset: boolean("is_preset").default(false).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
});

// Product Material Variants
export const productMaterials = pgTable("product_materials", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  colorHex: text("color_hex").notNull(),
  textureUrl: text("texture_url"),
  variantModelUrl: text("variant_model_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

// Product Model Configurations (different GLB configs for same product)
export const productModels = pgTable("product_models", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  modelUrl: text("model_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  isDefault: boolean("is_default").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// Product Measurements
export const productMeasurements = pgTable("product_measurements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// Schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertThemeSettingsSchema = createInsertSchema(themeSettings).omit({ id: true });
export const insertBannerSchema = createInsertSchema(banners).omit({ id: true });
export const insertFaqItemSchema = createInsertSchema(faqItems).omit({ id: true });
export const insertHeroImageSchema = createInsertSchema(heroImages).omit({ id: true });
export const insertProductMaterialSchema = createInsertSchema(productMaterials).omit({ id: true });
export const insertProductModelSchema = createInsertSchema(productModels).omit({ id: true });
export const insertProductMeasurementSchema = createInsertSchema(productMeasurements).omit({ id: true });

// Types
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ThemeSettings = typeof themeSettings.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type FaqItem = typeof faqItems.$inferSelect;
export type HeroImage = typeof heroImages.$inferSelect;
export type ProductMaterial = typeof productMaterials.$inferSelect;
export type ProductModel = typeof productModels.$inferSelect;
export type ProductMeasurement = typeof productMeasurements.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertThemeSettings = z.infer<typeof insertThemeSettingsSchema>;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type InsertHeroImage = z.infer<typeof insertHeroImageSchema>;
export type InsertProductMaterial = z.infer<typeof insertProductMaterialSchema>;
export type InsertProductModel = z.infer<typeof insertProductModelSchema>;
export type InsertProductMeasurement = z.infer<typeof insertProductMeasurementSchema>;
