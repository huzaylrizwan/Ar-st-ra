import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

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
    const categories = await storage.getCategories();
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
    const products = await storage.getProducts(categoryId);
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
    const product = await storage.createProduct(input);
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

  // Run seed
  seedDatabase().catch(console.error);

  return httpServer;
}
