# Luxury Redesign — Plan 1: Design Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the 3-theme CSS variable system, glass utilities, typography, ThemeProvider, and upgrade the navbar + footer — the base layer every other plan depends on.

**Architecture:** CSS custom properties on `[data-theme]` selector drive the entire theme. A `ThemeProvider` component reads `activeThemePreset` from settings and sets `data-theme` on `<html>`. The navbar gains scroll-state glass behavior. The footer becomes an editorial 4-column layout.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, framer-motion, shadcn/ui, TanStack Query, Drizzle ORM, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-06-15-luxury-redesign-design.md`

---

## Task 1: Schema — Add specs + sections columns to products

**Files:**
- Modify: `shared/schema.ts`
- Modify: `server/storage.ts` (verify new fields pass through)

- [ ] **Step 1: Add columns to products table in shared/schema.ts**

Open `shared/schema.ts`. After `sortOrder` in the `products` table, add:

```typescript
specs: json("specs").$type<Array<{ label: string; value: string }>>(),
sections: json("sections").$type<{
  story?: string;
  care?: string;
  delivery?: string;
  custom?: Array<{ title: string; body: string }>;
}>(),
```

The full products table definition ends with:
```typescript
  sortOrder: integer("sort_order").default(0).notNull(),
  specs: json("specs").$type<Array<{ label: string; value: string }>>(),
  sections: json("sections").$type<{
    story?: string;
    care?: string;
    delivery?: string;
    custom?: Array<{ title: string; body: string }>;
  }>(),
});
```

- [ ] **Step 2: Update insertProductSchema in shared/schema.ts**

Find `export const insertProductSchema = createInsertSchema(products, {...})` and extend it:

```typescript
export const insertProductSchema = createInsertSchema(products, {
  // existing validators stay...
}).extend({
  specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  sections: z.object({
    story: z.string().optional(),
    care: z.string().optional(),
    delivery: z.string().optional(),
    custom: z.array(z.object({ title: z.string(), body: z.string() })).optional(),
  }).optional(),
});
```

- [ ] **Step 3: Push schema to database**

```bash
cd F:/Huzayl/ARwebsidepak
$env:DATABASE_URL = (Get-Content .env | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "^DATABASE_URL=",""
npm run db:push
```

Expected: Drizzle confirms 2 new columns added to `products`.

- [ ] **Step 4: Verify server storage passes new fields**

Open `server/storage.ts`. Find `createProduct` and `updateProduct`. Confirm they use spread/object pass-through (`...data`) so the new `specs` and `sections` fields flow through automatically without explicit mapping. If they destructure fields explicitly, add `specs` and `sections` to the destructure.

- [ ] **Step 5: TypeScript check**

```bash
npm run check
```

Expected: 0 errors. Fix any type errors before committing.

- [ ] **Step 6: Commit**

```bash
git add shared/schema.ts server/storage.ts
git commit -m "feat: add specs and sections JSON columns to products table"
```

---

## Task 2: CSS — 3-Theme Variable System + Glass Utilities

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Replace the :root block and add theme blocks**

Open `client/src/index.css`. Replace the existing `:root { }` and `.dark { }` blocks entirely with:

```css
/* ── THEME: Dark Obsidian (default) ── */
[data-theme="dark-obsidian"], :root {
  --bg:              #0a0a0f;
  --surface-1:       rgba(255,255,255,0.06);
  --surface-2:       rgba(255,255,255,0.04);
  --glass-bg:        rgba(15,15,25,0.75);
  --glass-border:    rgba(255,255,255,0.12);
  --glass-blur:      20px;
  --accent:          #c9a96e;
  --accent-glow:     rgba(201,169,110,0.25);
  --text-primary:    rgba(255,255,255,0.92);
  --text-secondary:  rgba(255,255,255,0.45);
  --text-accent:     #c9a96e;
  --border:          rgba(255,255,255,0.1);
  --radius-card:     20px;
  --radius-btn:      12px;
  --radius-input:    10px;
  --radius-modal:    24px;
  --radius-pill:     999px;
  --shadow-card:     0 4px 24px rgba(0,0,0,0.4);
  --shadow-glow:     0 0 40px rgba(201,169,110,0.2), 0 8px 32px rgba(0,0,0,0.5);
  --nav-bg:          rgba(10,10,15,0.85);

  /* Shadcn/ui token bridge */
  --background:      10 10% 6%;
  --foreground:      40 10% 90%;
  --primary:         43 50% 60%;
  --primary-foreground: 240 10% 5%;
  --card:            240 5% 9%;
  --card-foreground: 40 10% 90%;
  --popover:         240 5% 9%;
  --popover-foreground: 40 10% 90%;
  --muted:           240 5% 13%;
  --muted-foreground: 240 5% 55%;
  --accent:          43 30% 15%;
  --accent-foreground: 43 50% 60%;
  --destructive:     0 62% 30%;
  --destructive-foreground: 0 0% 98%;
  --border:          240 5% 16%;
  --input:           240 5% 16%;
  --ring:            43 50% 60%;
  --radius:          0.75rem;
}

/* ── THEME: White Marble ── */
[data-theme="white-marble"] {
  --bg:              #faf9f5;
  --surface-1:       rgba(255,255,255,0.8);
  --surface-2:       rgba(255,255,255,0.5);
  --glass-bg:        rgba(255,255,255,0.65);
  --glass-border:    rgba(0,0,0,0.08);
  --glass-blur:      16px;
  --accent:          #8b6f4e;
  --accent-glow:     rgba(139,111,78,0.2);
  --text-primary:    rgba(20,18,15,0.9);
  --text-secondary:  rgba(20,18,15,0.45);
  --text-accent:     #8b6f4e;
  --border:          rgba(0,0,0,0.08);
  --radius-card:     20px;
  --radius-btn:      12px;
  --radius-input:    10px;
  --radius-modal:    24px;
  --radius-pill:     999px;
  --shadow-card:     0 4px 24px rgba(0,0,0,0.08);
  --shadow-glow:     0 0 40px rgba(139,111,78,0.15), 0 8px 32px rgba(0,0,0,0.1);
  --nav-bg:          rgba(250,249,245,0.88);

  /* Shadcn/ui token bridge */
  --background:      40 20% 98%;
  --foreground:      30 10% 10%;
  --primary:         30 30% 43%;
  --primary-foreground: 0 0% 100%;
  --card:            0 0% 100%;
  --card-foreground: 30 10% 10%;
  --popover:         0 0% 100%;
  --popover-foreground: 30 10% 10%;
  --muted:           40 10% 94%;
  --muted-foreground: 30 10% 45%;
  --accent:          40 20% 92%;
  --accent-foreground: 30 30% 35%;
  --destructive:     0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border:          40 10% 88%;
  --input:           40 10% 88%;
  --ring:            30 30% 43%;
  --radius:          0.75rem;
}

/* ── THEME: Warm Dusk ── */
[data-theme="warm-dusk"] {
  --bg:              #1a1008;
  --surface-1:       rgba(255,180,100,0.07);
  --surface-2:       rgba(255,180,100,0.04);
  --glass-bg:        rgba(26,16,8,0.8);
  --glass-border:    rgba(232,168,124,0.18);
  --glass-blur:      20px;
  --accent:          #e8a87c;
  --accent-glow:     rgba(232,168,124,0.25);
  --text-primary:    rgba(255,235,210,0.92);
  --text-secondary:  rgba(255,235,210,0.42);
  --text-accent:     #e8a87c;
  --border:          rgba(232,168,124,0.15);
  --radius-card:     20px;
  --radius-btn:      12px;
  --radius-input:    10px;
  --radius-modal:    24px;
  --radius-pill:     999px;
  --shadow-card:     0 4px 24px rgba(0,0,0,0.5);
  --shadow-glow:     0 0 40px rgba(232,168,124,0.2), 0 8px 32px rgba(0,0,0,0.6);
  --nav-bg:          rgba(26,16,8,0.88);

  /* Shadcn/ui token bridge */
  --background:      28 50% 7%;
  --foreground:      30 60% 90%;
  --primary:         25 65% 68%;
  --primary-foreground: 28 50% 5%;
  --card:            28 40% 10%;
  --card-foreground: 30 60% 90%;
  --popover:         28 40% 10%;
  --popover-foreground: 30 60% 90%;
  --muted:           28 30% 14%;
  --muted-foreground: 30 20% 55%;
  --accent:          25 40% 18%;
  --accent-foreground: 25 65% 68%;
  --destructive:     0 62% 30%;
  --destructive-foreground: 0 0% 98%;
  --border:          28 30% 18%;
  --input:           28 30% 18%;
  --ring:            25 65% 68%;
  --radius:          0.75rem;
}
```

- [ ] **Step 2: Add glass utility classes and shimmer animation**

After the `@tailwind utilities;` line, add a new `@layer utilities` block (or append to existing):

```css
@layer utilities {
  .glass {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }

  .glass-subtle {
    background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--glass-border) 50%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .glow-accent {
    box-shadow: var(--shadow-glow);
  }

  .card-shadow {
    box-shadow: var(--shadow-card);
  }

  .text-accent {
    color: var(--accent);
  }

  .border-accent {
    border-color: var(--accent);
  }
}

/* Shimmer animation for skeleton loading */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    var(--surface-1) 25%,
    var(--surface-2) 50%,
    var(--surface-1) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
}
```

- [ ] **Step 3: Add Cormorant Garamond to font imports**

Find the `@import url('https://fonts.googleapis.com/...` line at the top of index.css. Replace it with:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
```

Then add the font variable in the `:root` / `[data-theme]` blocks:

```css
--font-display: 'Cormorant Garamond', serif;
--font-serif: 'Playfair Display', serif;
--font-sans: 'Inter', sans-serif;
```

- [ ] **Step 4: Check the dev server starts without CSS errors**

```bash
npm run dev
```

Open `http://localhost:5000` — page should render. Expected: page looks similar to before (theme hasn't been applied yet since ThemeProvider is in next task). No console errors about CSS.

Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
git add client/src/index.css
git commit -m "feat: 3-theme CSS variable system — dark-obsidian, white-marble, warm-dusk + glass utilities"
```

---

## Task 3: ThemeProvider — Apply DB Theme to `<html>`

**Files:**
- Create: `client/src/components/ThemeProvider.tsx`
- Create: `client/src/hooks/use-theme.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create use-theme.ts hook**

Create `client/src/hooks/use-theme.ts`:

```typescript
import { useSettings } from "./use-settings";
import { useEffect } from "react";

const VALID_THEMES = ["dark-obsidian", "white-marble", "warm-dusk"] as const;
type ThemeName = typeof VALID_THEMES[number];

function isValidTheme(v: string | null | undefined): v is ThemeName {
  return VALID_THEMES.includes(v as ThemeName);
}

export function useTheme() {
  const { data: settings } = useSettings();
  const activeTheme = isValidTheme(settings?.activeThemePreset)
    ? settings!.activeThemePreset
    : "dark-obsidian";
  return activeTheme as ThemeName;
}
```

- [ ] **Step 2: Create ThemeProvider.tsx**

Create `client/src/components/ThemeProvider.tsx`:

```typescript
import { useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <>{children}</>;
}
```

- [ ] **Step 3: Wrap App.tsx with ThemeProvider**

Open `client/src/App.tsx`. Find the outermost return and wrap the public layout section with `ThemeProvider`. Only public pages get the theme — admin pages always use `dark-obsidian`.

Find where the Layout-wrapped routes are returned. Import and add ThemeProvider:

```typescript
import { ThemeProvider } from "@/components/ThemeProvider";
```

Wrap the `<QueryClientProvider>` return (or just the public routes section) — the simplest approach is wrapping the entire `<QueryClientProvider>` since ThemeProvider reads from the query cache:

```typescript
return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      {/* existing Switch/Route structure */}
    </ThemeProvider>
    <Toaster />
  </QueryClientProvider>
);
```

- [ ] **Step 4: Set default data-theme in index.html**

Open `client/index.html`. Add `data-theme="dark-obsidian"` to `<html>` so the correct theme loads before JS hydrates:

```html
<html lang="en" data-theme="dark-obsidian">
```

- [ ] **Step 5: Verify theme loads**

```bash
npm run dev
```

Open `http://localhost:5000`. Open browser DevTools → Elements. Check `<html>` has `data-theme="dark-obsidian"`. Page should now have dark background. No console errors.

- [ ] **Step 6: TypeScript check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ThemeProvider.tsx client/src/hooks/use-theme.ts client/src/App.tsx client/index.html
git commit -m "feat: ThemeProvider — reads DB theme, applies data-theme to html element"
```

---

## Task 4: RevealOnScroll Component

**Files:**
- Create: `client/src/components/RevealOnScroll.tsx`

- [ ] **Step 1: Create RevealOnScroll.tsx**

Create `client/src/components/RevealOnScroll.tsx`:

```typescript
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function RevealOnScroll({ children, delay = 0, className }: RevealOnScrollProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Test it compiles**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/RevealOnScroll.tsx
git commit -m "feat: RevealOnScroll component — framer-motion scroll-reveal wrapper"
```

---

## Task 5: Navbar — Glass Scroll State + WhatsApp CTA

**Files:**
- Modify: `client/src/components/Layout.tsx`

- [ ] **Step 1: Add scroll state to navbar**

Open `client/src/components/Layout.tsx`. Add a `useScrolled` hook at the top of the `Layout` function:

```typescript
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 80);
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```

- [ ] **Step 2: Apply scroll-state classes to the header**

Find `<header className="sticky top-0 z-50 ...">`. Replace its className:

```typescript
<header className={`sticky top-0 z-50 transition-all duration-300 ${
  scrolled
    ? "glass border-b border-[var(--glass-border)]"
    : "bg-transparent border-b border-transparent"
}`}>
```

- [ ] **Step 3: Upgrade brand name typography**

Find the desktop brand name link. Add Cormorant Garamond:

```typescript
<Link href="/" className="text-xl tracking-[0.12em] uppercase font-light"
  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
  {settings?.brandName || "LUXE"}
</Link>
```

- [ ] **Step 4: Add WhatsApp CTA button to navbar**

Find the right side of the navbar (where the login/admin link is). Add before it:

```typescript
{settings?.whatsappNumber && (
  <a
    href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
    target="_blank"
    rel="noopener noreferrer"
    className="hidden md:flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all duration-200 hover:opacity-80"
    style={{
      background: "var(--accent-glow)",
      border: "1px solid var(--accent)",
      borderRadius: "var(--radius-pill)",
      color: "var(--accent)",
      fontFamily: "var(--font-sans)",
    }}
  >
    <MessageCircle className="w-3.5 h-3.5" />
    {settings.whatsappNumber}
  </a>
)}
```

- [ ] **Step 5: Fix nav link active style**

Find `NavLink` component. Remove the `border-b-2 border-primary` from the active class. Replace with:

```typescript
const isActive = location === href;
return (
  <Link href={href} className={`
    text-xs uppercase tracking-widest font-medium transition-colors duration-200
    ${isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
    py-2
  `}>
    {children}
  </Link>
);
```

- [ ] **Step 6: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5000`. Scroll down — navbar should transition from transparent to glass. WhatsApp button visible if `whatsappNumber` is set in DB.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Layout.tsx
git commit -m "feat: navbar — glass scroll-state, WhatsApp CTA, Cormorant typography, fixed active link style"
```

---

## Task 6: Promo Banner — Marquee Animation

**Files:**
- Modify: `client/src/components/Layout.tsx`
- Modify: `client/src/index.css`

- [ ] **Step 1: Add marquee CSS animation to index.css**

In `index.css`, add inside `@layer utilities`:

```css
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee 30s linear infinite;
}

.marquee-track:hover {
  animation-play-state: paused;
}
```

- [ ] **Step 2: Update promo banner in Layout.tsx**

Find the promo banner `<div>` at the top of Layout. Replace its contents:

```typescript
{/* Promo Bar */}
{settings?.showBanner !== false && banners && banners.length > 0 && (
  <div
    className="overflow-hidden py-2 text-center text-xs tracking-widest uppercase font-semibold"
    style={{ background: "var(--accent)", color: "#000" }}
    data-testid="banner-promo"
  >
    <div className="marquee-track">
      {[...banners, ...banners].map((banner, i) => (
        <span key={i} className="px-8 whitespace-nowrap">
          {banner.text} <span className="opacity-50 mx-4">·</span>
        </span>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Open `http://localhost:5000`. Promo bar should scroll continuously if banners exist in DB. Hover pauses it.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Layout.tsx client/src/index.css
git commit -m "feat: promo banner — continuous marquee animation with hover-pause"
```

---

## Task 7: Footer — Editorial 4-Column Redesign

**Files:**
- Modify: `client/src/components/Layout.tsx`

- [ ] **Step 1: Replace the footer section in Layout.tsx**

Find the `<footer>` element in Layout.tsx. Replace it entirely:

```typescript
<footer style={{
  background: "#0a0a0f",
  borderTop: "1px solid rgba(201,169,110,0.2)",
}}>
  {/* Glow line */}
  <div style={{
    height: "1px",
    background: "linear-gradient(90deg, transparent, var(--accent, #c9a96e), transparent)",
    opacity: 0.5,
  }} />

  <div className="container mx-auto px-6 lg:px-8 py-16">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

      {/* Col 1: Brand */}
      <div className="lg:col-span-1">
        <div className="text-3xl font-light tracking-[0.15em] uppercase mb-4"
          style={{ fontFamily: "var(--font-display)", color: "#fff" }}>
          {settings?.brandName || "LUXE"}
        </div>
        <p className="text-xs leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          Handcrafted luxury furniture with augmented reality visualisation.
        </p>
        <div className="flex gap-4">
          {settings?.instagramUrl && (
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Instagram className="w-5 h-5" />
            </a>
          )}
          {settings?.facebookUrl && (
            <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Facebook className="w-5 h-5" />
            </a>
          )}
          {settings?.whatsappNumber && (
            <a href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.5)" }}>
              <MessageCircle className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      {/* Col 2: Quick Links */}
      <div>
        <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          Quick Links
        </div>
        <div className="flex flex-col gap-3">
          {[
            { href: "/", label: "Home" },
            { href: "/categories", label: "Collections" },
            { href: "/faq", label: "FAQ" },
            { href: "/contact", label: "Contact" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-sm transition-colors hover:opacity-100"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Col 3: Collections (dynamic from DB) */}
      <div>
        <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          Collections
        </div>
        <div className="flex flex-col gap-3">
          {categories?.filter(c => !c.isHidden).slice(0, 6).map(cat => (
            <Link key={cat.id} href={`/categories?filter=${cat.slug}`}
              className="text-sm transition-colors hover:opacity-100"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Col 4: Contact */}
      <div>
        <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          Contact
        </div>
        <div className="flex flex-col gap-4">
          {settings?.whatsappNumber && (
            <a href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 text-sm transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
              {settings.whatsappNumber}
            </a>
          )}
          {settings?.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`}
              className="flex items-start gap-3 text-sm transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
              {settings.contactEmail}
            </a>
          )}
          {settings?.address && (
            <div className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
              <span className="leading-relaxed">{settings.address}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  </div>

  {/* Copyright bar */}
  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
        © {new Date().getFullYear()} {settings?.brandName || "Luxury Furniture"}. All rights reserved.
      </p>
      <div className="flex gap-4">
        {settings?.privacyPolicyUrl && (
          <a href={settings.privacyPolicyUrl} className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.25)" }}>Privacy Policy</a>
        )}
        {settings?.termsUrl && (
          <a href={settings.termsUrl} className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.25)" }}>Terms</a>
        )}
      </div>
    </div>
  </div>
</footer>
```

- [ ] **Step 2: Check imports in Layout.tsx**

Ensure `ExternalLink` and `MapPin` are imported from `lucide-react`. They should already be there from previous phases. If not, add them to the existing lucide import line.

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Scroll to footer. Should show 4-column dark editorial layout. Categories column should show DB categories.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Layout.tsx
git commit -m "feat: footer — editorial 4-column dark glass redesign with dynamic categories + social links"
```

---

## Task 8: Settings — Theme Picker

**Files:**
- Modify: `client/src/pages/admin/Settings.tsx`
- Modify: `server/routes.ts` (verify activeThemePreset is writable)

- [ ] **Step 1: Verify the settings PATCH route accepts activeThemePreset**

Open `server/routes.ts`. Find `PATCH /api/settings`. Confirm it uses spread or explicit inclusion of `activeThemePreset`. If it uses a whitelist of fields, add `activeThemePreset` to it.

- [ ] **Step 2: Add ThemePicker to Settings.tsx**

Open `client/src/pages/admin/Settings.tsx`. Find the Appearance tab section. Add a Theme Picker section before the existing color inputs:

```typescript
const THEMES = [
  {
    id: "dark-obsidian",
    name: "Dark Obsidian",
    desc: "Deep navy · Gold accents · Glowing glass",
    bg: "#0a0a0f",
    accent: "#c9a96e",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
  },
  {
    id: "white-marble",
    name: "White Marble",
    desc: "Warm cream · Brass accents · Frosted glass",
    bg: "#faf9f5",
    accent: "#8b6f4e",
    surface: "rgba(255,255,255,0.8)",
    border: "rgba(0,0,0,0.08)",
  },
  {
    id: "warm-dusk",
    name: "Warm Dusk",
    desc: "Deep brown · Amber accents · Warm glass",
    bg: "#1a1008",
    accent: "#e8a87c",
    surface: "rgba(255,180,100,0.07)",
    border: "rgba(232,168,124,0.18)",
  },
] as const;
```

Then in the JSX (inside the Appearance tab content):

```typescript
{/* Theme Picker */}
<div className="space-y-4">
  <div>
    <h3 className="text-base font-semibold">Site Theme</h3>
    <p className="text-sm text-muted-foreground mt-1">
      Select the visual style for your public website. Changes live instantly for all visitors after saving.
    </p>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {THEMES.map((theme) => {
      const isActive = (form.watch("activeThemePreset") || "dark-obsidian") === theme.id;
      return (
        <button
          key={theme.id}
          type="button"
          onClick={() => {
            form.setValue("activeThemePreset", theme.id, { shouldDirty: true });
            document.documentElement.setAttribute("data-theme", theme.id);
          }}
          className="relative text-left rounded-2xl p-4 transition-all duration-200 border-2"
          style={{
            background: theme.bg,
            borderColor: isActive ? theme.accent : "rgba(255,255,255,0.1)",
            boxShadow: isActive ? `0 0 20px ${theme.accent}33` : "none",
          }}
        >
          {/* Mini glass chip preview */}
          <div className="rounded-lg p-3 mb-3" style={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
          }}>
            <div className="text-xs font-semibold" style={{ color: theme.accent, letterSpacing: "0.1em" }}>
              PREVIEW
            </div>
            <div className="text-sm mt-1" style={{ color: theme.accent === "#8b6f4e" ? "#333" : "#fff", opacity: 0.9 }}>
              {settings?.brandName || "Luxury"}
            </div>
          </div>
          <div className="font-semibold text-sm" style={{ color: theme.accent }}>{theme.name}</div>
          <div className="text-xs mt-1 opacity-60" style={{ color: theme.accent }}>{theme.desc}</div>
          {isActive && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-black text-xs font-bold"
              style={{ background: theme.accent }}>✓</div>
          )}
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 3: Verify the form schema includes activeThemePreset**

In Settings.tsx, find the `useForm` default values. Add `activeThemePreset` to the defaults object:

```typescript
activeThemePreset: settings?.activeThemePreset || "dark-obsidian",
```

And in the reset effect that fires when settings loads:
```typescript
form.reset({
  // existing fields...
  activeThemePreset: settings.activeThemePreset || "dark-obsidian",
});
```

- [ ] **Step 4: Test theme switching**

```bash
npm run dev
```

Go to `http://localhost:5000/admin/settings`. Click each theme card. The page background should change immediately (live preview). Save — the theme persists in DB.

- [ ] **Step 5: TypeScript check**

```bash
npm run check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/admin/Settings.tsx server/routes.ts
git commit -m "feat: theme picker in admin Settings — live preview + DB persistence for 3 themes"
```

---

## Task 9: Page Transitions

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add AnimatePresence to App.tsx**

Open `client/src/App.tsx`. Import `AnimatePresence` and `motion` from framer-motion:

```typescript
import { AnimatePresence, motion } from "framer-motion";
```

Find where `useLocation` is used and get the current path. It should already be imported from `wouter`. Add:

```typescript
const [location] = useLocation();
```

- [ ] **Step 2: Wrap route content with AnimatePresence**

Find the main `<Switch>` that renders public routes. Wrap it:

```typescript
<AnimatePresence mode="wait">
  <motion.div
    key={location}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18 }}
  >
    <Switch>
      {/* all existing routes */}
    </Switch>
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 3: Verify transitions work**

```bash
npm run dev
```

Navigate between Home → Collections → a product. Each page should fade in/out smoothly. No layout shifts.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: page transitions — framer-motion AnimatePresence fade between routes"
```

---

## Verification

After all 9 tasks are done:

- [ ] Run `npm run test` — all tests must pass
- [ ] Run `npm run check` — 0 TypeScript errors
- [ ] Manual check: Dark Obsidian theme loads by default, navbar becomes glass on scroll, footer shows 4-column layout, theme picker in settings switches all 3 themes live, page transitions fade

Plan 1 complete. Proceed to Plan 2 (Public Pages) or Plan 3 (Product Page & Admin) — both depend on Plan 1 being done.
