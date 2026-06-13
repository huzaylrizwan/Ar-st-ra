# Luxury AR Furniture Website — CLAUDE.md

## Project Overview

A luxury furniture showcase website with AR (Augmented Reality) visualization. No cart or checkout — customers browse products, view furniture in their real space via AR, and contact the business to buy. Hosted on Replit.

**Live roles:**
- Public visitor — browses, uses AR, submits inquiries
- Admin — full content control (products, categories, themes, analytics)
- Supervisor — limited role (contact info + products only)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Routing | wouter |
| State | TanStack Query (React Query v5) |
| Animations | framer-motion |
| Carousel | embla-carousel-react |
| AR / 3D | @google/model-viewer |
| Backend | Node.js + Express 5, TypeScript (ESM — `"type": "module"`) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Replit OIDC + passport-local (local auth added in Phase 4) |
| File storage | Replit Object Storage (adapter pattern added in Phase 4) |
| Validation | Zod |
| Testing | Vitest + @testing-library/react + supertest |

---

## Development Commands

```bash
npm run dev          # Start dev server (tsx server/index.ts)
npm run build        # Production build
npm run db:push      # Push schema changes to DB (drizzle-kit push)
npm run test         # Run all tests (server + client)
npm run test:server  # Server tests only (vitest.config.server.ts)
npm run test:client  # Client tests only (vitest.config.client.ts)
npm run check        # TypeScript type check
```

---

## Key Files

```
shared/schema.ts                        — All DB table definitions + Zod schemas + types
shared/routes.ts                        — Typed API route definitions
server/index.ts                         — Express app entry point, middleware setup
server/routes.ts                        — All API route handlers
server/storage.ts                       — All DB query methods (storage object)
server/db.ts                            — Drizzle DB connection
server/auth.ts                          — Replit OIDC auth setup
server/middleware/rateLimiter.ts        — Rate limit configs (added Phase 1)
server/arLinkValidator.ts               — AR link double-validation (added Phase 1)
server/config.ts                        — Validated env config via Zod (added Phase 4)
server/localAuth.ts                     — Passport-local auth strategy (added Phase 4)
server/storage/StorageAdapter.ts        — File storage interface (added Phase 4)
client/src/App.tsx                      — Routes + auth guards
client/src/components/Layout.tsx        — Navbar, footer, promo banner
client/src/components/ARStudio.tsx      — Full-screen 3D/AR viewer (model-viewer)
client/src/pages/Home.tsx               — Homepage (hero, categories, products, AR section)
client/src/pages/ProductDetails.tsx     — Product page with AR button
client/src/pages/admin/Dashboard.tsx    — Admin dashboard
client/src/pages/admin/AdminProductEditor.tsx — Create/edit products
client/src/pages/admin/Settings.tsx     — Theme, branding, contact settings
docs/superpowers/specs/                 — Design documents
docs/superpowers/plans/                 — Implementation plans (4 phases)
```

---

## Database Schema (Key Tables)

```
categories        id, name, slug, imageUrl, isHidden, sortOrder
products          id, categoryId(nullable), name, description, price(cents),
                  arLink, colors[], sizes[], images[], isHidden, stockStatus,
                  sortOrder
themeSettings     brandName, primaryColor, fontFamily, logoUrl, currencySymbol,
                  whatsappNumber, instagramUrl, facebookUrl, address, mapEmbedUrl,
                  contactEmail, privacyPolicyUrl, termsUrl, aboutUrl,
                  showBanner, showCollections, showNewArrivals, showPhilosophy, showARSection,
                  heroSlideInterval, arStudioTab1Label/Icon, arStudioTab2Label/Icon,
                  studioSidebarColor/Opacity, studioBottomBarColor/Opacity
banners           id, text, isActive, sortOrder
faqItems          id, question, answer, sortOrder, isVisible
heroImages        id, url, name, isPreset, isActive
productModels     id, productId, name, modelUrl, thumbnailUrl, isDefault, sortOrder
productMaterials  id, productId, modelId, name, colorHex, colorName, textureUrl,
                  variantModelUrl, materialSlotIndex, uvScale, sortOrder, isDefault
productMeasurements id, productId, label, value, sortOrder
supervisors       id, email, name, passwordHash, addedAt
inquiries         id, productId, productName, customerName, contact, message,
                  selectedColor, selectedSize, createdAt, isRead
pageViews         id, sessionId, path, viewedAt
```

**Important:** Price is stored in cents (integer). Always divide by 100 for display.  
**Important:** `productMaterials.materialSlotIndex` is the GLB material slot (0-based). `uvScale` controls texture tiling.

---

## AR / 3D Notes

- AR uses `@google/model-viewer` web component
- `ARStudio` component renders a full-screen overlay with model-viewer
- Materials can swap textures or entire GLB models (`variantModelUrl`)
- `applyTextureOrColor` uses `material.materialSlotIndex` (not hardcoded slot 0)
- UV scale is per-material: `material.uvScale` (default 8.0)
- AR Studio appearance (sidebar/bottom bar color+opacity) is persisted in `themeSettings` DB

---

## Auth Notes

- **Replit Auth (OIDC):** Controlled by `REPLIT_AUTH_ENABLED=true` env var (default true)
- **Local Auth:** `POST /api/auth/login` with `{ email, password }`. One-time setup via `POST /api/auth/setup` (disabled after first admin exists)
- Admin role checked via `req.user.role === "admin"`
- Supervisors are identified by email match in the `supervisors` table

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | — | Min 32 chars |
| `STORAGE_PROVIDER` | — | `local` | `replit` or `local` |
| `REPLIT_AUTH_ENABLED` | — | `false` | Set `true` on Replit |
| `PORT` | — | `5000` | |
| `NODE_ENV` | — | `development` | |
| `UPLOAD_DIR` | — | `./uploads` | Used when STORAGE_PROVIDER=local |

---

## Improvement Plan — Progress Tracker

A full 4-phase overhaul was designed and planned. See:
- **Design spec:** `docs/superpowers/specs/2026-06-13-luxury-ar-furniture-full-overhaul-design.md`
- **Phase 1 plan:** `docs/superpowers/plans/2026-06-13-phase1-bug-fixes-security.md`
- **Phase 2 plan:** `docs/superpowers/plans/2026-06-13-phase2-ux-enhancements.md`
- **Phase 3 plan:** `docs/superpowers/plans/2026-06-13-phase3-admin-features.md`
- **Phase 4 plan:** `docs/superpowers/plans/2026-06-13-phase4-production-readiness.md`

### Phase 1 — Bug Fixes & Security ⬜ NOT STARTED
- [ ] Task 1: Install deps + Vitest test infrastructure
- [ ] Task 2: Fix Dashboard cents bug (TDD)
- [ ] Task 3: Schema — categoryId nullable + sortOrder on products
- [ ] Task 4: Schema — materialSlotIndex + uvScale on productMaterials
- [ ] Task 5: Fix ARStudio multi-material + UV scale
- [ ] Task 6: AR link validation backend (TDD)
- [ ] Task 7: AR link validation UI in AdminProductEditor
- [ ] Task 8: Rate limiting middleware
- [ ] Task 9: Security headers (helmet) + body size limit
- [ ] Task 10: PageViews TTL cleanup
- [ ] Task 11: Audit object storage auth
- [ ] Task 12: Auth middleware tests

### Phase 2 — UX Enhancements ⬜ NOT STARTED
- [ ] Task 1: Schema — themeSettings new fields + stockStatus
- [ ] Task 2: Inquiries table + backend routes
- [ ] Task 3: ProductInquirySheet component
- [ ] Task 4: Color & size selection state + inquiry button in ProductDetails
- [ ] Task 5: Stock status on ProductDetails + ProductCard + admin editor
- [ ] Task 6: Collections page search & filter
- [ ] Task 7: Footer dynamic categories + broken links fix
- [ ] Task 8: AR device capability check + QR code fallback
- [ ] Task 9: AR loading progress bar

### Phase 3 — Admin Power Features ⬜ NOT STARTED
- [ ] Task 1: Schema — heroSlideInterval + analytics storage methods
- [ ] Task 2: Analytics API routes
- [ ] Task 3: Analytics dashboard page (recharts)
- [ ] Task 4: Drag-to-reorder products (dnd-kit)
- [ ] Task 5: Drag-to-reorder categories
- [ ] Task 6: Inquiry log admin page + unread badge
- [ ] Task 7: Hero image slideshow (multi-active)
- [ ] Task 8: Settings page tabbed layout
- [ ] Task 9: Product editor — image reorder + materialSlotIndex/uvScale/colorName fields

### Phase 4 — Production Readiness ⬜ NOT STARTED
- [ ] Task 1: Validated environment config (server/config.ts)
- [ ] Task 2: Local auth — passport-local strategy
- [ ] Task 3: Storage adapter (LocalDisk + Replit wrapper)
- [ ] Task 4: CSRF protection
- [ ] Task 5: React error boundaries
- [ ] Task 6: Pino structured logging + improved error handler
- [ ] Task 7: Integration tests — Products CRUD
- [ ] Task 8: Final test suite verification

---

## How to Update Progress

When a task is complete, change `- [ ]` to `- [x]` in this file.  
When a phase is complete, change `⬜ NOT STARTED` to `✅ COMPLETE`.  
In progress phases: `🔄 IN PROGRESS (Task N/12)`
