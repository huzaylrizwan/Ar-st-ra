# Phase 4 — Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Replit vendor lock-in (portable auth + storage adapter), validate environment config on startup, add CSRF protection, add React error boundaries, improve the global error handler, and complete the test suite.

**Architecture:** Passport.js local strategy is already installed (`passport`, `passport-local`, `bcryptjs` are in package.json). The storage adapter pattern wraps existing Replit integration so no migration of existing assets is needed. All changes are environment-variable-driven and backward-compatible.

**Prerequisites:** Phases 1–3 complete.

**Tech Stack:** passport (already installed), passport-local (already installed), bcryptjs (already installed), express-rate-limit (installed in Phase 1), vitest + supertest (installed in Phase 1)

---

## File Map

**Create:**
- `server/config.ts` — validated environment config
- `server/localAuth.ts` — passport-local strategy + routes
- `server/storage/StorageAdapter.ts` — storage interface
- `server/storage/LocalDiskAdapter.ts` — disk-based file storage
- `server/storage/ReplitStorageAdapter.ts` — wraps existing Replit integration
- `client/src/components/ErrorBoundary.tsx` — React error boundary
- `server/tests/products.test.ts` — product CRUD integration tests

**Modify:**
- `server/index.ts` — use config.ts, add CSRF token endpoint
- `server/routes.ts` — add CSRF middleware to mutating routes
- `server/auth.ts` — integrate localAuth, use REPLIT_AUTH_ENABLED flag
- `server/replit_integrations/object_storage/routes.ts` — use storage adapter
- `client/src/lib/queryClient.ts` — attach CSRF token to all mutations
- `client/src/App.tsx` — wrap route sections in ErrorBoundary
- `client/src/components/ARStudio.tsx` — wrap in ErrorBoundary

---

## Task 1: Validated Environment Config

**Files:**
- Create: `server/config.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create `server/config.ts`**

```typescript
import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  STORAGE_PROVIDER: z.enum(["replit", "local"]).default("local"),
  REPLIT_AUTH_ENABLED: z.string().transform(v => v === "true").default("false"),
  PORT: z.string().transform(Number).default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  UPLOAD_DIR: z.string().default("./uploads"),
});

function parseConfig() {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors.map(e => `  ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`\n❌ Invalid environment configuration:\n${errors}\n`);
  }
  return result.data;
}

export const config = parseConfig();
```

- [ ] **Step 2: Update `server/index.ts` to import and use config**

Add at the very top of `server/index.ts` (before other imports that use `process.env`):

```typescript
import "./config.js"; // validates env on startup — crashes with clear message if invalid
import { config } from "./config.js";
```

Replace:
```typescript
const port = parseInt(process.env.PORT || "5000", 10);
```
With:
```typescript
const port = config.PORT;
```

Replace the SESSION_SECRET random generation block:
```typescript
// Before:
if (!process.env.SESSION_SECRET) {
  const generated = crypto.randomBytes(32).toString("hex");
  process.env.SESSION_SECRET = generated;
  log("WARNING: ...");
}

// After (config.ts already validates SESSION_SECRET exists):
// Remove this block entirely — config.ts handles it
```

- [ ] **Step 3: Verify server starts with clear error on missing config**

Temporarily rename `.env` or unset `DATABASE_URL`, run:

```bash
npm run dev
```

Expected: server exits immediately with:
```
❌ Invalid environment configuration:
  DATABASE_URL: DATABASE_URL is required
```

Restore `.env` and re-run to confirm normal startup.

- [ ] **Step 4: Commit**

```bash
git add server/config.ts server/index.ts
git commit -m "feat: validated environment config — server crashes with clear message on bad env"
```

---

## Task 2: Local Auth (Passport-Local Strategy)

**Files:**
- Create: `server/localAuth.ts`
- Modify: `server/auth.ts`
- Modify: `server/routes.ts`

The packages `passport`, `passport-local`, and `bcryptjs` are already installed.

- [ ] **Step 1: Create `server/localAuth.ts`**

```typescript
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import type { Express } from "express";

passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: "Invalid credentials" });
        if (!user.passwordHash) return done(null, false, { message: "This account uses SSO login" });
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message ?? "Invalid credentials" });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        // Remove sensitive fields before sending
        const { passwordHash: _, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(204);
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // One-time admin setup — disabled after first admin user exists
  app.post("/api/auth/setup", async (req, res) => {
    const existingAdmin = await storage.getAdminUser();
    if (existingAdmin) {
      return res.status(403).json({ message: "Setup already complete" });
    }
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ message: "Email and password (min 8 chars) required" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await storage.createUser({ email, passwordHash, name: name ?? null, role: "admin" });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });
}
```

- [ ] **Step 2: Add `getUserByEmail`, `getAdminUser`, `createUser` to `server/storage.ts`**

These methods query the `users` table from `shared/models/auth.ts`. Read `shared/models/auth.ts` first to confirm the table structure, then add:

```typescript
async getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
},

async getAdminUser() {
  const [user] = await db.select().from(users).where(eq(users.role, "admin"));
  return user ?? null;
},

async createUser(data: { email: string; passwordHash: string; name: string | null; role: string }) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
},
```

Import `users` from `@shared/models/auth` (or `@shared/schema`) at the top of `storage.ts`.

- [ ] **Step 3: Conditionally register local auth in `server/auth.ts`**

At the bottom of `setupAuth` or `registerAuthRoutes` function, conditionally call local auth:

```typescript
import { config } from "./config.js";
import { registerLocalAuthRoutes } from "./localAuth.js";

// In registerAuthRoutes:
export function registerAuthRoutes(app: Express) {
  // existing Replit auth routes...
  if (config.REPLIT_AUTH_ENABLED) {
    // existing Replit-specific routes
  }
  
  // Always register local auth routes (additive — doesn't break Replit auth)
  registerLocalAuthRoutes(app);
}
```

- [ ] **Step 4: Apply auth rate limiter to local login route**

In `server/routes.ts`, add `authLimiter` import is already done (Phase 1). The `authLimiter` was applied to `/api/auth/login` in Phase 1, Task 8, Step 3. Verify it's still applied — if `localAuth.ts` defines the route directly, add the limiter there:

```typescript
// In localAuth.ts, update the login route signature:
app.post("/api/auth/login", authLimiter, async (req, res, next) => {
```

Import `authLimiter` from `./middleware/rateLimiter.js`.

- [ ] **Step 5: Commit**

```bash
git add server/localAuth.ts server/storage.ts server/auth.ts
git commit -m "feat: local passport auth (email+password) alongside existing Replit auth"
```

---

## Task 3: Storage Adapter

**Files:**
- Create: `server/storage/StorageAdapter.ts`
- Create: `server/storage/LocalDiskAdapter.ts`
- Create: `server/storage/ReplitStorageAdapter.ts`
- Modify: `server/replit_integrations/object_storage/routes.ts`

- [ ] **Step 1: Create `server/storage/StorageAdapter.ts`**

```typescript
export interface StorageAdapter {
  /**
   * Upload a file. Returns the public URL.
   */
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;

  /**
   * Delete a file by its key.
   */
  delete(key: string): Promise<void>;

  /**
   * Get the public URL for a key (without fetching).
   */
  getUrl(key: string): string;
}
```

- [ ] **Step 2: Create `server/storage/LocalDiskAdapter.ts`**

```typescript
import { StorageAdapter } from "./StorageAdapter.js";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../config.js";

export class LocalDiskAdapter implements StorageAdapter {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir = config.UPLOAD_DIR, baseUrl = "/uploads") {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    await fs.unlink(filePath).catch(() => {}); // ignore if file doesn't exist
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
```

- [ ] **Step 3: Create `server/storage/ReplitStorageAdapter.ts`**

```typescript
import { StorageAdapter } from "./StorageAdapter.js";

// Lazy import to avoid breaking non-Replit environments
let replitStorage: any = null;
async function getReplitStorage() {
  if (!replitStorage) {
    const mod = await import("../replit_integrations/object_storage/objectStorage.js");
    replitStorage = mod.objectStorage ?? mod.default;
  }
  return replitStorage;
}

export class ReplitStorageAdapter implements StorageAdapter {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const storage = await getReplitStorage();
    await storage.uploadFromBytes(key, buffer, { contentType });
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const storage = await getReplitStorage();
    await storage.delete(key);
  }

  getUrl(key: string): string {
    // Replit object storage public URL pattern — adjust if different
    return `/api/storage/${key}`;
  }
}
```

> Note: The exact Replit SDK API (`uploadFromBytes`, `delete`) depends on the version in `objectStorage.ts`. Read that file and adjust method names to match.

- [ ] **Step 4: Create the active adapter singleton in `server/storage/index.ts`**

```typescript
import { config } from "../config.js";
import type { StorageAdapter } from "./StorageAdapter.js";
import { LocalDiskAdapter } from "./LocalDiskAdapter.js";

let _adapter: StorageAdapter | null = null;

export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;
  
  if (config.STORAGE_PROVIDER === "replit") {
    const { ReplitStorageAdapter } = await import("./ReplitStorageAdapter.js");
    _adapter = new ReplitStorageAdapter();
  } else {
    _adapter = new LocalDiskAdapter();
  }
  
  return _adapter;
}
```

- [ ] **Step 5: Register static uploads in `server/index.ts` for local storage**

```typescript
import express from "express";
import { config } from "./config.js";

// In the server setup, before routes:
if (config.STORAGE_PROVIDER === "local") {
  app.use("/uploads", express.static(config.UPLOAD_DIR));
}
```

- [ ] **Step 6: Update upload routes to use the adapter**

Open `server/replit_integrations/object_storage/routes.ts`. For each upload handler, replace the direct Replit SDK call with:

```typescript
import { getStorageAdapter } from "../../storage/index.js";

// In each upload route:
const adapter = await getStorageAdapter();
const buffer = req.file?.buffer; // multer memoryStorage
if (!buffer) return res.status(400).json({ message: "No file provided" });
const key = `${Date.now()}-${req.file.originalname}`;
const url = await adapter.upload(key, buffer, req.file.mimetype);
res.json({ url });
```

For delete routes:
```typescript
const adapter = await getStorageAdapter();
await adapter.delete(key);
res.sendStatus(204);
```

- [ ] **Step 7: Commit**

```bash
git add server/storage/StorageAdapter.ts server/storage/LocalDiskAdapter.ts server/storage/ReplitStorageAdapter.ts server/storage/index.ts server/index.ts server/replit_integrations/object_storage/routes.ts
git commit -m "feat: StorageAdapter pattern — switch between Replit and local disk via STORAGE_PROVIDER env"
```

---

## Task 4: CSRF Protection

**Files:**
- Modify: `server/routes.ts`
- Modify: `client/src/lib/queryClient.ts`

- [ ] **Step 1: Install csrf package**

```bash
npm install csrf
npm install --save-dev @types/csrf
```

- [ ] **Step 2: Add CSRF token endpoint to `server/routes.ts`**

```typescript
import Tokens from "csrf";

const csrfTokens = new Tokens();
const CSRF_SECRET = process.env.SESSION_SECRET ?? "fallback-csrf-secret";

// Add this route before other routes:
app.get("/api/csrf-token", (req, res) => {
  const token = csrfTokens.create(CSRF_SECRET);
  res.json({ token });
});

// CSRF validation middleware (apply to mutating routes)
function validateCsrf(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-csrf-token"] as string;
  if (!token || !csrfTokens.verify(CSRF_SECRET, token)) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  next();
}
```

- [ ] **Step 3: Apply `validateCsrf` to admin/supervisor mutating routes**

Add `validateCsrf` to all `POST`, `PUT`, `PATCH`, `DELETE` routes that already have `requireAdmin` or `requireSupervisor`. Pattern:

```typescript
app.post(api.categories.create.path, requireAdmin, validateCsrf, async (req, res) => { ... });
app.put(api.categories.update.path, requireAdmin, validateCsrf, async (req, res) => { ... });
// etc. for all admin mutating routes
```

> Public routes (e.g., `/api/page-view`, `/api/inquiries`) do NOT need CSRF — they are rate-limited instead.

- [ ] **Step 4: Update `client/src/lib/queryClient.ts` to fetch and attach CSRF token**

```typescript
import { QueryClient } from "@tanstack/react-query";

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/csrf-token");
  const data = await res.json();
  csrfToken = data.token;
  return csrfToken!;
}

async function fetchWithCsrf(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  
  if (needsCsrf) {
    const token = await getCsrfToken();
    init.headers = {
      ...init.headers,
      "X-CSRF-Token": token,
    };
  }
  
  return fetch(input, { credentials: "include", ...init });
}

export { fetchWithCsrf };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetchWithCsrf(queryKey[0] as string);
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        return res.json();
      },
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
  },
});
```

- [ ] **Step 5: Update all `fetch` calls in the codebase that do mutations**

Search for `fetch(` calls that use `method: "POST"/"PUT"/"PATCH"/"DELETE"` and replace `fetch(` with `fetchWithCsrf(`. Remove `credentials: "include"` from those calls (fetchWithCsrf adds it automatically).

```bash
# Find all manual fetch mutation calls:
grep -r "method.*POST\|method.*PUT\|method.*PATCH\|method.*DELETE" client/src --include="*.tsx" --include="*.ts" -l
```

For each file found, import and use `fetchWithCsrf`:

```typescript
import { fetchWithCsrf } from "@/lib/queryClient";

// Replace:
await fetch("/api/settings", { method: "PUT", ... credentials: "include" })
// With:
await fetchWithCsrf("/api/settings", { method: "PUT", ... })
```

- [ ] **Step 6: Commit**

```bash
git add server/routes.ts client/src/lib/queryClient.ts
git commit -m "feat: CSRF protection on admin mutations + automatic token attachment in queryClient"
```

---

## Task 5: React Error Boundaries

**Files:**
- Create: `client/src/components/ErrorBoundary.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/pages/ProductDetails.tsx`

- [ ] **Step 1: Create `client/src/components/ErrorBoundary.tsx`**

```tsx
import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <p className="text-muted-foreground text-sm">Something went wrong loading this section.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ARStudioErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
          <p className="text-muted-foreground text-sm mb-4">
            3D view unavailable — please refresh your browser.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: Wrap AR Studio in `ProductDetails.tsx`**

```tsx
import { ARStudioErrorBoundary } from "@/components/ErrorBoundary";

// Replace:
{arViewerOpen && product.arLink && (
  <ARStudio product={product} onClose={() => setArViewerOpen(false)} />
)}

// With:
{arViewerOpen && product.arLink && (
  <ARStudioErrorBoundary>
    <ARStudio product={product} onClose={() => setArViewerOpen(false)} />
  </ARStudioErrorBoundary>
)}
```

- [ ] **Step 3: Wrap page sections in `App.tsx`**

Wrap the Router output in a top-level ErrorBoundary:

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeApplicator />
        <ScrollToTop />
        <PageViewTracker />
        <AuthRedirectHandler />
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ErrorBoundary.tsx client/src/App.tsx client/src/pages/ProductDetails.tsx
git commit -m "feat: React error boundaries — graceful fallback for AR studio crashes and page errors"
```

---

## Task 6: Improved Global Error Handler + Structured Logging

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Install pino**

```bash
npm install pino pino-http
npm install --save-dev @types/pino-http
```

- [ ] **Step 2: Create `server/logger.ts`**

```typescript
import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  transport: config.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
```

- [ ] **Step 3: Add pino-http request logging in `server/index.ts`**

```typescript
import pinoHttp from "pino-http";
import { logger } from "./logger.js";

// Replace the existing custom logging middleware with pino-http:
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/analytics/live-visitors" } }));
```

Remove the old manual `res.on("finish")` logging middleware block.

- [ ] **Step 4: Replace `console.error` calls throughout server code**

In `server/index.ts`, `server/routes.ts`, and `server/storage.ts`, replace:

```typescript
console.error("...", err);
// With:
logger.error({ err }, "...");
```

- [ ] **Step 5: Improve the global error handler in `server/index.ts`**

Find the existing error handler:

```typescript
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) { return next(err); }
  return res.status(status).json({ message });
});
```

Replace with:

```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  const code = err.code ?? "INTERNAL_ERROR";

  logger.error({ err, req: { method: req.method, url: req.url }, status }, "Request error");

  if (res.headersSent) return next(err);

  const message = config.NODE_ENV === "production"
    ? "An error occurred. Please try again."
    : err.message ?? "Internal Server Error";

  res.status(status).json({ message, code });
});
```

- [ ] **Step 6: Commit**

```bash
git add server/logger.ts server/index.ts server/routes.ts server/storage.ts
git commit -m "feat: structured pino logging, improved global error handler with prod/dev message split"
```

---

## Task 7: Integration Tests — Products CRUD

**Files:**
- Create: `server/tests/products.test.ts`

- [ ] **Step 1: Write integration tests using in-memory storage mock**

Create `server/tests/products.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the storage layer
const mockStorage = {
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
};

vi.mock("../storage.js", () => ({
  storage: mockStorage,
}));

// Mock auth so tests control authentication
vi.mock("../auth.js", () => ({
  setupAuth: vi.fn(),
  registerAuthRoutes: vi.fn(),
}));

// Mock replit integrations
vi.mock("../replit_integrations/object_storage/routes.js", () => ({
  registerObjectStorageRoutes: vi.fn(),
}));

vi.mock("../replit_integrations/auth/index.js", () => ({ isAuthenticated: false }));

vi.mock("../arLinkValidator.js", () => ({
  validateArLink: vi.fn().mockResolvedValue({ valid: true, statusCode: 200, attempt: 1, message: "OK" }),
}));

import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../routes.js";

async function buildApp(userRole?: string) {
  const app = express();
  app.use(express.json());

  // Inject mock auth state
  app.use((req: any, _res: any, next: any) => {
    if (userRole) {
      req.isAuthenticated = () => true;
      req.user = { role: userRole, email: "test@example.com" };
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  return app;
}

describe("Products API", () => {
  beforeEach(() => vi.clearAllMocks());

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
    const app = await buildApp(); // no auth
    const res = await request(app).post("/api/products").send({ name: "Test" });
    expect(res.status).toBe(401);
  });

  it("POST /api/products as admin creates product", async () => {
    const newProduct = { id: 2, name: "New Chair", price: 50000, isHidden: false };
    mockStorage.createProduct.mockResolvedValue(newProduct);

    const app = await buildApp("admin");
    const res = await request(app).post("/api/products").send({
      name: "New Chair", description: "A chair", price: 50000,
      categoryId: 1, arLink: "", colors: [], sizes: [], images: [], isHidden: false,
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("New Chair");
  });

  it("DELETE /api/products/:id requires admin", async () => {
    const app = await buildApp("supervisor"); // supervisor, not admin
    const res = await request(app).delete("/api/products/1");
    expect(res.status).toBe(403);
  });

  it("DELETE /api/products/:id as admin deletes product", async () => {
    mockStorage.deleteProduct.mockResolvedValue(undefined);

    const app = await buildApp("admin");
    const res = await request(app).delete("/api/products/1");
    expect(res.status).toBe(204);
    expect(mockStorage.deleteProduct).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:server
```

Expected: All server tests pass (auth tests + AR link tests + new product tests)

- [ ] **Step 3: Commit**

```bash
git add server/tests/products.test.ts
git commit -m "test: product CRUD integration tests with mocked storage and auth"
```

---

## Task 8: Final Test Suite Verification

**Files:**
- No new files — run all existing tests

- [ ] **Step 1: Run the complete test suite**

```bash
npm run test
```

Expected output:
```
✓ server/tests/auth.test.ts (3 tests)
✓ server/tests/arLink.test.ts (4 tests)
✓ server/tests/products.test.ts (5 tests)
✓ client/src/tests/Dashboard.test.tsx (2 tests)
✓ client/src/tests/ProductDetails.test.tsx (4 tests)
✓ client/src/tests/ProductInquirySheet.test.tsx (2 tests)

Test Files  6 passed
Tests      20 passed
```

- [ ] **Step 2: Fix any failures**

If any test fails due to changes in this phase (CSRF, auth changes), update the mocks/assertions to match the new behavior. Do not delete tests.

- [ ] **Step 3: Final integration smoke test**

```bash
npm run dev
```

Manually verify:
- [ ] Server starts with clear log output (pino format, no console.log spam)
- [ ] Homepage loads, hero image slideshow works
- [ ] Product page: color/size selection, inquiry form, QR code on desktop
- [ ] Admin login via `/login` works
- [ ] Admin dashboard shows analytics charts
- [ ] AR Studio opens, progress bar shows, model loads
- [ ] Uploading an image in the product editor works (uses local disk or Replit depending on `STORAGE_PROVIDER`)
- [ ] Setting `REPLIT_AUTH_ENABLED=false` and restarting still allows login via local auth

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: phase 4 complete — portable auth, storage adapter, CSRF, error boundaries, full test suite"
```

---

## Phase 4 Complete — Full Overhaul Done

All 4 phases are now complete. The site is:

- **Bug-free**: Cents display, AR multi-material, FK cascade all fixed
- **Secure**: Rate limiting, helmet, body limits, CSRF, auth-gated uploads
- **UX-complete**: Functional color/size selection, search/filter, inquiry flow, AR device check
- **Admin-powered**: Real analytics, drag-to-reorder, bulk ops, inquiry log, slideshow
- **Production-portable**: Local auth, storage adapter, validated env config, error boundaries, 20 tests
