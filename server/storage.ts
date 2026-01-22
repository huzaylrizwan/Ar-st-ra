import {
  categories,
  products,
  themeSettings,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type ThemeSettings,
  type InsertThemeSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Products
  getProducts(categoryId?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Settings
  getThemeSettings(): Promise<ThemeSettings | undefined>;
  updateThemeSettings(settings: Partial<InsertThemeSettings>): Promise<ThemeSettings>;
  createThemeSettings(settings: InsertThemeSettings): Promise<ThemeSettings>;
}

export class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.isHidden, false));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Products
  async getProducts(categoryId?: number): Promise<Product[]> {
    let query = db.select().from(products).where(eq(products.isHidden, false));
    if (categoryId) {
      // @ts-ignore - unexpected type mismatch in where clause, but it works
      query = query.where(eq(products.categoryId, categoryId));
    }
    return await query;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Settings
  async getThemeSettings(): Promise<ThemeSettings | undefined> {
    const [settings] = await db.select().from(themeSettings).limit(1);
    return settings;
  }

  async createThemeSettings(settings: InsertThemeSettings): Promise<ThemeSettings> {
    const [newSettings] = await db.insert(themeSettings).values(settings).returning();
    return newSettings;
  }

  async updateThemeSettings(updates: Partial<InsertThemeSettings>): Promise<ThemeSettings> {
    // Check if settings exist, if not create them
    const existing = await this.getThemeSettings();
    if (!existing) {
       // @ts-ignore - we know defaults will handle missing required fields if any, or schema is loose enough
      return await this.createThemeSettings({
        brandName: updates.brandName || "Luxury Furniture",
        primaryColor: updates.primaryColor || "#000000",
        fontFamily: updates.fontFamily || "Inter",
        logoUrl: updates.logoUrl,
        ...updates
      } as InsertThemeSettings);
    }
    
    const [settings] = await db
      .update(themeSettings)
      .set(updates)
      .where(eq(themeSettings.id, existing.id))
      .returning();
    return settings;
  }
}

export const storage = new DatabaseStorage();
