import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { setupAuth, registerAuthRoutes } from "./auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage/routes";
import { insertProductMaterialSchema, insertProductModelSchema, insertProductMeasurementSchema, insertSupervisorSchema } from "@shared/schema";
import type { Request, Response, NextFunction } from "express";

// Seed function
async function seedDatabase() {
  const existingSettings = await storage.getThemeSettings();
  if (!existingSettings) {
    await storage.createThemeSettings({
      brandName: "Luxe Interiors",
      primaryColor: "#d4af37", // Gold
      fontFamily: "Playfair Display",
      logoUrl: "",
    });
  }

  const categories = await storage.getCategories();
  if (categories.length === 0) {
    const sofa = await storage.createCategory({
      name: "Sofas",
      slug: "sofas",
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80",
      isHidden: false
    });
    
    const lighting = await storage.createCategory({
      name: "Lighting",
      slug: "lighting",
      imageUrl: "https://images.unsplash.com/photo-1513506003013-d803a1d6e241?auto=format&fit=crop&q=80",
      isHidden: false
    });

    const bedroom = await storage.createCategory({
      name: "Bedroom",
      slug: "bedroom",
      imageUrl: "https://images.unsplash.com/photo-1505693415957-43599999940b?auto=format&fit=crop&q=80",
      isHidden: false
    });

    // Sample Products
    await storage.createProduct({
      categoryId: sofa.id,
      name: "The Cloud Sofa",
      description: "Experience floating on a cloud with our premium velvet sofa.",
      price: 249900,
      arLink: "https://modelviewer.dev/shared-assets/models/Astronaut.glb", // Sample AR model
      colors: ["#2d2d2d", "#f0f0f0", "#1a3c34"],
      sizes: ["2-Seater", "3-Seater", "L-Shape"],
      images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80"],
      isHidden: false
    });

    await storage.createProduct({
      categoryId: lighting.id,
      name: "Marble Base Lamp",
      description: "Elegant marble base lamp with brass accents.",
      price: 49900,
      arLink: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
      colors: ["#ffffff", "#000000"],
      sizes: ["Standard"],
      images: ["https://images.unsplash.com/photo-1513506003013-d803a1d6e241?auto=format&fit=crop&q=80"],
      isHidden: false
    });

    await storage.createProduct({
      categoryId: bedroom.id,
      name: "Royal Velvet Bed",
      description: "A bed fit for royalty, featuring deep-tufted velvet upholstery and a majestic headboard.",
      price: 389900,
      arLink: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
      colors: ["#000080", "#4b0082", "#000000"],
      sizes: ["King", "Queen"],
      images: ["https://images.unsplash.com/photo-1505693415957-43599999940b?auto=format&fit=crop&q=80"],
      isHidden: false
    });
  }

  // Seed Banners
  const existingBanners = await storage.getBanners();
  if (existingBanners.length === 0) {
    await storage.createBanner({
      text: "Complimentary White Glove Delivery on Orders Over $5,000",
      isActive: true,
      sortOrder: 0
    });
  }

  // Seed Hero Images
  const existingHeroImages = await storage.getHeroImages();
  if (existingHeroImages.length === 0) {
    const presetHeroImages = [
      { url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1920", name: "Modern Living Room", isPreset: true, isActive: true },
      { url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1920", name: "Elegant Interior", isPreset: true, isActive: false },
      { url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1920", name: "Minimalist Space", isPreset: true, isActive: false },
      { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1920", name: "Luxury Bedroom", isPreset: true, isActive: false },
      { url: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&q=80&w=1920", name: "Contemporary Design", isPreset: true, isActive: false },
      { url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1920", name: "Cozy Living Space", isPreset: true, isActive: false }
    ];
    for (const image of presetHeroImages) {
      await storage.createHeroImage(image);
    }
  }

  // Seed FAQ Items
  const existingFaqItems = await storage.getFaqItems();
  if (existingFaqItems.length === 0) {
    const faqData = [
      { question: "What is your delivery policy?", answer: "We offer complimentary white glove delivery on orders over $5,000. Standard delivery is available for all other orders with fees calculated at checkout based on your location.", sortOrder: 0, isVisible: true },
      { question: "Do you offer customization options?", answer: "Yes, many of our pieces can be customized in terms of fabric, finish, and dimensions. Please contact our design team for more information on customization options.", sortOrder: 1, isVisible: true },
      { question: "What is your return policy?", answer: "We accept returns within 30 days of delivery for items in their original condition. Custom orders are final sale. Please contact our customer service team to initiate a return.", sortOrder: 2, isVisible: true },
      { question: "Do you ship internationally?", answer: "Yes, we ship to select international destinations. Shipping fees and delivery times vary by location. Please contact us for a quote on international shipping.", sortOrder: 3, isVisible: true },
      { question: "How can I use the AR feature?", answer: "Our AR (Augmented Reality) feature allows you to visualize furniture in your space using your smartphone or tablet. Simply click the 'View in AR' button on any product page to get started.", sortOrder: 4, isVisible: true }
    ];
    for (const faq of faqData) {
      await storage.createFaqItem(faq);
    }
  }
}

// Supervisor middleware
async function requireSupervisor(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(403);
  const user = req.user as any;
  const email = user?.email;
  if (!email) return res.sendStatus(403);
  const supervisor = await storage.getSupervisorByEmail(email);
  if (!supervisor) return res.sendStatus(403);
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Integrations
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);

  // Settings
  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getThemeSettings();
    res.json(settings || {});
  });

  app.put(api.settings.update.path, async (req, res) => {
    // Check auth
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const input = api.settings.update.input.parse(req.body);
    const settings = await storage.updateThemeSettings(input);
    res.json(settings);
  });

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories(req.isAuthenticated());
    res.json(categories);
  });

  app.get(api.categories.get.path, async (req, res) => {
    const category = await storage.getCategory(Number(req.params.id));
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  });

  app.post(api.categories.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.categories.create.input.parse(req.body);
    const category = await storage.createCategory(input);
    res.status(201).json(category);
  });

  app.put(api.categories.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.categories.update.input.parse(req.body);
    const category = await storage.updateCategory(Number(req.params.id), input);
    res.json(category);
  });

  app.delete(api.categories.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteCategory(Number(req.params.id));
    res.sendStatus(204);
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const products = await storage.getProducts(categoryId, req.isAuthenticated());
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.products.create.input.parse(req.body);
    const product = await storage.createProduct({
      ...input,
      categoryId: input.categoryId || 0,
      images: input.images || []
    });
    res.status(201).json(product);
  });

  app.put(api.products.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.products.update.input.parse(req.body);
    const product = await storage.updateProduct(Number(req.params.id), input);
    res.json(product);
  });

  app.delete(api.products.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteProduct(Number(req.params.id));
    res.sendStatus(204);
  });

  // Banners
  app.get(api.banners.list.path, async (req, res) => {
    const banners = await storage.getBanners();
    res.json(banners);
  });

  app.get(api.banners.active.path, async (req, res) => {
    const banners = await storage.getActiveBanners();
    res.json(banners);
  });

  app.post(api.banners.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.banners.create.input.parse(req.body);
    const banner = await storage.createBanner(input);
    res.status(201).json(banner);
  });

  app.put(api.banners.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.banners.update.input.parse(req.body);
    const banner = await storage.updateBanner(Number(req.params.id), input);
    res.json(banner);
  });

  app.delete(api.banners.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteBanner(Number(req.params.id));
    res.sendStatus(204);
  });

  // FAQ Items
  app.get(api.faq.list.path, async (req, res) => {
    const items = await storage.getFaqItems();
    res.json(items);
  });

  app.get(api.faq.visible.path, async (req, res) => {
    const items = await storage.getVisibleFaqItems();
    res.json(items);
  });

  app.post(api.faq.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.faq.create.input.parse(req.body);
    const item = await storage.createFaqItem(input);
    res.status(201).json(item);
  });

  app.put(api.faq.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.faq.update.input.parse(req.body);
    const item = await storage.updateFaqItem(Number(req.params.id), input);
    res.json(item);
  });

  app.delete(api.faq.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteFaqItem(Number(req.params.id));
    res.sendStatus(204);
  });

  // Hero Images
  app.get(api.heroImages.list.path, async (req, res) => {
    const images = await storage.getHeroImages();
    res.json(images);
  });

  app.get(api.heroImages.active.path, async (req, res) => {
    const image = await storage.getActiveHeroImage();
    res.json(image || null);
  });

  app.post(api.heroImages.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.heroImages.create.input.parse(req.body);
    const image = await storage.createHeroImage(input);
    res.status(201).json(image);
  });

  app.put(api.heroImages.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.heroImages.update.input.parse(req.body);
    const image = await storage.updateHeroImage(Number(req.params.id), input);
    res.json(image);
  });

  app.delete(api.heroImages.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteHeroImage(Number(req.params.id));
    res.sendStatus(204);
  });

  app.put(api.heroImages.activate.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const image = await storage.setActiveHeroImage(Number(req.params.id));
    res.json(image);
  });

  // Product Materials (flat — supports optional ?modelId= filter)
  app.get("/api/products/:id/materials", async (req, res) => {
    const productId = Number(req.params.id);
    const modelIdParam = req.query.modelId;
    let modelId: number | null | undefined;
    if (modelIdParam === "null") {
      modelId = null;
    } else if (modelIdParam !== undefined) {
      modelId = Number(modelIdParam);
    }
    const materials = await storage.getProductMaterials(productId, modelId);
    res.json(materials);
  });

  app.post("/api/products/:id/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = insertProductMaterialSchema.parse({
      ...req.body,
      productId: Number(req.params.id),
    });
    const material = await storage.createProductMaterial(input);
    res.status(201).json(material);
  });

  app.put("/api/products/materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = insertProductMaterialSchema.partial().parse(req.body);
    const material = await storage.updateProductMaterial(Number(req.params.id), input);
    res.json(material);
  });

  app.delete("/api/products/materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteProductMaterial(Number(req.params.id));
    res.sendStatus(204);
  });

  // Nested material routes under a specific model
  app.get("/api/products/:id/models/:modelId/materials", async (req, res) => {
    const productId = Number(req.params.id);
    const modelId = Number(req.params.modelId);
    const materials = await storage.getProductMaterials(productId, modelId);
    res.json(materials);
  });

  app.post("/api/products/:id/models/:modelId/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = insertProductMaterialSchema.parse({
      ...req.body,
      productId: Number(req.params.id),
      modelId: Number(req.params.modelId),
    });
    const material = await storage.createProductMaterial(input);
    res.status(201).json(material);
  });

  app.put("/api/products/:id/models/:modelId/materials/:materialId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const productId = Number(req.params.id);
    const modelId = Number(req.params.modelId);
    const materialId = Number(req.params.materialId);
    // Verify the material belongs to this product + model
    const existing = await storage.getProductMaterials(productId, modelId);
    if (!existing.find(m => m.id === materialId)) {
      return res.status(404).json({ message: "Material not found for this model" });
    }
    // Strip ownership fields from body to prevent rebinding
    const { productId: _pid, modelId: _mid, ...rest } = req.body;
    const input = insertProductMaterialSchema.partial().parse(rest);
    const material = await storage.updateProductMaterial(materialId, input);
    res.json(material);
  });

  app.delete("/api/products/:id/models/:modelId/materials/:materialId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const productId = Number(req.params.id);
    const modelId = Number(req.params.modelId);
    const materialId = Number(req.params.materialId);
    // Verify the material belongs to this product + model
    const existing = await storage.getProductMaterials(productId, modelId);
    if (!existing.find(m => m.id === materialId)) {
      return res.status(404).json({ message: "Material not found for this model" });
    }
    await storage.deleteProductMaterial(materialId);
    res.sendStatus(204);
  });

  // Product Models
  app.get("/api/products/:id/models", async (req, res) => {
    const models = await storage.getProductModels(Number(req.params.id));
    res.json(models);
  });

  app.post("/api/products/:id/models", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = insertProductModelSchema.parse({
      ...req.body,
      productId: Number(req.params.id),
    });
    const model = await storage.createProductModel(input);
    res.status(201).json(model);
  });

  app.put("/api/products/models/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = insertProductModelSchema.partial().parse(req.body);
    const model = await storage.updateProductModel(Number(req.params.id), input);
    res.json(model);
  });

  app.delete("/api/products/models/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteProductModel(Number(req.params.id));
    res.sendStatus(204);
  });

  // Product Measurements
  app.get("/api/products/:id/measurements", async (req, res) => {
    const measurements = await storage.getProductMeasurements(Number(req.params.id));
    res.json(measurements);
  });

  app.post("/api/products/:id/measurements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = insertProductMeasurementSchema.parse({
      ...req.body,
      productId: Number(req.params.id),
    });
    const measurement = await storage.createProductMeasurement(input);
    res.status(201).json(measurement);
  });

  app.put("/api/products/measurements/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = insertProductMeasurementSchema.partial().parse(req.body);
    const measurement = await storage.updateProductMeasurement(Number(req.params.id), input);
    res.json(measurement);
  });

  app.delete("/api/products/measurements/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteProductMeasurement(Number(req.params.id));
    res.sendStatus(204);
  });

  // Supervisor management (admin only)
  app.get("/api/supervisors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const supervisorList = await storage.getSupervisors();
    res.json(supervisorList);
  });

  app.post("/api/supervisors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const body = z.object({
      email: z.string().email(),
      name: z.string().optional().nullable(),
      password: z.string().min(6).optional(),
    }).parse(req.body);
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined;
    const supervisor = await storage.createSupervisor({
      email: body.email,
      name: body.name ?? null,
      passwordHash: passwordHash ?? null,
    });
    res.status(201).json(supervisor);
  });

  app.delete("/api/supervisors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteSupervisor(Number(req.params.id));
    res.sendStatus(204);
  });

  // Supervisor portal routes
  app.get("/api/supervisor/contact", requireSupervisor, async (req, res) => {
    const settings = await storage.getThemeSettings();
    res.json(settings || {});
  });

  app.put("/api/supervisor/contact", requireSupervisor, async (req, res) => {
    const contactSchema = z.object({
      whatsappNumber: z.string().optional().nullable(),
      instagramUrl: z.string().optional().nullable(),
      facebookUrl: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      mapEmbedUrl: z.string().optional().nullable(),
    });
    const input = contactSchema.parse(req.body);
    const settings = await storage.updateThemeSettings(input);
    res.json(settings);
  });

  app.get("/api/supervisor/products", requireSupervisor, async (req, res) => {
    const productList = await storage.getProducts();
    res.json(productList);
  });

  app.post("/api/supervisor/products", requireSupervisor, async (req, res) => {
    const input = z.object({
      name: z.string(),
      description: z.string(),
      price: z.number(),
      categoryId: z.number(),
      arLink: z.string().default(""),
      colors: z.array(z.string()).default([]),
      sizes: z.array(z.string()).default([]),
      images: z.array(z.string()).default([]),
      isHidden: z.boolean().default(false),
    }).parse(req.body);
    const product = await storage.createProduct(input);
    res.status(201).json(product);
  });

  app.put("/api/supervisor/products/:id", requireSupervisor, async (req, res) => {
    const input = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      categoryId: z.number().optional(),
      arLink: z.string().optional(),
      colors: z.array(z.string()).optional(),
      sizes: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      isHidden: z.boolean().optional(),
    }).parse(req.body);
    const product = await storage.updateProduct(Number(req.params.id), input);
    res.json(product);
  });

  // Page view tracking (public)
  app.post("/api/page-view", async (req, res) => {
    const input = z.object({
      sessionId: z.string(),
      path: z.string(),
    }).parse(req.body);
    await storage.recordPageView(input);
    res.sendStatus(204);
  });

  // Live visitor analytics (supervisor)
  app.get("/api/analytics/live-visitors", requireSupervisor, async (req, res) => {
    const count = await storage.getLiveVisitorCount();
    res.json({ count });
  });

  // Check if current user is a supervisor (for frontend auth guard)
  app.get("/api/supervisor/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ isSupervisor: false });
    const user = req.user as any;
    const email = user?.claims?.email || user?.email;
    if (!email) return res.json({ isSupervisor: false });
    const supervisor = await storage.getSupervisorByEmail(email);
    res.json({ isSupervisor: !!supervisor });
  });

  // Run seed
  seedDatabase().catch(console.error);

  return httpServer;
}
