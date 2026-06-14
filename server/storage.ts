import {
  categories,
  products,
  themeSettings,
  banners,
  faqItems,
  heroImages,
  productMaterials,
  productModels,
  productMeasurements,
  supervisors,
  pageViews,
  inquiries,
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
  type ProductModel,
  type InsertProductModel,
  type ProductMeasurement,
  type InsertProductMeasurement,
  type Supervisor,
  type InsertSupervisor,
  type PageView,
  type InsertPageView,
  type Inquiry,
  type InsertInquiry,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, gt, countDistinct, isNull, and, lt, desc, sql, gte, like, inArray } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(includeHidden?: boolean): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Products
  getProducts(categoryId?: number, includeHidden?: boolean): Promise<Product[]>;
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
  getProductMaterials(productId: number, modelId?: number | null): Promise<ProductMaterial[]>;
  createProductMaterial(material: InsertProductMaterial): Promise<ProductMaterial>;
  updateProductMaterial(id: number, material: Partial<InsertProductMaterial>): Promise<ProductMaterial>;
  deleteProductMaterial(id: number): Promise<void>;

  // Product Models
  getProductModels(productId: number): Promise<ProductModel[]>;
  createProductModel(model: InsertProductModel): Promise<ProductModel>;
  updateProductModel(id: number, model: Partial<InsertProductModel>): Promise<ProductModel>;
  deleteProductModel(id: number): Promise<void>;

  // Product Measurements
  getProductMeasurements(productId: number): Promise<ProductMeasurement[]>;
  createProductMeasurement(measurement: InsertProductMeasurement): Promise<ProductMeasurement>;
  updateProductMeasurement(id: number, measurement: Partial<InsertProductMeasurement>): Promise<ProductMeasurement>;
  deleteProductMeasurement(id: number): Promise<void>;

  // Supervisors
  getSupervisors(): Promise<Supervisor[]>;
  getSupervisorByEmail(email: string): Promise<Supervisor | undefined>;
  createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor>;
  deleteSupervisor(id: number): Promise<void>;

  // Page Views
  recordPageView(view: InsertPageView): Promise<PageView>;
  getLiveVisitorCount(): Promise<number>;
  cleanupOldPageViews(): Promise<void>;

  // Inquiries
  createInquiry(data: InsertInquiry): Promise<Inquiry>;
  getInquiries(): Promise<Inquiry[]>;
  getUnreadInquiryCount(): Promise<number>;
  markInquiryRead(id: number): Promise<void>;
  deleteInquiry(id: number): Promise<void>;

  // Analytics
  getAnalyticsSummary(): Promise<{
    todayViews: number;
    last30Days: { date: string; views: number }[];
    topProducts: { path: string; views: number }[];
    topCategories: { path: string; views: number }[];
  }>;
  getCatalogHealth(): Promise<{
    productsNoArLink: number;
    productsHidden: number;
    productsNoImages: number;
    categoriesEmpty: number;
    productsOutOfStock: number;
  }>;

  // Reorder + bulk
  reorderProducts(items: { id: number; sortOrder: number }[]): Promise<void>;
  reorderCategories(items: { id: number; sortOrder: number }[]): Promise<void>;
  bulkUpdateProducts(ids: number[], action: "hide" | "show" | "delete"): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(includeHidden = false): Promise<Category[]> {
    if (includeHidden) return await db.select().from(categories);
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
  async getProducts(categoryId?: number, includeHidden = false): Promise<Product[]> {
    const conditions = [];
    if (!includeHidden) conditions.push(eq(products.isHidden, false));
    if (categoryId !== undefined) conditions.push(eq(products.categoryId, categoryId));

    let query = db.select().from(products);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.orderBy(asc(products.sortOrder));
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
  async getProductMaterials(productId: number, modelId?: number | null): Promise<ProductMaterial[]> {
    if (modelId !== undefined) {
      const condition = modelId === null
        ? and(eq(productMaterials.productId, productId), isNull(productMaterials.modelId))
        : and(eq(productMaterials.productId, productId), eq(productMaterials.modelId, modelId));
      return await db
        .select()
        .from(productMaterials)
        .where(condition)
        .orderBy(asc(productMaterials.sortOrder));
    }
    return await db
      .select()
      .from(productMaterials)
      .where(eq(productMaterials.productId, productId))
      .orderBy(asc(productMaterials.sortOrder));
  }

  async createProductMaterial(material: InsertProductMaterial): Promise<ProductMaterial> {
    // If this material is the new default, clear any existing defaults for the product
    if (material.isDefault) {
      await db
        .update(productMaterials)
        .set({ isDefault: false })
        .where(eq(productMaterials.productId, material.productId));
    }
    const [newMaterial] = await db.insert(productMaterials).values(material).returning();
    return newMaterial;
  }

  async updateProductMaterial(id: number, updates: Partial<InsertProductMaterial>): Promise<ProductMaterial> {
    // If marking as default, clear existing defaults for this product first
    if (updates.isDefault && updates.productId) {
      await db
        .update(productMaterials)
        .set({ isDefault: false })
        .where(eq(productMaterials.productId, updates.productId));
    } else if (updates.isDefault) {
      // productId not in updates — look it up from existing record
      const existing = await db
        .select({ productId: productMaterials.productId })
        .from(productMaterials)
        .where(eq(productMaterials.id, id))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(productMaterials)
          .set({ isDefault: false })
          .where(eq(productMaterials.productId, existing[0].productId));
      }
    }
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

  // Product Models
  async getProductModels(productId: number): Promise<ProductModel[]> {
    return await db
      .select()
      .from(productModels)
      .where(eq(productModels.productId, productId))
      .orderBy(asc(productModels.sortOrder));
  }

  async createProductModel(model: InsertProductModel): Promise<ProductModel> {
    if (model.isDefault) {
      await db
        .update(productModels)
        .set({ isDefault: false })
        .where(eq(productModels.productId, model.productId));
    }
    const [newModel] = await db.insert(productModels).values(model).returning();
    return newModel;
  }

  async updateProductModel(id: number, updates: Partial<InsertProductModel>): Promise<ProductModel> {
    if (updates.isDefault && updates.productId) {
      await db
        .update(productModels)
        .set({ isDefault: false })
        .where(eq(productModels.productId, updates.productId));
    } else if (updates.isDefault) {
      const existing = await db
        .select({ productId: productModels.productId })
        .from(productModels)
        .where(eq(productModels.id, id))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(productModels)
          .set({ isDefault: false })
          .where(eq(productModels.productId, existing[0].productId));
      }
    }
    const [model] = await db
      .update(productModels)
      .set(updates)
      .where(eq(productModels.id, id))
      .returning();
    return model;
  }

  async deleteProductModel(id: number): Promise<void> {
    await db.delete(productModels).where(eq(productModels.id, id));
  }

  // Product Measurements
  async getProductMeasurements(productId: number): Promise<ProductMeasurement[]> {
    return await db
      .select()
      .from(productMeasurements)
      .where(eq(productMeasurements.productId, productId))
      .orderBy(asc(productMeasurements.sortOrder));
  }

  async createProductMeasurement(measurement: InsertProductMeasurement): Promise<ProductMeasurement> {
    const [newMeasurement] = await db.insert(productMeasurements).values(measurement).returning();
    return newMeasurement;
  }

  async updateProductMeasurement(id: number, updates: Partial<InsertProductMeasurement>): Promise<ProductMeasurement> {
    const [measurement] = await db
      .update(productMeasurements)
      .set(updates)
      .where(eq(productMeasurements.id, id))
      .returning();
    return measurement;
  }

  async deleteProductMeasurement(id: number): Promise<void> {
    await db.delete(productMeasurements).where(eq(productMeasurements.id, id));
  }

  // Supervisors
  async getSupervisors(): Promise<Supervisor[]> {
    return await db.select().from(supervisors).orderBy(asc(supervisors.addedAt));
  }

  async getSupervisorByEmail(email: string): Promise<Supervisor | undefined> {
    const [supervisor] = await db.select().from(supervisors).where(eq(supervisors.email, email));
    return supervisor;
  }

  async createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor> {
    const [newSupervisor] = await db.insert(supervisors).values(supervisor).returning();
    return newSupervisor;
  }

  async deleteSupervisor(id: number): Promise<void> {
    await db.delete(supervisors).where(eq(supervisors.id, id));
  }

  // Page Views
  async recordPageView(view: InsertPageView): Promise<PageView> {
    const [newView] = await db.insert(pageViews).values(view).returning();
    return newView;
  }

  async getLiveVisitorCount(): Promise<number> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await db
      .select({ count: countDistinct(pageViews.sessionId) })
      .from(pageViews)
      .where(gt(pageViews.viewedAt, tenMinutesAgo));
    return result[0]?.count ?? 0;
  }

  async cleanupOldPageViews(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.delete(pageViews).where(lt(pageViews.viewedAt, cutoff));
  }

  // Inquiries
  async createInquiry(data: InsertInquiry): Promise<Inquiry> {
    const [inquiry] = await db.insert(inquiries).values(data).returning();
    return inquiry;
  }

  async getInquiries(): Promise<Inquiry[]> {
    return db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  }

  async getUnreadInquiryCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(eq(inquiries.isRead, false));
    return result[0]?.count ?? 0;
  }

  async markInquiryRead(id: number): Promise<void> {
    await db.update(inquiries).set({ isRead: true }).where(eq(inquiries.id, id));
  }

  async deleteInquiry(id: number): Promise<void> {
    await db.delete(inquiries).where(eq(inquiries.id, id));
  }

  async getAnalyticsSummary() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const todayResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(gte(pageViews.viewedAt, todayStart));

    const last30 = await db
      .select({
        date: sql<string>`DATE(viewed_at)::text`,
        views: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.viewedAt, thirtyDaysAgo))
      .groupBy(sql`DATE(viewed_at)`)
      .orderBy(sql`DATE(viewed_at)`);

    const topProducts = await db
      .select({
        path: pageViews.path,
        views: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .where(and(gte(pageViews.viewedAt, thirtyDaysAgo), like(pageViews.path, "/products/%")))
      .groupBy(pageViews.path)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    const topCategories = await db
      .select({
        path: pageViews.path,
        views: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .where(and(gte(pageViews.viewedAt, thirtyDaysAgo), like(pageViews.path, "/categories%")))
      .groupBy(pageViews.path)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    return {
      todayViews: todayResult[0]?.count ?? 0,
      last30Days: last30,
      topProducts,
      topCategories,
    };
  }

  async getCatalogHealth() {
    const [allProducts, allCategories] = await Promise.all([
      db.select().from(products),
      db.select().from(categories),
    ]);
    const allProductsByCat = allProducts.reduce((acc, p) => {
      if (p.categoryId) acc.add(p.categoryId);
      return acc;
    }, new Set<number>());

    return {
      productsNoArLink: allProducts.filter(p => !p.arLink).length,
      productsHidden: allProducts.filter(p => p.isHidden).length,
      productsNoImages: allProducts.filter(p => !p.images || p.images.length === 0).length,
      categoriesEmpty: allCategories.filter(c => !allProductsByCat.has(c.id)).length,
      productsOutOfStock: allProducts.filter(p => p.stockStatus === "out_of_stock").length,
    };
  }

  async reorderProducts(items: { id: number; sortOrder: number }[]): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        db.update(products).set({ sortOrder }).where(eq(products.id, id))
      )
    );
  }

  async reorderCategories(items: { id: number; sortOrder: number }[]): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        db.update(categories).set({ sortOrder }).where(eq(categories.id, id))
      )
    );
  }

  async bulkUpdateProducts(ids: number[], action: "hide" | "show" | "delete"): Promise<void> {
    if (ids.length === 0) return;
    if (action === "delete") {
      await db.delete(products).where(inArray(products.id, ids));
    } else {
      await db.update(products)
        .set({ isHidden: action === "hide" })
        .where(inArray(products.id, ids));
    }
  }
}

export const storage = new DatabaseStorage();
