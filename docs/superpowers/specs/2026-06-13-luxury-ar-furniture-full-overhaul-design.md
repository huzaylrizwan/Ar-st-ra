# Luxury AR Furniture Website — Full Overhaul Design Spec

**Date:** 2026-06-13  
**Status:** Approved  
**Approach:** Phased overhaul (B) — fix bugs first, improve UX second, add admin power third, harden architecture last.

---

## 1. Project Context

A luxury furniture showcase website with AR (Augmented Reality) visualization. No cart or checkout — customers browse, view furniture in their space via AR, and contact the business to purchase. Built on React + TypeScript + Express + PostgreSQL + Drizzle ORM, currently hosted on Replit.

**Core user roles:**
- **Public visitor** — browses products, uses AR viewer, submits inquiries
- **Admin** — manages all content, themes, users, analytics
- **Supervisor** — manages contact info and products (limited admin)

---

## 2. Phase 1 — Critical Bug Fixes & Security Hardening

### 2.1 Database Fixes

**FK cascade on category deletion**  
Two changes required together:
1. Make `products.categoryId` **nullable** (remove `notNull()` from the column definition)
2. Add `onDelete: "set null"` to the foreign key reference

When a category is deleted, its products have `categoryId` set to null (they become uncategorised, not deleted). Admin sees uncategorised products under an "Uncategorised" filter in the product list. This prevents the current silent FK constraint crash.

**`arLink` schema alignment**  
`arLink` stays `notNull()` but the product editor enforces: if no AR link is provided, store empty string `""`. UI already handles `if (product.arLink)` correctly. Add a Zod refinement in the insert schema to disallow whitespace-only values.

**`sortOrder` on products table**  
New column: `sortOrder integer NOT NULL DEFAULT 0` on the `products` table. Admin-controlled via drag-to-reorder (Phase 3). All existing products get `sortOrder = id` on migration (preserves current order).

**`pageViews` TTL cleanup**  
Add a server-side scheduled cleanup: on server startup, and every 24 hours, delete `pageViews` rows where `viewedAt < NOW() - INTERVAL '30 days'`. Uses `setInterval` in `server/index.ts`. No external cron needed.

### 2.2 Dashboard Cents Bug

`Dashboard.tsx` line 24: divide accumulated price by 100 before display.

```tsx
// Before
value: `$${products?.reduce((acc, p) => acc + p.price, 0).toLocaleString() || 0}`

// After
value: `$${((products?.reduce((acc, p) => acc + p.price, 0) ?? 0) / 100).toLocaleString()}`
```

### 2.3 AR Link Validation

**New server route:** `POST /api/validate-ar-link`  
- Body: `{ url: string }`  
- Requires: admin or supervisor auth  
- Logic:
  1. Attempt HEAD request to `url` (attempt 1)
  2. If HEAD fails or returns non-2xx, attempt GET request (attempt 2)
  3. Return `{ valid: boolean, statusCode: number, attempt: 1 | 2, message: string }`
- Timeout: 8 seconds per attempt
- Rate limit: 20 req/min per user

**In `AdminProductEditor`:** When the admin finishes typing in the AR Link field (on blur) or clicks a "Validate" button, call this endpoint. Show inline status: green checkmark + "Link verified" or red warning + HTTP status. The save button is not blocked (admin may paste a private URL that the server can't reach), but a warning is shown if invalid.

### 2.4 Security

**Rate limiting**  
Install `express-rate-limit`. Apply:
- Global: 120 req/min per IP
- `/api/page-view`: 60 req/min per IP
- `/api/auth/login`: 10 req/min per IP
- `/api/validate-ar-link`: 20 req/min per authenticated user

**Object storage auth audit**  
Every route registered in `registerObjectStorageRoutes` must be wrapped with `requireAdmin` or `requireSupervisor`. Audit and patch any public upload/delete endpoints.

**Supervisor auth documentation**  
When `passwordHash` is null, the supervisor panel tooltip shows: "This supervisor authenticates via their Replit account." Admin UI clarifies this when adding supervisors.

**Security headers**  
Install `helmet`. Add to `server/index.ts` as first middleware:
```typescript
app.use(helmet());
```
Defaults cover: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `X-DNS-Prefetch-Control`.

**Body size limit**  
```typescript
app.use(express.json({ limit: '2mb' }));
```

### 2.5 AR Multi-Material Fix

**New field on `productMaterials`:** `materialSlotIndex integer NOT NULL DEFAULT 0`

In `ARStudio.tsx`, `applyTextureOrColor` currently hardcodes `model.materials[0]`. Change to:

```typescript
const slotIndex = material.materialSlotIndex ?? 0;
const mat = model.materials[slotIndex];
if (!mat) return; // slot doesn't exist in this GLB
```

Admin sets `materialSlotIndex` in the material editor. Field label: "GLB Material Slot (0 = first material)".

**New field on `productMaterials`:** `uvScale real NOT NULL DEFAULT 8.0`

Replace hardcoded `{ u: 8, v: 8 }` in `ARStudio.tsx` with `material.uvScale ?? 8.0`. Admin sets this per material. Field label: "Texture Tiling Scale".

---

## 3. Phase 2 — UX Enhancements (Customer-Facing)

### 3.1 Functional Color & Size Selection

**Color selection state in `ProductDetails`:**
- `selectedColor: string | null` state, initialized to `null`
- Clicking a swatch sets `selectedColor` to the hex string
- Active swatch: `ring-2 ring-offset-2 ring-primary scale-110`
- Label below swatches: "Finish: {colorHex}" (admin can optionally store color names — see Phase 3.7)
- When AR Studio opens with a `selectedColor`, it auto-applies the matching `ProductMaterial` where `colorHex === selectedColor`

**Size selection state in `ProductDetails`:**
- `selectedSize: string | null` state, initialized to `null`
- Active pill: filled background + primary text color
- Selected size is included in the inquiry form (Phase 3.3)

### 3.2 Search & Filter on Collections Page

**UI:** Sticky filter bar below the page header on `/categories`.

**Filters:**
- **Text search** — client-side `filter` on `product.name` and `product.description` (case-insensitive). Debounced 200ms.
- **Price range** — dual-handle Radix Slider. Min/max derived from the current category's product prices.
- **Color filter** — color dot chips from all unique `product.colors` in the category. Multi-select.
- **Sort** — `<select>`: Price Low→High, Price High→Low, Name A→Z, Name Z→A, Default (admin order).

**URL sync:** All filter state serialized to URL search params (`?search=velvet&minPrice=100&maxPrice=5000&colors=%23FF0000&sort=price_asc`). `useSearchParams` hook or manual `URLSearchParams` in wouter.

**Empty state:** "No products match your filters" with a "Clear filters" button.

### 3.3 Product Inquiry Flow

**Trigger:** "Request Information" button rendered below the AR button on every `ProductDetails` page.

**UI:** 
- Mobile: `<Sheet>` (bottom drawer, already in shadcn)
- Desktop: `<Dialog>` (modal)

**Form fields:**
```
Product:        [pre-filled, read-only]
Selected Finish: [pre-filled from selectedColor, editable]
Selected Size:   [pre-filled from selectedSize, editable]
Your Name:       [text input, required]
Contact:         [text input — phone or email, required]
Message:         [textarea, optional]
```

**Submission:**
1. POST `{ productId, productName, selectedColor, selectedSize, customerName, contact, message }` to `POST /api/inquiries` (public, rate-limited: 5/min per IP)
2. On success, open WhatsApp deep link if `settings.whatsappNumber` is set:
   ```
   https://wa.me/{number}?text=Inquiry for {productName}...
   ```
   Otherwise open `mailto:` link.
3. Show "Message sent!" toast on the product page.

**Backend:** New `inquiries` table (see Phase 3.4).

### 3.4 Footer & Static Link Fixes

**Dynamic footer categories:** Replace hardcoded links with `useCategories()`. Show up to 5 visible categories. Each links to `/categories?id={category.id}`.

**Newsletter form:** On submit, if `settings.whatsappNumber` is configured, open `https://wa.me/{number}?text=Newsletter+subscription:+{inputValue}`. If `settings.contactEmail` is configured (new optional field), open `mailto:{contactEmail}?subject=Newsletter+Subscription&body=Email:+{inputValue}`. If neither is set, show toast: "Please contact us directly to subscribe."

**Privacy Policy & Terms links:** New `themeSettings` fields `privacyPolicyUrl` and `termsUrl`. If null, footer links are hidden. If set, links open in a new tab.

**"Read Our Story" button:** New `themeSettings` field `aboutUrl`. If null, button is hidden. If set, button navigates to that URL.

### 3.5 AR Device Capability Check

On `ProductDetails`, before rendering the "View in Reality" button:

```typescript
const [arSupported, setArSupported] = useState<boolean | null>(null);

useEffect(() => {
  const checkAR = async () => {
    const iosAR = document.createElement('a').relList?.supports('ar');
    const webxrAR = await navigator.xr?.isSessionSupported('immersive-ar').catch(() => false);
    setArSupported(!!(iosAR || webxrAR));
  };
  checkAR();
}, []);
```

**If AR not supported:** Replace the "View in Reality" button with a QR code panel:
```
[QR code of current product URL]
"Scan on your phone to view in your space"
```
QR generated client-side using `qrcode.react` (install: `npm i qrcode.react`). No server call needed.

**If AR support unknown (null, still checking):** Show the button normally (fail open).

### 3.6 Model Loading Progress Bar

Model Viewer emits `progress` events. Replace the full-screen spinner overlay with a thin progress bar:

```typescript
mv.addEventListener('progress', (e: CustomEvent) => {
  const { loaded, total } = e.detail;
  setLoadProgress(total > 0 ? loaded / total : 0);
});
```

Show a 2px gold bar at the very top of the AR Studio (`position: absolute; top: 0; left: 0; height: 2px; background: gold; width: {progress * 100}%`). Spinner removed. The bottom bar shows "Loading… {Math.round(progress * 100)}%" instead of just "Loading…".

### 3.7 Stock Status on Products

**New field on `products`:** `stockStatus text NOT NULL DEFAULT 'in_stock'`  
Values: `'in_stock' | 'made_to_order' | 'out_of_stock'`

**`ProductDetails` rendering:**
- `in_stock` → ✅ "In Stock & Ready to Ship" (green)
- `made_to_order` → 🕐 "Made to Order — 6–8 Weeks" (amber)
- `out_of_stock` → ❌ "Currently Unavailable" (red); AR button hidden; inquiry button still shown

**`ProductCard` (grid card):** Show a small badge in the corner for `made_to_order` and `out_of_stock`.

---

## 4. Phase 3 — Admin Power Features & Analytics

### 4.1 Analytics Dashboard

**Replace** the current 4-card dashboard with a structured layout.

**New backend routes** (require auth):

```
GET /api/analytics/summary
Response: {
  todayViews: number,
  liveVisitors: number,
  last30Days: { date: string, views: number }[],
  topProducts: { path: string, productName: string, views: number }[],
  topCategories: { path: string, categoryName: string, views: number }[]
}

GET /api/analytics/catalog-health
Response: {
  productsNoArLink: number,
  productsHidden: number,
  productsNoImages: number,
  categoriesEmpty: number,
  productsNoStock: number
}
```

**Dashboard layout:**

Row 1 — Live KPIs (auto-refresh every 30s):
- Live visitors now | Today's page views | Top page today

Row 2 — Trend chart (recharts `LineChart`, already available via `chart.tsx`):
- Daily sessions over last 30 days

Row 3 — Top content (recharts `BarChart`):
- Top 5 products by views | Top 5 categories by views

Row 4 — Catalog health cards (warning colours):
- Products without AR | Hidden products | Products without images | Empty categories

### 4.2 Drag-to-Reorder Products & Categories

**Install:** `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**Admin Products page:** Wrap product table rows with `<SortableContext>`. On drag end:
1. Optimistically reorder the local list
2. `PATCH /api/products/reorder` with `[{ id, sortOrder }]`
3. Invalidate products query on success

**Admin Categories page:** Same pattern.

**New backend route:**
```
PATCH /api/products/reorder     → body: [{ id: number, sortOrder: number }]
PATCH /api/categories/reorder   → body: [{ id: number, sortOrder: number }]
```
Both require `requireAdmin`.

### 4.3 Bulk Product Operations

**UI:** Checkbox column in the Admin Products table. "Select all" checkbox in header. Bulk action bar appears at the bottom when ≥1 items selected.

**Bulk actions:** Hide | Show | Delete (delete shows a confirmation dialog with count)

**New backend route:**
```
PATCH /api/products/bulk
Body: { ids: number[], action: 'hide' | 'show' | 'delete' }
Requires: requireAdmin
```

### 4.4 Inquiry Log

**New `inquiries` table:**
```sql
id          serial PRIMARY KEY,
productId   integer REFERENCES products(id) ON DELETE SET NULL,
productName text NOT NULL,
customerName text NOT NULL,
contact     text NOT NULL,
message     text,
selectedColor text,
selectedSize  text,
createdAt   timestamp DEFAULT NOW(),
isRead      boolean DEFAULT false
```

**Admin route:** `GET /api/inquiries` (requireAdmin) — returns all inquiries sorted by `createdAt DESC`.  
**Mark read:** `PATCH /api/inquiries/:id/read`  
**Delete:** `DELETE /api/inquiries/:id`

**Admin nav:** New "Inquiries" item with an unread count badge. Badge updates every 60s via polling.

**New backend route:**
```
GET /api/inquiries/unread-count   → { count: number }   requires: requireAdmin
```

**Inquiries page:** Table with columns: Date | Product | Customer | Contact | Message preview | Status. Click row to expand full message. Mark read on open.

### 4.5 Hero Image Slideshow

**Schema change:** `heroImages.isActive` changes semantics — multiple images can be active simultaneously (they all participate in the slideshow).

**New `themeSettings` field:** `heroSlideInterval integer DEFAULT 5` (seconds, range 3–15).

**Homepage `Home.tsx`:** Replace `activeHeroImage` query (single image) with `heroImages.active` list query. Render a crossfade slideshow using Framer Motion `AnimatePresence`. Dot indicators at the bottom of the hero section show count and current position.

**Admin Banners page** (or new Hero Images tab in Settings): Multi-select toggle for which images are "active in slideshow". Interval slider.

### 4.6 Settings — Tabbed Layout

Replace the current single-scroll Settings page with a `<Tabs>` layout (shadcn Tabs):

| Tab | Fields |
|---|---|
| Branding | brandName, logoUrl, primaryColor, fontFamily, currencySymbol |
| Homepage | showCollections, showNewArrivals, showPhilosophy, showARSection, heroSlideInterval |
| Contact | whatsappNumber, instagramUrl, facebookUrl, address, mapEmbedUrl |
| Pages | privacyPolicyUrl, termsUrl, aboutUrl |
| AR Studio | arStudioTab1Label, arStudioTab1Icon, arStudioTab2Label, arStudioTab2Icon, studioSidebarColor, studioSidebarOpacity, studioBottomBarColor, studioBottomBarOpacity |

Each tab saves independently (no single giant PUT). Each tab section POSTs only its own fields subset.

### 4.7 Product Editor Improvements

- **Image drag-to-reorder** using `@dnd-kit/sortable` — the first image in the array becomes the cover image shown in cards
- **AR link validator** — inline validation (Phase 1.3) with visual feedback
- **Stock status** — dropdown (`in_stock` / `made_to_order` / `out_of_stock`)
- **Material slot index** — numeric input per material (0-based GLB slot index)
- **UV tiling scale** — numeric input per material (default 8.0)
- **Color names** — optional text field alongside color hex (e.g. "Obsidian", "Pearl") shown to customers on ProductDetails

---

## 5. Phase 4 — Architecture & Production Readiness

### 5.1 Portable Authentication

**New Passport.js local strategy** alongside existing Replit Auth.

**Routes (new):**
```
POST /api/auth/login    → { email, password } → sets session → returns { user }
POST /api/auth/logout   → destroys session
GET  /api/auth/me       → returns { user } or 401
POST /api/auth/setup    → one-time admin seed (disabled after first user created)
```

**Environment flag:** `REPLIT_AUTH_ENABLED=true` (default `true` to preserve current behaviour). When `false`, Replit OIDC routes are not registered.

**No breaking change:** Existing Replit sessions continue to work. Local auth is additive.

### 5.2 Storage Adapter

**Interface:**
```typescript
interface StorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>; // returns public URL
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}
```

**Implementations:**
- `ReplitStorageAdapter` — wraps current Replit integration
- `LocalDiskAdapter` — saves to `./uploads/`, served via `express.static`

**Selection:** `STORAGE_PROVIDER=replit|local` env var. Default: `replit`. S3 adapter is a future addition to the same interface.

**All upload routes** in `registerObjectStorageRoutes` refactored to call `storageAdapter.upload()` rather than Replit SDK directly.

### 5.3 Validated Environment Config

New file `server/config.ts`:

```typescript
import { z } from "zod";

export const config = z.object({
  DATABASE_URL: z.string(),
  SESSION_SECRET: z.string().min(32),
  STORAGE_PROVIDER: z.enum(['replit', 'local']).default('local'),
  REPLIT_AUTH_ENABLED: z.coerce.boolean().default(true),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
}).parse(process.env);
```

Server crashes on startup with a descriptive error if required variables are missing. All files import from `config.ts` rather than reading `process.env` directly.

### 5.4 API Hardening

**Rate limiting:** `express-rate-limit` applied globally (120/min) and on sensitive routes (auth: 10/min, page-view: 60/min, inquiries: 5/min, validate-ar-link: 20/min).

**Security headers:** `helmet` as first middleware.

**Body limits:** `express.json({ limit: '2mb' })`.

**CSRF:** `csurf` on all state-mutating routes. Frontend `queryClient.ts` fetches CSRF token from `GET /api/csrf-token` on startup and attaches to all mutations via a default header.

### 5.5 Database Migrations

Enable Drizzle Kit migrations workflow:

```bash
npm run db:generate   # drizzle-kit generate → creates /drizzle/*.sql files
npm run db:migrate    # drizzle-kit migrate → applies to DB
```

All schema changes from Phases 1–3 are expressed as Drizzle migration files, not raw pushes. Server startup in production auto-applies pending migrations.

### 5.6 Error Handling

**React `ErrorBoundary`:**  
Wraps `ARStudio` and each major page section. Fallback UI for AR Studio: "3D view unavailable — please refresh your browser." Generic fallback for page sections: "Something went wrong loading this section."

**Express global error handler:**  
```typescript
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status ?? 500).json({
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    code: err.code ?? 'INTERNAL_ERROR'
  });
});
```

**Structured logging:**  
Install `pino` + `pino-http`. Replace all `console.error` / `console.log` in server code with `logger.error` / `logger.info`. JSON output in production, pretty-print in development.

### 5.7 Basic Test Suite

**Stack:** Vitest + supertest (backend), Vitest + React Testing Library (frontend).

**Backend tests (`server/tests/`):**
- `auth.test.ts` — unauthenticated → 401, non-admin → 403, admin → 200
- `ar-link.test.ts` — valid URL → `{ valid: true }`, unreachable URL → `{ valid: false }`
- `products.test.ts` — CRUD round-trip, bulk reorder
- `rate-limit.test.ts` — page-view endpoint blocks after 60 req/min

**Frontend tests (`client/src/tests/`):**
- `ProductDetails.test.tsx` — AR button shown/hidden based on `arLink`
- `Dashboard.test.tsx` — Total Value shows dollars, not cents
- `ARStudio.test.tsx` — close button fires `onClose`, model-viewer gets correct `src`

Estimated ~30 tests total.

---

## 6. New Database Fields Summary

All new fields introduced across phases:

| Table | Field | Type | Default | Phase |
|---|---|---|---|---|
| `products` | `sortOrder` | integer | 0 | 1 |
| `products` | `stockStatus` | text | `'in_stock'` | 2 |
| `productMaterials` | `materialSlotIndex` | integer | 0 | 1 |
| `productMaterials` | `uvScale` | real | 8.0 | 2 |
| `productMaterials` | `colorName` | text | null | 3 |
| `themeSettings` | `privacyPolicyUrl` | text | null | 2 |
| `themeSettings` | `termsUrl` | text | null | 2 |
| `themeSettings` | `aboutUrl` | text | null | 2 |
| `themeSettings` | `contactEmail` | text | null | 2 |
| `themeSettings` | `heroSlideInterval` | integer | 5 | 3 |
| `heroImages` | *(isActive semantics change)* | — | — | 3 |
| `inquiries` | *(new table)* | — | — | 3 |

---

## 7. New Dependencies Summary

| Package | Purpose | Phase |
|---|---|---|
| `express-rate-limit` | API rate limiting | 1 |
| `helmet` | Security headers | 4 |
| `qrcode.react` | QR code for AR fallback | 2 |
| `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` | Drag-to-reorder | 3 |
| `pino pino-http` | Structured logging | 4 |
| `vitest @testing-library/react` | Test suite | 4 |
| `supertest` | Backend API tests | 4 |

---

## 8. Delivery Sequence

```
Phase 1 (Week 1):   DB fixes → cents bug → AR validation → security → multi-material fix
Phase 2 (Week 2–3): Color/size state → search/filter → inquiry flow → footer fixes → AR device check → stock status
Phase 3 (Week 3–4): Analytics dashboard → drag-reorder → bulk ops → inquiry log → hero slideshow → settings tabs → product editor
Phase 4 (Week 5):   Local auth → storage adapter → env config → CSRF → migrations → error boundaries → test suite
```

Each phase is independently deployable and leaves the site in a better state than before.
