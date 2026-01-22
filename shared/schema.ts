export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
});

// Schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertThemeSettingsSchema = createInsertSchema(themeSettings).omit({ id: true });

// Types
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ThemeSettings = typeof themeSettings.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertThemeSettings = z.infer<typeof insertThemeSettingsSchema>;
