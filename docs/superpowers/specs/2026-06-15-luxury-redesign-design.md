# Luxury AR Furniture — Full Site Redesign Design Spec

**Date:** 2026-06-15  
**Status:** Approved for implementation

---

## Goal

Elevate every surface of the site to match the quality of its two existing standout features — the glass navbar and the 3D AR viewer — so the premium impression holds from first visit to purchase inquiry. Simultaneously add a 3-way theme engine (admin-switchable), embed the 3D viewer directly into the product page, and make the admin product editor flexible enough to add any product detail without code changes.

---

## Guiding Principle

The glass navbar (`backdrop-blur-md`, `bg-background/80`) and the 3D model-viewer are already at international brand quality. Everything else — cards, product page, homepage sections, footer — must be raised to that same level. We are not rebuilding from scratch; we are pulling the glass + 3D quality across every other surface.

Benchmark brands: **Minotti, B&B Italia, Poliform, Molteni&C, Restoration Hardware, Natuzzi**

---

## Part 1 — Design System

### 1.1 Three-Theme Engine

Three named themes, each a complete set of CSS custom properties. A single `data-theme` attribute on `<html>` switches the entire site.

**Theme names (stored as string values):**
- `dark-obsidian` — deep navy/charcoal backgrounds, gold accents, glowing glass
- `white-marble` — warm off-white/cream backgrounds, tan/brass accents, frosted glass
- `warm-dusk` — deep warm brown backgrounds, amber/terracotta accents, warm glass

**Theme stored in DB:** `themeSettings.activeThemePreset` already exists (currently stores `"gold"`). Change its accepted values to the three names above. Rename internal references from "preset" to "theme" in UI only — the column name stays.

**Token architecture (25 tokens per theme):**

| Token | Purpose |
|---|---|
| `--bg` | Page background |
| `--surface-1` | Card/panel background |
| `--surface-2` | Nested panel / input background |
| `--glass-bg` | Glass component rgba background |
| `--glass-border` | Glass component border rgba |
| `--glass-blur` | Backdrop-filter blur value |
| `--accent` | Primary accent (gold / tan / amber) |
| `--accent-glow` | Glow shadow color (rgba of accent) |
| `--text-primary` | Body text |
| `--text-secondary` | Muted text |
| `--text-accent` | Accent-colored text |
| `--border` | Standard border |
| `--radius-card` | Card corner radius (20px) |
| `--radius-btn` | Button corner radius (12px) |
| `--radius-input` | Input corner radius (10px) |
| `--radius-modal` | Modal corner radius (24px) |
| `--radius-pill` | Pill/badge corner radius (999px) |
| `--shadow-card` | Card box-shadow |
| `--shadow-glow` | Glow effect shadow |
| `--nav-bg` | Navbar glass background (scrolled) |

**Critical:** Current `--radius: 0.25rem` (4px) in index.css is replaced by the per-token system above. All `rounded-*` Tailwind classes on custom components are replaced with `var(--radius-card)` etc. Shadcn/ui components keep their existing Tailwind classes — only custom components change.

### 1.2 Glass Component Classes

Three utility classes added to `index.css`:

```css
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.glass-subtle {
  background: rgba from --glass-bg at 60% opacity;
  border: 1px solid rgba from --glass-border at 50% opacity;
  backdrop-filter: blur(8px);
}

.glow {
  box-shadow: 0 0 40px var(--accent-glow), 0 8px 32px rgba(0,0,0,0.3);
}
```

Used on: cards, navbar (scrolled state), modals, product info panel, footer.

### 1.3 Typography

**Already installed:** Playfair Display, Inter  
**Add:** Cormorant Garamond (Google Fonts, weights 300 400 600 700)

Usage:
- Hero headings (`<h1>` on homepage, product name on product page): Cormorant Garamond 300–400
- Section headings (`<h2>`): Playfair Display 500
- Body text: Inter 400
- Labels / uppercase caps: Inter 500, `letter-spacing: 0.15em`
- Price: Inter 600

### 1.4 Scroll Reveal

A reusable `RevealOnScroll` wrapper component using framer-motion:
- `initial`: `{ opacity: 0, y: 24 }`
- `whileInView`: `{ opacity: 1, y: 0 }`
- `viewport`: `{ once: true, margin: "-80px" }`
- `transition`: `{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }`

Used on every homepage section and product page section.

---

## Part 2 — Navigation & Shell

### 2.1 Navbar (upgrade existing Layout.tsx)

Current: `bg-background/80 backdrop-blur-md border-b` — good foundation.

Changes:
- **At-top state:** transparent background, no border
- **Scrolled state (>80px):** `.glass` class applied, subtle border appears
- **Transition:** smooth 200ms on all scroll-state properties
- Brand name uses Cormorant Garamond on desktop
- WhatsApp CTA button added to right side (icon + number, accent color, pill shape)
- Active nav link: accent color, no underline (remove the `border-b-2`)

### 2.2 Mobile Drawer

Replace the basic `SheetContent` with a full-height glass panel:
- Background: `var(--glass-bg)` with `backdrop-filter`
- Brand name at top in Cormorant 32px
- Category links listed with light separator lines
- Social icons row at bottom
- WhatsApp button (full width, accent fill)
- Framer-motion slide from left (`x: -100% → 0`)

### 2.3 Promo Banner

Replace static text with marquee animation:
- `<marquee>` equivalent via CSS animation or framer-motion `x` loop
- Multiple active banners concatenated with `·` separator
- Speed: ~40s per full cycle

### 2.4 Footer

4-column editorial layout (stacks to 2 col on mobile):

| Col 1 | Col 2 | Col 3 | Col 4 |
|---|---|---|---|
| Brand name (large Cormorant) + 1-line tagline + social icons | Quick Links (Home, Collections, FAQ, Contact) | Collections (dynamic from DB categories, max 6) | Contact (WhatsApp, email, address) |

Styling: dark glass panel regardless of active theme (footer is always `dark-obsidian` tones). Accent glow line at top. Copyright bar below.

---

## Part 3 — Homepage

### 3.1 Hero Section (replace existing)

- Full-viewport-height (`100vh`) container
- Background: active heroImages from DB (existing slideshow logic, keep it)
- Overlay: gradient `linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.7) 100%)`
- Content: centered glass panel with brand tagline, subtitle, two CTAs ("Explore Collection" → /categories, "View in AR" → scrolls to AR section)
- Tagline uses Cormorant Garamond 56px on desktop
- Animated scroll indicator (chevron bouncing at bottom)
- Keep existing `heroSlideInterval` from settings

### 3.2 Category Grid (replace carousel)

Replace the Embla carousel with a CSS grid:
- Layout: `grid-template-columns: repeat(3, 1fr)` with the first card spanning 2 rows (`grid-row: span 2`) if ≥ 3 categories
- Mobile: 2-column grid
- Each card: full-bleed image, glass overlay at bottom with category name, hover: image scales 105% + glass brightens
- Height: 260px per cell (520px for the tall featured card)
- Link to `/categories?filter={slug}`

### 3.3 New Arrivals — Horizontal Scroll Strip

- Heading: "New Arrivals" + "View All →" link
- Horizontal scroll of ProductCard components (reuse upgraded ProductCard)
- 3:4 portrait aspect ratio (not square)
- Smooth momentum scroll on mobile

### 3.4 AR Teaser Section (conditionally shown when `showARSection`)

Replace static demo with a live embedded model-viewer of the first product that has a 3D model. Show:
- model-viewer at ~400px height, no AR button (just rotation)
- Glass overlay card on right: "Try furniture in your room" headline + "Open AR Studio" CTA

### 3.5 Philosophy Section (conditionally shown when `showPhilosophy`)

Full-width dark glass panel:
- Static hardcoded text: `"Where craftsmanship meets living"` as the headline, `"Every piece in our collection is handpicked for quality, beauty, and lasting value."` as the subtitle. These are component constants — not DB-driven (YAGNI: adding a DB field for 2 lines of marketing copy is overkill).
- Cormorant 36px headline, Inter 16px subtitle, centered, white text on dark glass
- RevealOnScroll animation

### 3.6 WhatsApp CTA Strip

Section at bottom of homepage (above footer):
- Gold/accent background or glass panel
- "Ready to transform your space? Speak with our team."
- WhatsApp icon + number from `settings.whatsappNumber`
- Opens `https://wa.me/{number}` with pre-filled message

---

## Part 4 — Product Page

### 4.1 Layout Change

Current: 2-column `md:grid-cols-2` (image carousel left, info right)  
New: 2-column but left column is the 3D viewer (or photo carousel fallback), right column is info panel

**3D viewer priority logic:**
1. If product has `productModels` with at least one model → show inline model-viewer
2. Else → show photo carousel

The full-screen ARStudio popup is kept for the AR (place in room) experience. The inline viewer is for 3D rotation/zoom only.

### 4.2 Inline model-viewer Component

New component: `InlineModelViewer` (`client/src/components/InlineModelViewer.tsx`)

- Wraps `<model-viewer>` with `camera-controls` and `auto-rotate`
- No `ar` attribute (AR launch stays in the popup ARStudio)
- Height: `aspect-ratio: 4/5` on desktop, `aspect-ratio: 1/1` on mobile
- Glass panel overlay at bottom: model name, material count
- Loading state: skeleton pulse overlay
- Error state: falls back to first product image

Receives props: `modelUrl: string`, `materials: ProductMaterial[]`, `activeMaterialId: number | null`, `onMaterialChange: (id: number) => void`

### 4.3 Material Swatch Selector

Swatches displayed as clickable circles (32px diameter):
- `background: colorHex`
- Active swatch: 2px accent-color ring + slight scale-up
- Hover tooltip: `colorName` 
- Selecting a swatch calls `applyTextureOrColor` (existing ARStudio logic, extracted to shared util)

### 4.4 Photo Strip

Below the 3D viewer (or as the primary view if no 3D):
- Horizontal scroll strip of `images[]` thumbnails (60×60px)
- Active thumbnail: accent border ring
- Clicking thumbnail: lightbox overlay with full image (use existing Dialog component)
- "Photos" tab / "3D" tab toggle when both exist

### 4.5 Flexible Specs

New DB columns on `products` table:
```sql
specs jsonb  -- [{label: string, value: string}], nullable
sections jsonb -- {story?: string, care?: string, delivery?: string, custom?: [{title: string, body: string}]}, nullable
```

On the product page, specs render as a two-column table with glass rows:

```
Material    |  Italian Velvet
Origin      |  Lahore, Pakistan
Lead Time   |  4–6 weeks
Weight      |  85 kg
```

Falls back to `productMeasurements` (existing) if `specs` is empty.

### 4.6 Rich Optional Sections

Expandable accordions below the main info:
- "The Story" (shows if `sections.story` is set)
- "Care & Maintenance" (shows if `sections.care` is set)
- "Delivery Information" (shows if `sections.delivery` is set)
- Custom sections from `sections.custom[]` array

Each accordion: glass panel, Playfair heading, Inter body text.

### 4.7 Related Products

"From the same collection" — horizontal scroll of other products in the same `categoryId`. Query: `GET /api/products?categoryId={id}&limit=6&exclude={currentId}`. ProductCard components, same horizontal scroll strip as homepage.

---

## Part 5 — Collections Page

### 5.1 Product Card Upgrade

Replace current `ProductCard`:
- `border-radius: var(--radius-card)` (20px, consistent)
- Hover: `translateY(-6px)` + `.glow` shadow class
- Hover: image scales 105% (keep existing `image-scale`)
- AR badge (top-right corner): shown if product has any `productModels`
- Stock badge (bottom-left): "Out of Stock" red, "Made to Order" amber, "In Stock" hidden
- Glass info strip at card bottom (replaces the below-card text layout): name + price overlaid on card

### 5.2 Masonry-Style Grid

CSS grid with `grid-auto-rows` and intentional sizing:
- Default: 3 columns desktop, 2 tablet, 1 mobile
- First product in each rendered batch gets `grid-row: span 2` (taller card)
- Every 7th product gets `grid-column: span 2` (wider card) on desktop
- Products 2–6, 8+ are standard size

### 5.3 Wishlist

Client-side only (localStorage), no account needed:
- Heart icon on each ProductCard (top-left corner)
- Filled heart = saved, outline = unsaved
- Click toggles, saved to `localStorage['wishlist']` as array of product IDs
- Wishlist count badge on navbar (small number badge on a heart icon)
- No dedicated wishlist page needed — just the badge count

### 5.4 Glass Filter Bar

Sticky top bar on Collections page:
- Search input (existing) — glass style
- Category filter pills (existing Tabs) — glass pill style
- Smooth framer-motion layout animation on filter change (cards animate out/in with `layout` prop)

---

## Part 6 — Admin Product Editor

### 6.1 Schema Additions

Add to `products` table in `shared/schema.ts`:
```typescript
specs: json("specs").$type<Array<{label: string; value: string}>>(),
sections: json("sections").$type<{
  story?: string;
  care?: string;
  delivery?: string;
  custom?: Array<{title: string; body: string}>;
}>(),
```

Run `npm run db:push` after adding.

Update `insertProductSchema` Zod schema to include both fields (optional).

### 6.2 Editor Layout — 6 Sections

Reorganise `AdminProductEditor.tsx` into collapsible accordion sections using shadcn `Accordion`:

1. **Basic Info** — name, description, category, arLink
2. **Media** — image upload + drag-to-reorder grid (existing)
3. **3D Models & Materials** — existing model/material section
4. **Specifications** — dynamic specs key-value editor + existing measurements
5. **Rich Sections** — story/care/delivery toggles + textarea per section
6. **Pricing & Availability** — price, stock status, isHidden, sortOrder

### 6.3 Dynamic Specs UI

In Section 4 of the editor:

"Specifications" sub-section above the existing measurements:
- List of `[Label input] [Value input] [Delete button]` rows
- "+ Add Specification" button appends a new empty row
- Rows are drag-to-reorder (reuse existing `@dnd-kit` setup)
- Saved as `specs` JSON on product

### 6.4 Rich Sections UI

In Section 5:
- Toggle switch for Story → if on, shows `<Textarea>` for `sections.story`
- Toggle switch for Care Instructions → `sections.care`
- Toggle switch for Delivery Info → `sections.delivery`
- "+ Custom Section" button → adds `{title: string, body: string}` row to `sections.custom`

---

## Part 7 — Settings: Theme Picker

### 7.1 Theme Picker UI

New tab (or sub-section in existing Appearance tab) in admin Settings:

Three clickable cards showing mini-previews of each theme:
- Dark Obsidian preview: dark background, gold glass chip, gold text
- White Marble preview: warm white background, frosted glass chip, tan text  
- Warm Dusk preview: warm brown background, amber glass chip, amber text

Clicking a card: immediately applies `data-theme` to `document.html` (live preview for admin) and marks that card as selected. Save button persists `activeThemePreset` to DB.

### 7.2 Admin-side theme isolation

The admin pages (`/admin/*`, `/supervisor/*`) always render with `dark-obsidian` regardless of the public site theme. Only the public-facing layout (`Layout.tsx`) reads and applies the theme from settings.

---

## Part 8 — New Features

### 8.1 WhatsApp Pre-filled Inquiry

The "Inquire" / "Contact about this product" button on ProductDetails opens WhatsApp with:
```
https://wa.me/{whatsappNumber}?text=Hi, I'm interested in {productName} (Ref: {productId}).
Selected: Color - {selectedColor}, Size - {selectedSize}.
Link: {window.location.href}
```

Falls back to existing `ProductInquirySheet` if `whatsappNumber` is not set.

### 8.2 Share Button

On ProductDetails: share icon button. Behavior:
- If `navigator.share` available (mobile): calls native share sheet with `{ title: productName, url: window.location.href }`
- Else: copies URL to clipboard, shows toast "Link copied"

### 8.3 Skeleton Loading

Replace all `<Skeleton>` placeholders that currently show plain gray boxes with shimmer versions:
- CSS `@keyframes shimmer` animation (background gradient moving left-to-right)
- Applied to: ProductCard loading states, product detail page, collections grid
- Shadcn Skeleton component already exists — just add shimmer animation to it in index.css

### 8.4 Page Transitions

Wrap route content in `AnimatePresence` + `motion.div` in `App.tsx`:
```tsx
<AnimatePresence mode="wait">
  <motion.div key={location} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
    {/* route content */}
  </motion.div>
</AnimatePresence>
```

---

## Database Changes Summary

| Table | Column | Type | Change |
|---|---|---|---|
| `products` | `specs` | `json` nullable | ADD |
| `products` | `sections` | `json` nullable | ADD |
| `theme_settings` | `activeThemePreset` | text | Already exists — update accepted values to `dark-obsidian`, `white-marble`, `warm-dusk` |

No other schema changes. `productMeasurements` stays for measurements. `specs` is for all other free-form product attributes.

---

## File Architecture

### New Files
```
client/src/components/InlineModelViewer.tsx   — embedded 3D viewer (no popup)
client/src/components/RevealOnScroll.tsx      — scroll animation wrapper
client/src/components/ThemeProvider.tsx       — reads DB theme, sets data-theme on html
client/src/components/WishlistButton.tsx      — heart icon, localStorage
client/src/hooks/use-theme.ts                 — read/write activeThemePreset
client/src/hooks/use-wishlist.ts              — wishlist localStorage state
```

### Modified Files
```
client/src/index.css                          — 3-theme CSS variables, glass classes, shimmer, typography
client/src/App.tsx                            — ThemeProvider wrap, AnimatePresence page transitions
client/src/components/Layout.tsx              — navbar scroll state, WhatsApp CTA, editorial footer
client/src/components/ProductCard.tsx         — luxury card redesign, wishlist button, AR badge
client/src/pages/Home.tsx                     — all sections replaced/upgraded
client/src/pages/ProductDetails.tsx           — InlineModelViewer, photo strip, specs, sections, share
client/src/pages/Collections.tsx              — masonry grid, glass filters, upgraded cards
client/src/pages/admin/AdminProductEditor.tsx — 6-section accordion, specs UI, sections UI
client/src/pages/admin/Settings.tsx           — theme picker tab
shared/schema.ts                              — specs + sections columns on products
server/storage.ts                             — pass-through for new json columns (no special logic)
```

---

## Implementation Phases

This spec is large enough to warrant 3 separate implementation plans, each independently deployable:

**Plan 1 — Foundation** (must be done first; all other plans depend on it)
Tasks: Schema changes · CSS variable architecture · glass classes · typography · ThemeProvider · RevealOnScroll · navbar scroll-state · footer · promo marquee · theme picker in Settings

**Plan 2 — Public Pages** (depends on Plan 1)
Tasks: Homepage hero · category grid · products strip · AR teaser · philosophy section · WhatsApp CTA · collections masonry · glass filter bar · luxury product card · wishlist · page transitions · skeleton shimmer

**Plan 3 — Product Page & Admin Editor** (depends on Plan 1 for schema)
Tasks: InlineModelViewer · photo strip + tabs · specs display · sections accordions · material swatch selector · related products · admin editor 6-section layout · dynamic specs UI · rich sections UI · share button · WhatsApp pre-filled inquiry

---

## Non-Goals (explicitly out of scope)

- Payment processing / checkout (Phase 6, post-launch)
- Order tracking
- User accounts / login for customers
- Product comparison feature
- Search engine beyond existing text filter
- CMS for homepage text (philosophy text is static or settings-driven)
