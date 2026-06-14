import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Environment stubs — must come before any server module is imported so that
// config.ts / db.ts do not throw on missing env vars.
// ---------------------------------------------------------------------------
process.env.DATABASE_URL = "postgres://mock:mock@localhost:5432/mock";
process.env.SESSION_SECRET = "mock-session-secret-at-least-32-chars-long!!";
process.env.NODE_ENV = "test";

// ---------------------------------------------------------------------------
// vi.hoisted: declare mockStorage before vi.mock factories run (hoisting fix)
// ---------------------------------------------------------------------------
const mockStorage = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getCategories: vi.fn().mockResolvedValue([]),
  getCategory: vi.fn(),
  createCategory: vi.fn().mockResolvedValue({ id: 1, name: "Test", slug: "test", isHidden: false, imageUrl: "" }),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getThemeSettings: vi.fn().mockResolvedValue(null),
  createThemeSettings: vi.fn().mockResolvedValue({}),
  updateThemeSettings: vi.fn(),
  getBanners: vi.fn().mockResolvedValue([]),
  getActiveBanners: vi.fn().mockResolvedValue([]),
  createBanner: vi.fn().mockResolvedValue({}),
  updateBanner: vi.fn(),
  deleteBanner: vi.fn(),
  getFaqItems: vi.fn().mockResolvedValue([]),
  getVisibleFaqItems: vi.fn().mockResolvedValue([]),
  createFaqItem: vi.fn().mockResolvedValue({}),
  updateFaqItem: vi.fn(),
  deleteFaqItem: vi.fn(),
  getHeroImages: vi.fn().mockResolvedValue([]),
  getHeroImage: vi.fn(),
  getActiveHeroImage: vi.fn().mockResolvedValue(null),
  getActiveHeroImages: vi.fn().mockResolvedValue([]),
  createHeroImage: vi.fn().mockResolvedValue({}),
  updateHeroImage: vi.fn(),
  deleteHeroImage: vi.fn(),
  setActiveHeroImage: vi.fn(),
  getProductMaterials: vi.fn().mockResolvedValue([]),
  createProductMaterial: vi.fn(),
  updateProductMaterial: vi.fn(),
  deleteProductMaterial: vi.fn(),
  getProductModels: vi.fn().mockResolvedValue([]),
  createProductModel: vi.fn(),
  updateProductModel: vi.fn(),
  deleteProductModel: vi.fn(),
  getProductMeasurements: vi.fn().mockResolvedValue([]),
  createProductMeasurement: vi.fn(),
  updateProductMeasurement: vi.fn(),
  deleteProductMeasurement: vi.fn(),
  getSupervisors: vi.fn().mockResolvedValue([]),
  getSupervisorByEmail: vi.fn().mockResolvedValue(null),
  createSupervisor: vi.fn(),
  deleteSupervisor: vi.fn(),
  recordPageView: vi.fn(),
  getLiveVisitorCount: vi.fn().mockResolvedValue(0),
  createInquiry: vi.fn(),
  getInquiries: vi.fn().mockResolvedValue([]),
  getUnreadInquiryCount: vi.fn().mockResolvedValue(0),
  markInquiryRead: vi.fn(),
  deleteInquiry: vi.fn(),
  getAnalyticsSummary: vi.fn().mockResolvedValue({}),
  getCatalogHealth: vi.fn().mockResolvedValue({}),
  reorderProducts: vi.fn(),
  reorderCategories: vi.fn(),
  bulkUpdateProducts: vi.fn(),
  getUserByEmail: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Mock: config.js (prevents Zod parse throwing on missing env)
// ---------------------------------------------------------------------------
vi.mock("../config.js", () => ({
  config: {
    DATABASE_URL: "postgres://mock:mock@localhost:5432/mock",
    SESSION_SECRET: "mock-session-secret-at-least-32-chars-long!!",
    SESSION_TTL: 86400000,
    STORAGE_PROVIDER: "local",
    REPLIT_AUTH_ENABLED: false,
    PORT: 5000,
    NODE_ENV: "test",
    UPLOAD_DIR: "./uploads",
  },
}));

// ---------------------------------------------------------------------------
// Mock: db.js (prevents real PostgreSQL connection)
// ---------------------------------------------------------------------------
vi.mock("../db.js", () => ({
  db: {},
  pool: { end: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Mock: logger.js (prevents pino from importing config at module level)
// ---------------------------------------------------------------------------
vi.mock("../logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: storage layer
// ---------------------------------------------------------------------------
vi.mock("../storage.js", () => ({
  storage: mockStorage,
}));

// ---------------------------------------------------------------------------
// Mock: auth.js — no passport, no sessions, no DB lookups
// ---------------------------------------------------------------------------
vi.mock("../auth.js", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  registerAuthRoutes: vi.fn(),
  isAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
  getSession: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

// ---------------------------------------------------------------------------
// Mock: localAuth.js (imported by auth.ts)
// ---------------------------------------------------------------------------
vi.mock("../localAuth.js", () => ({
  registerLocalAuthRoutes: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: replit integrations
// ---------------------------------------------------------------------------
vi.mock("../replit_integrations/object_storage/routes.js", () => ({
  registerObjectStorageRoutes: vi.fn(),
}));

vi.mock("../replit_integrations/auth/index.js", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
  authStorage: {},
  registerAuthRoutes: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: rate limiters — no-op pass-through
// ---------------------------------------------------------------------------
vi.mock("../middleware/rateLimiter.js", () => {
  const passThrough = (_req: any, _res: any, next: any) => next();
  return {
    globalLimiter: passThrough,
    pageViewLimiter: passThrough,
    authLimiter: passThrough,
    arLinkLimiter: passThrough,
    inquiryLimiter: passThrough,
  };
});

// ---------------------------------------------------------------------------
// Mock: arLinkValidator.js
// ---------------------------------------------------------------------------
vi.mock("../arLinkValidator.js", () => ({
  validateArLink: vi.fn().mockResolvedValue({ valid: true, statusCode: 200, attempt: 1, message: "OK" }),
}));

// ---------------------------------------------------------------------------
// Mock: csrf package — verify() always returns true so CSRF middleware passes
// ---------------------------------------------------------------------------
vi.mock("csrf", () => {
  // Must use a real class/function constructor so `new Tokens()` works
  function MockTokens(this: any) {
    this.create = () => "mock-csrf-token";
    this.verify = () => true;
  }
  return { default: MockTokens };
});

// ---------------------------------------------------------------------------
// Now import modules that depend on the above mocks
// ---------------------------------------------------------------------------
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../routes.js";

// ---------------------------------------------------------------------------
// Helper: build an Express app with injected auth state
// ---------------------------------------------------------------------------
async function buildApp(userRole?: string) {
  const app = express();
  app.use(express.json());

  // Inject mock auth state before route handlers run
  app.use((req: any, _res: any, next: any) => {
    if (userRole) {
      req.isAuthenticated = () => true;
      req.user = { role: userRole, email: "test@example.com" };
    } else {
      req.isAuthenticated = () => false;
      req.user = undefined;
    }
    next();
  });

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Restore defaults that seedDatabase() will call during registerRoutes
    mockStorage.getThemeSettings.mockResolvedValue(null);
    mockStorage.createThemeSettings.mockResolvedValue({});
    mockStorage.getCategories.mockResolvedValue([]);
    mockStorage.createCategory.mockResolvedValue({ id: 1, name: "Test", slug: "test", isHidden: false, imageUrl: "" });
    mockStorage.createProduct.mockResolvedValue({ id: 1, name: "Mock", price: 10000, isHidden: false });
    mockStorage.getBanners.mockResolvedValue([]);
    mockStorage.createBanner.mockResolvedValue({});
    mockStorage.getHeroImages.mockResolvedValue([]);
    mockStorage.createHeroImage.mockResolvedValue({});
    mockStorage.getFaqItems.mockResolvedValue([]);
    mockStorage.createFaqItem.mockResolvedValue({});
  });

  it("GET /api/products returns product list", async () => {
    mockStorage.getProducts.mockResolvedValue([
      { id: 1, name: "Cloud Sofa", price: 249900, isHidden: false },
    ]);

    const app = await buildApp();
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Cloud Sofa");
  });

  it("POST /api/products requires admin auth", async () => {
    const app = await buildApp(); // unauthenticated
    const res = await request(app)
      .post("/api/products")
      .set("x-csrf-token", "mock-csrf-token")
      .send({ name: "Test" });
    expect(res.status).toBe(401);
  });

  it("POST /api/products as admin creates product", async () => {
    const newProduct = { id: 2, name: "New Chair", price: 50000, isHidden: false };
    mockStorage.createProduct.mockResolvedValue(newProduct);

    const app = await buildApp("admin");
    const res = await request(app)
      .post("/api/products")
      .set("x-csrf-token", "mock-csrf-token")
      .send({
        name: "New Chair",
        description: "A chair",
        price: 50000,
        categoryId: 1,
        arLink: "",
        colors: [],
        sizes: [],
        images: [],
        isHidden: false,
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("New Chair");
  });

  it("DELETE /api/products/:id requires admin (supervisor gets 403)", async () => {
    const app = await buildApp("supervisor");
    const res = await request(app)
      .delete("/api/products/1")
      .set("x-csrf-token", "mock-csrf-token");
    expect(res.status).toBe(403);
  });

  it("DELETE /api/products/:id as admin deletes product and returns 204", async () => {
    mockStorage.deleteProduct.mockResolvedValue(undefined);

    const app = await buildApp("admin");
    const res = await request(app)
      .delete("/api/products/1")
      .set("x-csrf-token", "mock-csrf-token");
    expect(res.status).toBe(204);
    expect(mockStorage.deleteProduct).toHaveBeenCalledWith(1);
  });
});
