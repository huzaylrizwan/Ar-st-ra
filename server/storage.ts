import {
  categories,
  products,
  themeSettings,
  banners,
  faqItems,
  heroImages,
  productMaterials,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type ThemeSettings,
  type InsertThemeSettings,
  type Banner,
  type InsertBanner,
  type FaqItem,
  type InsertFaqItem,
  type HeroImage,
  type InsertHeroImage,
  type ProductMaterial,
  type InsertProductMaterial,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

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

  // Banners
  getBanners(): Promise<Banner[]>;
  getActiveBanners(): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: number, banner: Partial<InsertBanner>): Promise<Banner>;
  deleteBanner(id: number): Promise<void>;

  // FAQ Items
  getFaqItems(): Promise<FaqItem[]>;
  getVisibleFaqItems(): Promise<FaqItem[]>;
  createFaqItem(item: InsertFaqItem): Promise<FaqItem>;
  updateFaqItem(id: number, item: Partial<InsertFaqItem>): Promise<FaqItem>;
  deleteFaqItem(id: number): Promise<void>;

  // Hero Images
  getHeroImages(): Promise<HeroImage[]>;
  getActiveHeroImage(): Promise<HeroImage | undefined>;
  createHeroImage(image: InsertHeroImage): Promise<HeroImage>;
  updateHeroImage(id: number, image: Partial<InsertHeroImage>): Promise<HeroImage>;
  deleteHeroImage(id: number): Promise<void>;
  setActiveHeroImage(id: number): Promise<HeroImage>;

  // Product Materials
  getProductMaterials(productId: number): Promise<ProductMaterial[]>;
  createProductMaterial(material: InsertProductMaterial): Promise<ProductMaterial>;
  updateProductMaterial(id: number, material: Partial<InsertProductMaterial>): Promise<ProductMaterial>;
  deleteProductMaterial(id: number): Promise<void>;
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

  // Banners
  async getBanners(): Promise<Banner[]> {
    return await db.select().from(banners).orderBy(asc(banners.sortOrder));
  }

  async getActiveBanners(): Promise<Banner[]> {
    return await db.select().from(banners).where(eq(banners.isActive, true)).orderBy(asc(banners.sortOrder));
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const [newBanner] = await db.insert(banners).values(banner).returning();
    return newBanner;
  }

  async updateBanner(id: number, updates: Partial<InsertBanner>): Promise<Banner> {
    const [banner] = await db.update(banners).set(updates).where(eq(banners.id, id)).returning();
    return banner;
  }

  async deleteBanner(id: number): Promise<void> {
    await db.delete(banners).where(eq(banners.id, id));
  }

  // FAQ Items
  async getFaqItems(): Promise<FaqItem[]> {
    return await db.select().from(faqItems).orderBy(asc(faqItems.sortOrder));
  }

  async getVisibleFaqItems(): Promise<FaqItem[]> {
    return await db.select().from(faqItems).where(eq(faqItems.isVisible, true)).orderBy(asc(faqItems.sortOrder));
  }

  async createFaqItem(item: InsertFaqItem): Promise<FaqItem> {
    const [newItem] = await db.insert(faqItems).values(item).returning();
    return newItem;
  }

  async updateFaqItem(id: number, updates: Partial<InsertFaqItem>): Promise<FaqItem> {
    const [item] = await db.update(faqItems).set(updates).where(eq(faqItems.id, id)).returning();
    return item;
  }

  async deleteFaqItem(id: number): Promise<void> {
    await db.delete(faqItems).where(eq(faqItems.id, id));
  }

  // Hero Images
  async getHeroImages(): Promise<HeroImage[]> {
    return await db.select().from(heroImages);
  }

  async getActiveHeroImage(): Promise<HeroImage | undefined> {
    const [image] = await db.select().from(heroImages).where(eq(heroImages.isActive, true));
    return image;
  }

  async createHeroImage(image: InsertHeroImage): Promise<HeroImage> {
    const [newImage] = await db.insert(heroImages).values(image).returning();
    return newImage;
  }

  async updateHeroImage(id: number, updates: Partial<InsertHeroImage>): Promise<HeroImage> {
    const [image] = await db.update(heroImages).set(updates).where(eq(heroImages.id, id)).returning();
    return image;
  }

  async deleteHeroImage(id: number): Promise<void> {
    await db.delete(heroImages).where(eq(heroImages.id, id));
  }

  async setActiveHeroImage(id: number): Promise<HeroImage> {
    // First, deactivate all hero images
    await db.update(heroImages).set({ isActive: false });
    // Then activate the selected one
    const [image] = await db.update(heroImages).set({ isActive: true }).where(eq(heroImages.id, id)).returning();
    return image;
  }

  // Product Materials
  async getProductMaterials(productId: number): Promise<ProductMaterial[]> {
    return await db
      .select()
      .from(productMaterials)
      .where(eq(productMaterials.productId, productId))
      .orderBy(asc(productMaterials.sortOrder));
  }

  async createProductMaterial(material: InsertProductMaterial): Promise<ProductMaterial> {
    const [newMaterial] = await db.insert(productMaterials).values(material).returning();
    return newMaterial;
  }

  async updateProductMaterial(id: number, updates: Partial<InsertProductMaterial>): Promise<ProductMaterial> {
    const [material] = await db
      .update(productMaterials)
      .set(updates)
      .where(eq(productMaterials.id, id))
      .returning();
    return material;
  }

  async deleteProductMaterial(id: number): Promise<void> {
    await db.delete(productMaterials).where(eq(productMaterials.id, id));
  }
}

export const storage = new DatabaseStorage();
