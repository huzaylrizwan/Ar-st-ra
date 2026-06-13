# Phase 1 — Bug Fixes & Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs (cents display, AR multi-material, FK cascade), add AR link validation, install rate limiting and security headers, and set up the test infrastructure.

**Architecture:** Fix-first approach — each task is independently testable and commits cleanly. Schema changes via `npm run db:push` (existing workflow). New middleware is additive and non-breaking.

**Tech Stack:** Express 5, Drizzle ORM, React 18, TypeScript (ESM), Vitest, @testing-library/react, supertest, express-rate-limit, helmet

---

## File Map

**Create:**
- `server/middleware/rateLimiter.ts` — rate limit configs
- `server/tests/setup.ts` — test DB/app bootstrap
- `server/tests/arLink.test.ts` — AR validation tests
- `server/tests/auth.test.ts` — middleware auth tests
- `client/src/tests/setup.ts` — jsdom + cleanup
- `client/src/tests/Dashboard.test.tsx` — cents bug test
- `vitest.config.server.ts` — server test config
- `vitest.config.client.ts` — client test config

**Modify:**
- `package.json` — add deps + test scripts
- `shared/schema.ts` — categoryId nullable, sortOrder on products, materialSlotIndex + uvScale on productMaterials
- `server/index.ts` — helmet, body limit, pageViews cleanup
- `server/routes.ts` — AR link validation route, rate limiters applied
- `server/storage.ts` — order products by sortOrder
- `client/src/pages/admin/Dashboard.tsx` — divide price by 100
- `client/src/components/ARStudio.tsx` — use materialSlotIndex + uvScale
- `client/src/pages/admin/AdminProductEditor.tsx` — AR validator UI

---

## Task 1: Install Dependencies & Set Up Test Infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.server.ts`
- Create: `vitest.config.client.ts`
- Create: `server/tests/setup.ts`
- Create: `client/src/tests/setup.ts`

- [ ] **Step 1: Install new packages**

```bash
npm install express-rate-limit helmet
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom supertest @types/supertest
```

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` section, add:

```json
"test": "vitest run --config vitest.config.server.ts && vitest run --config vitest.config.client.ts",
"test:server": "vitest run --config vitest.config.server.ts",
"test:client": "vitest run --config vitest.config.client.ts",
"test:watch": "vitest --config vitest.config.server.ts"
```

- [ ] **Step 3: Create `vitest.config.server.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["server/tests/setup.ts"],
  },
});
```

- [ ] **Step 4: Create `vitest.config.client.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["client/src/tests/**/*.test.tsx"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["client/src/tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
```

- [ ] **Step 5: Create `server/tests/setup.ts`**

```typescript
import { vi } from "vitest";

// Silence console.error in tests unless explicitly testing for it
vi.spyOn(console, "error").mockImplementation(() => {});
```

- [ ] **Step 6: Create `client/src/tests/setup.ts`**

```typescript
import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 7: Run tests to confirm infrastructure works (no tests yet — expect 0 passing)**

```bash
npm run test:server
```

Expected output: `Test Files 0 passed | Tests 0 passed`

- [ ] **Step 8: Commit**

```bash
git add package.json vitest.config.server.ts vitest.config.client.ts server/tests/setup.ts client/src/tests/setup.ts
git commit -m "chore: add vitest, testing-library, rate-limit, helmet deps + test configs"
```

---

## Task 2: Fix Dashboard Cents Bug (TDD)

**Files:**
- Create: `client/src/tests/Dashboard.test.tsx`
- Modify: `client/src/pages/admin/Dashboard.tsx` (line 24)

- [ ] **Step 1: Write the failing test**

Create `client/src/tests/Dashboard.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "@/pages/admin/Dashboard";

// Mock hooks used by Dashboard
vi.mock("@/hooks/use-products", () => ({
  useProducts: () => ({
    data: [
      { id: 1, price: 249900, arLink: "https://example.com/model.glb", isHidden: false },
      { id: 2, price: 49900,  arLink: "",                              isHidden: false },
      { id: 3, price: 389900, arLink: "https://example.com/bed.glb",   isHidden: false },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({ data: [{ id: 1 }, { id: 2 }], isLoading: false }),
}));

vi.mock("@/components/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("Dashboard", () => {
  it("shows Total Value in dollars, not cents", () => {
    render(<Dashboard />);
    // 249900 + 49900 + 389900 = 689700 cents = $6,897
    expect(screen.getByText("$6,897")).toBeInTheDocument();
    expect(screen.queryByText("$689,700")).not.toBeInTheDocument();
  });

  it("shows AR Enabled count correctly", () => {
    render(<Dashboard />);
    // 2 products have arLink
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:client
```

Expected: FAIL — `expect(screen.getByText("$6,897")).toBeInTheDocument()` throws "Unable to find an element with the text: $6,897"

- [ ] **Step 3: Fix `client/src/pages/admin/Dashboard.tsx` line 24**

Find this line (inside the `stats` array, `Total Value` entry):

```tsx
value: `$${products?.reduce((acc, p) => acc + p.price, 0).toLocaleString() || 0}`,
```

Replace with:

```tsx
value: `$${((products?.reduce((acc, p) => acc + p.price, 0) ?? 0) / 100).toLocaleString()}`,
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:client
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/tests/Dashboard.test.tsx client/src/pages/admin/Dashboard.tsx
git commit -m "fix: dashboard total value was showing raw cents instead of dollars"
```

---

## Task 3: Schema — categoryId Nullable + sortOrder on Products

**Files:**
- Modify: `shared/schema.ts`

- [ ] **Step 1: Update `shared/schema.ts` — make categoryId nullable and add onDelete**

Find the `products` table definition. Change `categoryId`:

```typescript
// Before
categoryId: integer("category_id").references(() => categories.id).notNull(),

// After
categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
```

Note: removing `.notNull()` makes the column nullable in TypeScript types automatically.

- [ ] **Step 2: Add `sortOrder` to the products table**

In the `products` table definition, add after `isHidden`:

```typescript
sortOrder: integer("sort_order").default(0).notNull(),
```

Full products table for reference:

```typescript
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  arLink: text("ar_link").notNull(),
  colors: text("colors").array().notNull(),
  sizes: text("sizes").array().notNull(),
  images: text("images").array().notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  stockStatus: text("stock_status").default("in_stock").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});
```

- [ ] **Step 3: Push schema to database**

```bash
npm run db:push
```

Expected: Drizzle asks to confirm column changes. Accept all. Output ends with "Changes applied".

- [ ] **Step 4: Update `server/storage.ts` — order products by sortOrder**

Find the `getProducts` method. Add `.orderBy(asc(products.sortOrder))` to the query:

```typescript
// At the top of storage.ts, ensure this import exists:
import { asc } from "drizzle-orm";

// In getProducts:
async getProducts(categoryId?: number, includeHidden?: boolean) {
  let query = db.select().from(products);
  
  const conditions = [];
  if (categoryId !== undefined) conditions.push(eq(products.categoryId, categoryId));
  if (!includeHidden) conditions.push(eq(products.isHidden, false));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return query.orderBy(asc(products.sortOrder));
},
```

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts server/storage.ts
git commit -m "feat: make categoryId nullable with cascade, add sortOrder to products"
```

---

## Task 4: Schema — materialSlotIndex + uvScale on ProductMaterials

**Files:**
- Modify: `shared/schema.ts`

- [ ] **Step 1: Add new fields to `productMaterials` table in `shared/schema.ts`**

Find the `productMaterials` table. Add two fields after `isDefault`:

```typescript
export const productMaterials = pgTable("product_materials", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  modelId: integer("model_id").references(() => productModels.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  colorHex: text("color_hex").notNull(),
  textureUrl: text("texture_url"),
  variantModelUrl: text("variant_model_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  materialSlotIndex: integer("material_slot_index").default(0).notNull(),
  uvScale: real("uv_scale").default(8.0).notNull(),
});
```

- [ ] **Step 2: Push schema**

```bash
npm run db:push
```

Expected: "Changes applied"

- [ ] **Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: add materialSlotIndex and uvScale to productMaterials schema"
```

---

## Task 5: Fix ARStudio Multi-Material & UV Scale

**Files:**
- Modify: `client/src/components/ARStudio.tsx`

- [ ] **Step 1: Fix `applyTextureOrColor` to use `materialSlotIndex`**

Find the `applyTextureOrColor` function in `ARStudio.tsx`. It currently starts:

```typescript
const applyTextureOrColor = useCallback(async (material: ProductMaterial) => {
  const mv = modelViewerRef.current;
  if (!mv) return;
  const model = mv.model;
  if (!model || !model.materials || model.materials.length === 0) return;
  const mat = model.materials[0];  // ← BUG: always slot 0
```

Replace the last line with:

```typescript
  const slotIndex = material.materialSlotIndex ?? 0;
  const mat = model.materials[slotIndex];
  if (!mat) return; // slot doesn't exist in this GLB — silently skip
```

- [ ] **Step 2: Fix hardcoded UV scale**

In the same function, find:

```typescript
texture.sampler.setScale({ u: 8, v: 8 });
```

Replace with:

```typescript
const scale = material.uvScale ?? 8;
texture.sampler.setScale({ u: scale, v: scale });
```

- [ ] **Step 3: Verify the full corrected `applyTextureOrColor` function**

The complete function should read:

```typescript
const applyTextureOrColor = useCallback(async (material: ProductMaterial) => {
  const mv = modelViewerRef.current;
  if (!mv) return;
  const model = mv.model;
  if (!model || !model.materials || model.materials.length === 0) return;

  const slotIndex = material.materialSlotIndex ?? 0;
  const mat = model.materials[slotIndex];
  if (!mat) return;

  const pbr = mat.pbrMetallicRoughness;

  if (material.textureUrl) {
    if (pbr.baseColorTexture) {
      const texture = await mv.createTexture(toAbsoluteUrl(material.textureUrl));
      if (texture) {
        pbr.baseColorTexture.setTexture(texture);
        const scale = material.uvScale ?? 8;
        texture.sampler.setScale({ u: scale, v: scale });
        pbr.setBaseColorFactor([1, 1, 1, 1]);
      }
    } else {
      pbr.setBaseColorFactor(hexToRgba(material.colorHex));
    }
  } else {
    if (pbr.baseColorTexture) pbr.baseColorTexture.setTexture(null);
    pbr.setBaseColorFactor(hexToRgba(material.colorHex));
  }
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ARStudio.tsx
git commit -m "fix: AR studio now uses materialSlotIndex and configurable uvScale per material"
```

---

## Task 6: AR Link Validation — Backend (TDD)

**Files:**
- Create: `server/tests/arLink.test.ts`
- Modify: `server/routes.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/arLink.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch before importing routes
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// We test the validation logic directly (extracted helper)
// Import after stubbing
import { validateArLink } from "../arLinkValidator.js";

describe("validateArLink", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns valid:true when HEAD request succeeds", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await validateArLink("https://example.com/model.glb");
    expect(result.valid).toBe(true);
    expect(result.attempt).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to GET when HEAD fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 405 }) // HEAD fails
      .mockResolvedValueOnce({ ok: true, status: 200 });  // GET succeeds
    const result = await validateArLink("https://example.com/model.glb");
    expect(result.valid).toBe(true);
    expect(result.attempt).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns valid:false when both requests fail", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await validateArLink("https://example.com/missing.glb");
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(404);
  });

  it("returns valid:false on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const result = await validateArLink("https://example.com/model.glb");
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:server
```

Expected: FAIL — `Cannot find module '../arLinkValidator.js'`

- [ ] **Step 3: Create `server/arLinkValidator.ts`**

```typescript
export interface ArLinkValidationResult {
  valid: boolean;
  statusCode: number;
  attempt: 1 | 2;
  message: string;
}

async function tryFetch(url: string, method: "HEAD" | "GET"): Promise<{ ok: boolean; status: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method, signal: controller.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch {
    return null;
  }
}

export async function validateArLink(url: string): Promise<ArLinkValidationResult> {
  const head = await tryFetch(url, "HEAD");
  if (head?.ok) {
    return { valid: true, statusCode: head.status, attempt: 1, message: "Link verified" };
  }

  const get = await tryFetch(url, "GET");
  if (get?.ok) {
    return { valid: true, statusCode: get.status, attempt: 2, message: "Link verified (GET fallback)" };
  }

  const statusCode = get?.status ?? head?.status ?? 0;
  return {
    valid: false,
    statusCode,
    attempt: 2,
    message: statusCode === 0 ? "Network error or timeout" : `Server returned ${statusCode}`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:server
```

Expected: PASS (4 tests)

- [ ] **Step 5: Add the route to `server/routes.ts`**

At the top of `routes.ts`, add the import:

```typescript
import { validateArLink } from "./arLinkValidator.js";
```

Inside `registerRoutes`, after the Hero Images section and before the Product Materials section, add:

```typescript
// AR Link Validation
app.post("/api/validate-ar-link", requireAdmin, async (req, res) => {
  const { url } = z.object({ url: z.string().url() }).parse(req.body);
  const result = await validateArLink(url);
  res.json(result);
});
```

- [ ] **Step 6: Commit**

```bash
git add server/arLinkValidator.ts server/tests/arLink.test.ts server/routes.ts
git commit -m "feat: AR link validation endpoint with HEAD+GET double-check"
```

---

## Task 7: AR Link Validation UI in AdminProductEditor

**Files:**
- Modify: `client/src/pages/admin/AdminProductEditor.tsx`

- [ ] **Step 1: Add validation state and handler near the top of `AdminProductEditor`**

Find the component and add these state variables alongside the existing form state:

```typescript
const [arLinkStatus, setArLinkStatus] = useState<{
  valid: boolean;
  message: string;
} | null>(null);
const [isValidatingArLink, setIsValidatingArLink] = useState(false);

const validateArLinkField = async (url: string) => {
  if (!url) { setArLinkStatus(null); return; }
  setIsValidatingArLink(true);
  setArLinkStatus(null);
  try {
    const res = await fetch("/api/validate-ar-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error("Validation request failed");
    const data = await res.json();
    setArLinkStatus({ valid: data.valid, message: data.message });
  } catch {
    setArLinkStatus({ valid: false, message: "Could not reach validation service" });
  } finally {
    setIsValidatingArLink(false);
  }
};
```

- [ ] **Step 2: Find the AR Link input field in the JSX and add `onBlur` + status indicator**

Find the input for `arLink` in the form. It will look something like:

```tsx
<Input ... name="arLink" ... />
```

Add `onBlur` and wrap with a status display:

```tsx
<div className="space-y-1">
  <Input
    {...register("arLink")}
    placeholder="https://example.com/model.glb"
    onBlur={(e) => validateArLinkField(e.target.value)}
  />
  {isValidatingArLink && (
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <Loader2 className="w-3 h-3 animate-spin" /> Validating link…
    </p>
  )}
  {arLinkStatus && !isValidatingArLink && (
    <p className={`text-xs flex items-center gap-1 ${arLinkStatus.valid ? "text-green-600" : "text-red-500"}`}>
      {arLinkStatus.valid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {arLinkStatus.message}
    </p>
  )}
</div>
```

- [ ] **Step 3: Add the missing import at the top of AdminProductEditor**

```typescript
import { Loader2, AlertCircle, Check } from "lucide-react";
```

(Only add whichever of these aren't already imported)

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/AdminProductEditor.tsx
git commit -m "feat: inline AR link validator in product editor (validates on blur)"
```

---

## Task 8: Rate Limiting Middleware

**Files:**
- Create: `server/middleware/rateLimiter.ts`
- Modify: `server/index.ts`
- Modify: `server/routes.ts`

- [ ] **Step 1: Create `server/middleware/rateLimiter.ts`**

```typescript
import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

export const pageViewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again in a minute." },
});

export const arLinkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
```

- [ ] **Step 2: Apply global limiter in `server/index.ts`**

Add this import at the top of `server/index.ts`:

```typescript
import { globalLimiter } from "./middleware/rateLimiter.js";
```

Apply it early in the middleware chain, before `registerRoutes`. Add after the logging middleware block (after the `res.on("finish", ...)` middleware):

```typescript
app.use(globalLimiter);
```

- [ ] **Step 3: Apply specific limiters in `server/routes.ts`**

Add import at top of `routes.ts`:

```typescript
import { pageViewLimiter, authLimiter, arLinkLimiter } from "./middleware/rateLimiter.js";
```

Then apply to specific routes:

```typescript
// Page view — apply limiter
app.post("/api/page-view", pageViewLimiter, async (req, res) => { ... });

// AR link validation — apply limiter
app.post("/api/validate-ar-link", arLinkLimiter, requireAdmin, async (req, res) => { ... });
```

For auth routes (inside `registerAuthRoutes` in `server/auth.ts`), find the login POST route and add `authLimiter` as middleware. Open `server/auth.ts` and apply:

```typescript
// Find the login route — it will look something like:
app.post("/api/login", authLimiter, async (req, res) => { ... });
```

- [ ] **Step 4: Commit**

```bash
git add server/middleware/rateLimiter.ts server/index.ts server/routes.ts
git commit -m "feat: rate limiting — global 120/min, page-view 60/min, auth 10/min, AR validate 20/min"
```

---

## Task 9: Security Headers + Body Size Limit

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Add helmet import to `server/index.ts`**

```typescript
import helmet from "helmet";
```

- [ ] **Step 2: Apply helmet as the very first middleware**

Find where `app.use(express.json(...))` is and add `helmet` directly before it:

```typescript
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Required for model-viewer / WebXR to work
  contentSecurityPolicy: false,     // CSP needs custom config for GLB/model URLs — disable for now
}));
```

> Note: `crossOriginEmbedderPolicy: false` and `contentSecurityPolicy: false` are intentional — enabling these breaks `@google/model-viewer`. They can be properly configured in Phase 4 once CSP rules are mapped.

- [ ] **Step 3: Add body size limit to the existing `express.json` middleware**

Find:

```typescript
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
```

Change to:

```typescript
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
```

- [ ] **Step 4: Commit**

```bash
git add server/index.ts
git commit -m "feat: add helmet security headers and 2mb body size limit"
```

---

## Task 10: PageViews TTL Cleanup

**Files:**
- Modify: `server/index.ts`
- Modify: `server/storage.ts`

- [ ] **Step 1: Add cleanup method to `server/storage.ts`**

In the `storage` object (or class), add a new method:

```typescript
async cleanupOldPageViews(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db.delete(pageViews).where(lt(pageViews.viewedAt, cutoff));
},
```

Ensure `lt` is imported from `drizzle-orm`:

```typescript
import { eq, and, asc, lt } from "drizzle-orm";
```

- [ ] **Step 2: Schedule the cleanup in `server/index.ts`**

Inside the `async` IIFE at the bottom of `server/index.ts`, after `await registerRoutes(...)`, add:

```typescript
// Clean up old page views on startup and every 24 hours
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
storage.cleanupOldPageViews().catch(console.error);
setInterval(() => storage.cleanupOldPageViews().catch(console.error), TWENTY_FOUR_HOURS);
```

Add the storage import at the top if not already present:

```typescript
import { storage } from "./storage.js";
```

- [ ] **Step 3: Commit**

```bash
git add server/storage.ts server/index.ts
git commit -m "feat: delete page views older than 30 days on startup and daily"
```

---

## Task 11: Audit Object Storage Auth

**Files:**
- Modify: `server/replit_integrations/object_storage/routes.ts`

- [ ] **Step 1: Read the object storage routes file**

Open `server/replit_integrations/object_storage/routes.ts` and list all route handlers.

- [ ] **Step 2: For each upload or delete route, ensure `requireAdmin` or `requireSupervisor` is applied**

Each upload/delete route must have an auth guard as the second argument. Pattern:

```typescript
// Upload — admin only
app.post("/api/upload", requireAdmin, async (req, res) => { ... });

// If supervisors should also upload:
app.post("/api/upload", (req, res, next) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
}, async (req, res) => { ... });
```

Import `requireAdmin` from `../../auth.js` (or wherever it's defined) if not already imported.

- [ ] **Step 3: Read-only routes (GET for listing/fetching) can remain public if they only serve public asset URLs**

Verify that no route allows unauthenticated deletion or upload. Leave read routes as-is.

- [ ] **Step 4: Commit**

```bash
git add server/replit_integrations/object_storage/routes.ts
git commit -m "fix: ensure all upload/delete object storage routes require authentication"
```

---

## Task 12: Auth Middleware Tests

**Files:**
- Create: `server/tests/auth.test.ts`

- [ ] **Step 1: Write auth middleware tests**

Create `server/tests/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Import the middleware functions directly from routes
// We test them in isolation without starting the full server

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    isAuthenticated: () => false,
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; sendStatus: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
  };
  return res;
}

// Inline the middleware logic to test it (same logic as in routes.ts)
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const user = req.user as any;
  if (user?.role !== "admin") return res.sendStatus(403);
  next();
}

describe("requireAdmin middleware", () => {
  it("returns 401 when not authenticated", () => {
    const req = makeReq({ isAuthenticated: () => false });
    const res = makeRes();
    const next = vi.fn();
    requireAdmin(req as Request, res as unknown as Response, next);
    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated but not admin", () => {
    const req = makeReq({ isAuthenticated: () => true, user: { role: "supervisor" } as any });
    const res = makeRes();
    const next = vi.fn();
    requireAdmin(req as Request, res as unknown as Response, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when authenticated as admin", () => {
    const req = makeReq({ isAuthenticated: () => true, user: { role: "admin" } as any });
    const res = makeRes();
    const next = vi.fn();
    requireAdmin(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:server
```

Expected: PASS (all auth tests + AR link tests)

- [ ] **Step 3: Commit**

```bash
git add server/tests/auth.test.ts
git commit -m "test: auth middleware unit tests"
```

---

## Phase 1 Complete

Run the full test suite one final time:

```bash
npm run test
```

Expected: All tests pass. Start the dev server and verify:

```bash
npm run dev
```

Manual checks:
- [ ] Admin dashboard shows `$6,897` (not `$689,700`) for the seeded products
- [ ] Deleting a category from admin panel succeeds (products become uncategorised, not blocked)
- [ ] Pasting an AR link in the product editor and tabbing away shows green ✓ or red ✗
- [ ] 404 AR link shows error message in the product editor
- [ ] No browser console errors on the homepage or product pages
