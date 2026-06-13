# Phase 2 — UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make color/size selection functional, add product search/filter, add an inquiry flow, fix all broken footer links, add AR device detection with QR fallback, and introduce stock status.

**Architecture:** All changes are additive to existing components. New features use existing patterns (shadcn Sheet/Dialog, TanStack Query, wouter). No new backend services needed except the inquiries table and one new API route.

**Prerequisites:** Phase 1 complete (schema has `sortOrder`, `stockStatus`, `materialSlotIndex`, `uvScale`).

**Tech Stack:** React 18, shadcn/ui (Sheet, Dialog, Tabs, Slider), TanStack Query, wouter, framer-motion, qrcode.react, Vitest

---

## File Map

**Create:**
- `client/src/components/ProductInquirySheet.tsx` — inquiry form (Sheet on mobile, Dialog on desktop)
- `client/src/components/CollectionsFilter.tsx` — search + filter + sort bar
- `client/src/tests/ProductDetails.test.tsx` — AR button visibility tests
- `client/src/tests/ProductInquirySheet.test.tsx` — inquiry form tests

**Modify:**
- `shared/schema.ts` — add stockStatus field (if not done in Phase 1), privacyPolicyUrl, termsUrl, aboutUrl, contactEmail to themeSettings
- `server/routes.ts` — add POST /api/inquiries route
- `client/src/pages/ProductDetails.tsx` — color/size state, inquiry button, AR device check, stock status
- `client/src/components/ARStudio.tsx` — loading progress bar
- `client/src/pages/CategoryPage.tsx` — integrate CollectionsFilter
- `client/src/components/Layout.tsx` — dynamic footer categories, newsletter fix, conditional links
- `client/src/pages/admin/AdminProductEditor.tsx` — stock status dropdown

---

## Task 1: Schema — themeSettings New Fields + stockStatus

**Files:**
- Modify: `shared/schema.ts`

- [ ] **Step 1: Add new fields to `themeSettings` table in `shared/schema.ts`**

Inside the `themeSettings` pgTable definition, add after the existing fields:

```typescript
// Contact & pages
contactEmail: text("contact_email"),
privacyPolicyUrl: text("privacy_policy_url"),
termsUrl: text("terms_url"),
aboutUrl: text("about_url"),
```

- [ ] **Step 2: Add `stockStatus` to `products` table (if not already added in Phase 1)**

In the `products` table, after `isHidden`, add:

```typescript
stockStatus: text("stock_status").default("in_stock").notNull(),
```

- [ ] **Step 3: Push schema**

```bash
npm run db:push
```

Expected: "Changes applied"

- [ ] **Step 4: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: add stockStatus to products, contactEmail/privacyPolicyUrl/termsUrl/aboutUrl to themeSettings"
```

---

## Task 2: Inquiries Table + Backend Route

**Files:**
- Modify: `shared/schema.ts`
- Modify: `server/routes.ts`
- Modify: `server/storage.ts`

- [ ] **Step 1: Add `inquiries` table to `shared/schema.ts`**

After the `pageViews` table definition, add:

```typescript
export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  customerName: text("customer_name").notNull(),
  contact: text("contact").notNull(),
  message: text("message"),
  selectedColor: text("selected_color"),
  selectedSize: text("selected_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({ id: true, createdAt: true });
export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
```

- [ ] **Step 2: Add storage methods in `server/storage.ts`**

Add these methods to the storage object:

```typescript
async createInquiry(data: InsertInquiry): Promise<Inquiry> {
  const [inquiry] = await db.insert(inquiries).values(data).returning();
  return inquiry;
},

async getInquiries(): Promise<Inquiry[]> {
  return db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
},

async getUnreadInquiryCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inquiries)
    .where(eq(inquiries.isRead, false));
  return result[0]?.count ?? 0;
},

async markInquiryRead(id: number): Promise<void> {
  await db.update(inquiries).set({ isRead: true }).where(eq(inquiries.id, id));
},

async deleteInquiry(id: number): Promise<void> {
  await db.delete(inquiries).where(eq(inquiries.id, id));
},
```

Ensure these imports are at the top of `storage.ts`:

```typescript
import { eq, and, asc, lt, desc, sql } from "drizzle-orm";
import { inquiries, type Inquiry, type InsertInquiry } from "@shared/schema";
```

- [ ] **Step 3: Push schema**

```bash
npm run db:push
```

- [ ] **Step 4: Add routes in `server/routes.ts`**

Import the inquiry limiter (add to `server/middleware/rateLimiter.ts` first):

```typescript
// In server/middleware/rateLimiter.ts, add:
export const inquiryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many inquiries submitted. Please try again in a minute." },
});
```

Then in `server/routes.ts`, add after the existing FAQ routes:

```typescript
import { inquiryLimiter } from "./middleware/rateLimiter.js";

// Inquiries (public POST, admin GET/PATCH/DELETE)
app.post("/api/inquiries", inquiryLimiter, async (req, res) => {
  const input = insertInquirySchema.parse(req.body);
  const inquiry = await storage.createInquiry(input);
  res.status(201).json(inquiry);
});

app.get("/api/inquiries", requireAdmin, async (req, res) => {
  const list = await storage.getInquiries();
  res.json(list);
});

app.get("/api/inquiries/unread-count", requireAdmin, async (req, res) => {
  const count = await storage.getUnreadInquiryCount();
  res.json({ count });
});

app.patch("/api/inquiries/:id/read", requireAdmin, async (req, res) => {
  await storage.markInquiryRead(Number(req.params.id));
  res.sendStatus(204);
});

app.delete("/api/inquiries/:id", requireAdmin, async (req, res) => {
  await storage.deleteInquiry(Number(req.params.id));
  res.sendStatus(204);
});
```

Also add `insertInquirySchema` to the import from `@shared/schema` at the top of `routes.ts`.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts server/storage.ts server/routes.ts server/middleware/rateLimiter.ts
git commit -m "feat: inquiries table, storage methods, and CRUD API routes"
```

---

## Task 3: ProductInquirySheet Component

**Files:**
- Create: `client/src/components/ProductInquirySheet.tsx`
- Create: `client/src/tests/ProductInquirySheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/tests/ProductInquirySheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductInquirySheet } from "@/components/ProductInquirySheet";

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });

const mockProduct = {
  id: 1,
  name: "The Cloud Sofa",
  price: 249900,
  arLink: "https://example.com/model.glb",
  images: [],
  colors: ["#2d2d2d"],
  sizes: ["2-Seater"],
  description: "A luxury sofa",
  categoryId: 1,
  isHidden: false,
  stockStatus: "in_stock",
  sortOrder: 0,
};

describe("ProductInquirySheet", () => {
  it("renders the trigger button", () => {
    render(
      <ProductInquirySheet
        product={mockProduct as any}
        selectedColor="#2d2d2d"
        selectedSize="2-Seater"
      />
    );
    expect(screen.getByText(/Request Information/i)).toBeInTheDocument();
  });

  it("shows the product name in the form", async () => {
    render(
      <ProductInquirySheet
        product={mockProduct as any}
        selectedColor={null}
        selectedSize={null}
      />
    );
    fireEvent.click(screen.getByText(/Request Information/i));
    await waitFor(() => {
      expect(screen.getByText("The Cloud Sofa")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:client
```

Expected: FAIL — `Cannot find module '@/components/ProductInquirySheet'`

- [ ] **Step 3: Create `client/src/components/ProductInquirySheet.tsx`**

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { MessageCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-mobile";
import type { Product } from "@shared/schema";

interface FormValues {
  customerName: string;
  contact: string;
  message: string;
}

interface ProductInquirySheetProps {
  product: Product;
  selectedColor: string | null;
  selectedSize: string | null;
}

function InquiryForm({ product, selectedColor, selectedSize, onSuccess }: ProductInquirySheetProps & { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();
  const { toast } = useToast();
  const { data: settings } = useSettings();

  const onSubmit = async (values: FormValues) => {
    try {
      await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          customerName: values.customerName,
          contact: values.contact,
          message: values.message || null,
          selectedColor: selectedColor || null,
          selectedSize: selectedSize || null,
        }),
      });

      // Open WhatsApp or mailto
      const text = encodeURIComponent(
        `Inquiry for: ${product.name}\nFinish: ${selectedColor || "N/A"}\nSize: ${selectedSize || "N/A"}\nName: ${values.customerName}\nContact: ${values.contact}\nMessage: ${values.message || ""}`
      );
      if (settings?.whatsappNumber) {
        window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${text}`, "_blank");
      } else if (settings?.contactEmail) {
        window.open(`mailto:${settings.contactEmail}?subject=Furniture+Inquiry&body=${text}`, "_blank");
      }

      toast({ title: "Inquiry sent!", description: "We'll be in touch soon." });
      reset();
      onSuccess();
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="p-3 bg-muted/50 rounded-sm space-y-1">
        <p className="font-serif font-semibold">{product.name}</p>
        {selectedColor && <p className="text-xs text-muted-foreground">Finish: {selectedColor}</p>}
        {selectedSize && <p className="text-xs text-muted-foreground">Size: {selectedSize}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="customerName">Your Name *</Label>
        <Input id="customerName" {...register("customerName", { required: true })} placeholder="Jane Smith" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact">Phone or Email *</Label>
        <Input id="contact" {...register("contact", { required: true })} placeholder="+1 555 000 0000" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea id="message" {...register("message")} placeholder="Any specific requirements?" rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send Inquiry"}
      </Button>
    </form>
  );
}

export function ProductInquirySheet({ product, selectedColor, selectedSize }: ProductInquirySheetProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const trigger = (
    <Button variant="outline" size="lg" className="w-full h-12 sm:h-14 tracking-widest uppercase text-xs sm:text-sm font-bold rounded-full sm:rounded-none gap-2">
      <MessageCircle className="w-4 h-4" /> Request Information
    </Button>
  );

  const content = (
    <InquiryForm
      product={product}
      selectedColor={selectedColor}
      selectedSize={selectedSize}
      onSuccess={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-serif text-xl">Request Information</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Request Information</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:client
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ProductInquirySheet.tsx client/src/tests/ProductInquirySheet.test.tsx
git commit -m "feat: ProductInquirySheet — inquiry form with WhatsApp/email submission"
```

---

## Task 4: Functional Color & Size Selection + Inquiry Button in ProductDetails

**Files:**
- Create: `client/src/tests/ProductDetails.test.tsx`
- Modify: `client/src/pages/ProductDetails.tsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/tests/ProductDetails.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "1" }],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("@/hooks/use-products", () => ({
  useProduct: () => ({
    data: {
      id: 1, name: "Cloud Sofa", price: 249900, description: "Luxury sofa",
      arLink: "https://example.com/model.glb",
      colors: ["#2d2d2d", "#f0f0f0"],
      sizes: ["2-Seater", "3-Seater"],
      images: ["https://example.com/img.jpg"],
      categoryId: 1, isHidden: false, stockStatus: "in_stock", sortOrder: 0,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-categories", () => ({
  useCategory: () => ({ data: { id: 1, name: "Sofas" }, isLoading: false }),
}));

vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ data: { currencySymbol: "$" } }),
}));

vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ARStudio", () => ({
  ARStudio: () => <div data-testid="ar-studio" />,
}));

describe("ProductDetails", () => {
  it("shows View in Reality button when arLink is set", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    expect(screen.getByTestId("button-ar-view")).toBeInTheDocument();
  });

  it("highlights selected color swatch on click", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    const swatches = screen.getAllByRole("button", { name: /color/i });
    fireEvent.click(swatches[0]);
    expect(swatches[0]).toHaveClass("ring-primary");
  });

  it("highlights selected size pill on click", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    const sizeBtn = screen.getByText("2-Seater");
    fireEvent.click(sizeBtn);
    expect(sizeBtn.closest("button")).toHaveClass("border-primary");
  });

  it("shows Request Information button", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    expect(screen.getByText(/Request Information/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:client
```

Expected: Multiple failures (no color click state, no inquiry button yet)

- [ ] **Step 3: Update `client/src/pages/ProductDetails.tsx` — add state for color/size + inquiry**

Add these imports at the top (add only if missing):

```typescript
import { ProductInquirySheet } from "@/components/ProductInquirySheet";
```

Add state variables after the existing `arViewerOpen` state:

```typescript
const [selectedColor, setSelectedColor] = useState<string | null>(null);
const [selectedSize, setSelectedSize] = useState<string | null>(null);
```

- [ ] **Step 4: Update color swatches JSX to be interactive**

Find the color swatches rendering (around line 122). Replace:

```tsx
<div 
  key={color} 
  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border cursor-pointer shadow-sm relative group"
  style={{ backgroundColor: color }}
  title={color}
>
  <div className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 opacity-0 group-hover:opacity-50 transition-opacity" />
</div>
```

With:

```tsx
<button
  key={color}
  onClick={() => setSelectedColor(color === selectedColor ? null : color)}
  aria-label={`color ${color}`}
  className={cn(
    "w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border shadow-sm relative transition-all",
    selectedColor === color
      ? "ring-2 ring-primary ring-offset-2 scale-110"
      : "hover:scale-105"
  )}
  style={{ backgroundColor: color }}
  title={color}
/>
```

- [ ] **Step 5: Update size pills JSX to be interactive**

Find the size pills rendering (around line 140). Replace the `<div>` wrappers with `<button>` elements:

```tsx
<button
  key={size}
  onClick={() => setSelectedSize(size === selectedSize ? null : size)}
  className={cn(
    "px-3 sm:px-4 py-1.5 sm:py-2 border text-xs sm:text-sm font-medium transition-colors rounded-full sm:rounded-none",
    selectedSize === size
      ? "border-primary text-primary bg-primary/5"
      : "border-border hover:border-primary hover:text-primary"
  )}
>
  {size}
</button>
```

- [ ] **Step 6: Add the inquiry button below the AR button in the actions section**

Find the actions section (around line 153). Below the AR button block, add:

```tsx
<ProductInquirySheet
  product={product}
  selectedColor={selectedColor}
  selectedSize={selectedSize}
/>
```

- [ ] **Step 7: Run tests**

```bash
npm run test:client
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/ProductDetails.tsx client/src/tests/ProductDetails.test.tsx
git commit -m "feat: functional color/size selection state + inquiry button on product page"
```

---

## Task 5: Stock Status on ProductDetails + ProductCard

**Files:**
- Modify: `client/src/pages/ProductDetails.tsx`
- Modify: `client/src/components/ProductCard.tsx`
- Modify: `client/src/pages/admin/AdminProductEditor.tsx`

- [ ] **Step 1: Update the "In Stock" display in `ProductDetails.tsx`**

Find the hardcoded line (around line 170):

```tsx
<div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest pt-1 sm:pt-2">
  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" /> In Stock & Ready to Ship
</div>
```

Replace with:

```tsx
{product.stockStatus === "in_stock" && (
  <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest pt-1 sm:pt-2">
    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" /> In Stock & Ready to Ship
  </div>
)}
{product.stockStatus === "made_to_order" && (
  <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-amber-600 uppercase tracking-widest pt-1 sm:pt-2">
    <Clock className="w-3 h-3 sm:w-4 sm:h-4" /> Made to Order — 6–8 Weeks
  </div>
)}
{product.stockStatus === "out_of_stock" && (
  <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-red-500 uppercase tracking-widest pt-1 sm:pt-2">
    <X className="w-3 h-3 sm:w-4 sm:h-4" /> Currently Unavailable
  </div>
)}
```

Add `Clock, X` to the lucide-react import if missing.

Also wrap the AR button in a conditional so it hides when `out_of_stock`:

```tsx
{product.stockStatus !== "out_of_stock" && product.arLink ? (
  <Button ... onClick={() => setArViewerOpen(true)} ...>
    <Box className="w-4 h-4 sm:w-5 sm:h-5" /> View in Reality
  </Button>
) : product.stockStatus !== "out_of_stock" ? (
  <div className="p-3 sm:p-4 bg-muted/50 text-xs sm:text-sm text-center text-muted-foreground rounded-xl sm:rounded-sm">
    AR View not available for this item
  </div>
) : null}
```

- [ ] **Step 2: Add stock status badge to `ProductCard.tsx`**

In `client/src/components/ProductCard.tsx`, find the card's image area and add an overlay badge in the top-right corner:

```tsx
{product.stockStatus === "out_of_stock" && (
  <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold z-10">
    Unavailable
  </div>
)}
{product.stockStatus === "made_to_order" && (
  <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold z-10">
    Made to Order
  </div>
)}
```

- [ ] **Step 3: Add stock status dropdown to `AdminProductEditor.tsx`**

Find the form fields in the product editor. Add a Select component for stock status:

```tsx
<div className="space-y-2">
  <Label>Stock Status</Label>
  <Select
    value={watch("stockStatus") ?? "in_stock"}
    onValueChange={(val) => setValue("stockStatus", val as "in_stock" | "made_to_order" | "out_of_stock")}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="in_stock">In Stock</SelectItem>
      <SelectItem value="made_to_order">Made to Order</SelectItem>
      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Import `Select, SelectTrigger, SelectValue, SelectContent, SelectItem` from `@/components/ui/select`.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProductDetails.tsx client/src/components/ProductCard.tsx client/src/pages/admin/AdminProductEditor.tsx
git commit -m "feat: stock status display on product pages and admin editor"
```

---

## Task 6: Collections Page Search & Filter

**Files:**
- Create: `client/src/components/CollectionsFilter.tsx`
- Modify: `client/src/pages/CategoryPage.tsx`

- [ ] **Step 1: Create `client/src/components/CollectionsFilter.tsx`**

```tsx
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { Product } from "@shared/schema";

export type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

interface CollectionsFilterProps {
  products: Product[];
  search: string;
  onSearchChange: (v: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (v: [number, number]) => void;
  priceMin: number;
  priceMax: number;
  selectedColors: string[];
  onColorToggle: (color: string) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CollectionsFilter({
  products, search, onSearchChange, priceRange, onPriceRangeChange,
  priceMin, priceMax, selectedColors, onColorToggle, sort, onSortChange,
  onClear, hasActiveFilters,
}: CollectionsFilterProps) {
  // Collect unique colors across all products
  const allColors = [...new Set(products.flatMap(p => p.colors))];

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-b border-border mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      {/* Price range */}
      {priceMax > priceMin && (
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            ${Math.round(priceRange[0] / 100).toLocaleString()} – ${Math.round(priceRange[1] / 100).toLocaleString()}
          </span>
          <Slider
            min={priceMin}
            max={priceMax}
            step={100}
            value={priceRange}
            onValueChange={(v) => onPriceRangeChange(v as [number, number])}
            className="w-32"
          />
        </div>
      )}

      {/* Color filters */}
      {allColors.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {allColors.map(color => (
            <button
              key={color}
              onClick={() => onColorToggle(color)}
              title={color}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                selectedColors.includes(color)
                  ? "border-primary scale-110 shadow-md"
                  : "border-transparent hover:border-muted-foreground/50"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Sort */}
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="price_asc">Price: Low → High</SelectItem>
          <SelectItem value="price_desc">Price: High → Low</SelectItem>
          <SelectItem value="name_asc">Name: A → Z</SelectItem>
          <SelectItem value="name_desc">Name: Z → A</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-muted-foreground">
          <X className="w-3 h-3" /> Clear
        </Button>
      )}
    </div>
  );
}

export function applyFilters(
  products: Product[],
  search: string,
  priceRange: [number, number],
  selectedColors: string[],
  sort: SortOption,
): Product[] {
  let result = products.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];

    const matchesColor = selectedColors.length === 0 ||
      selectedColors.some(c => p.colors.includes(c));

    return matchesSearch && matchesPrice && matchesColor;
  });

  switch (sort) {
    case "price_asc":  result.sort((a, b) => a.price - b.price); break;
    case "price_desc": result.sort((a, b) => b.price - a.price); break;
    case "name_asc":   result.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "name_desc":  result.sort((a, b) => b.name.localeCompare(a.name)); break;
    default: break;
  }

  return result;
}
```

- [ ] **Step 2: Integrate into `CategoryPage.tsx`**

Open `client/src/pages/CategoryPage.tsx`. Add state for filters:

```typescript
import { useState, useMemo } from "react";
import { CollectionsFilter, applyFilters, type SortOption } from "@/components/CollectionsFilter";
import { useLocation } from "wouter";

// Inside the component, add:
const [search, setSearch] = useState("");
const [selectedColors, setSelectedColors] = useState<string[]>([]);
const [sort, setSort] = useState<SortOption>("default");

const allProducts = products?.filter(p => !p.isHidden) ?? [];

const priceMin = useMemo(() => Math.min(...allProducts.map(p => p.price), 0), [allProducts]);
const priceMax = useMemo(() => Math.max(...allProducts.map(p => p.price), 100000), [allProducts]);
const [priceRange, setPriceRange] = useState<[number, number]>([priceMin, priceMax]);

const filteredProducts = useMemo(
  () => applyFilters(allProducts, search, priceRange, selectedColors, sort),
  [allProducts, search, priceRange, selectedColors, sort]
);

const hasActiveFilters = search !== "" || selectedColors.length > 0 || sort !== "default"
  || priceRange[0] !== priceMin || priceRange[1] !== priceMax;

const clearFilters = () => {
  setSearch("");
  setSelectedColors([]);
  setSort("default");
  setPriceRange([priceMin, priceMax]);
};

const toggleColor = (color: string) => {
  setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
};
```

Add the `<CollectionsFilter>` component above the product grid in the JSX:

```tsx
<CollectionsFilter
  products={allProducts}
  search={search}
  onSearchChange={setSearch}
  priceRange={priceRange}
  onPriceRangeChange={setPriceRange}
  priceMin={priceMin}
  priceMax={priceMax}
  selectedColors={selectedColors}
  onColorToggle={toggleColor}
  sort={sort}
  onSortChange={setSort}
  onClear={clearFilters}
  hasActiveFilters={hasActiveFilters}
/>
```

Replace `products?.filter(p => !p.isHidden)` in the grid with `filteredProducts`.

Add empty state below the grid:

```tsx
{filteredProducts.length === 0 && !isLoading && (
  <div className="col-span-full text-center py-16 text-muted-foreground">
    <p className="text-lg mb-2">No products match your filters</p>
    <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/CollectionsFilter.tsx client/src/pages/CategoryPage.tsx
git commit -m "feat: search, price range, color filter, and sort on collections page"
```

---

## Task 7: Footer Dynamic Categories + Broken Links Fix

**Files:**
- Modify: `client/src/components/Layout.tsx`
- Modify: `client/src/pages/admin/Settings.tsx`

- [ ] **Step 1: Replace hardcoded footer categories in `Layout.tsx`**

Find the "Collections" column in the footer (around line 194). Replace it entirely:

```tsx
{/* Collections - Dynamic */}
<div className="hidden md:block">
  <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Collections</h4>
  <ul className="space-y-2 text-sm text-muted-foreground">
    {(categories?.filter(c => !c.isHidden).slice(0, 5) ?? []).map(cat => (
      <li key={cat.id}>
        <Link href={`/categories?id=${cat.id}`} className="hover:text-primary transition-colors">
          {cat.name}
        </Link>
      </li>
    ))}
    {(!categories || categories.length === 0) && (
      <li><Link href="/categories" className="hover:text-primary transition-colors">View All</Link></li>
    )}
  </ul>
</div>
```

The `categories` data is already available via `useCategories()` — add the import and hook if not already present in Layout:

```typescript
import { useCategories } from "@/hooks/use-categories";
// Inside Layout:
const { data: categories } = useCategories();
```

- [ ] **Step 2: Fix Privacy Policy, Terms, About links**

Find the footer bottom links (around line 272). Replace:

```tsx
<div className="flex gap-6">
  <a href="#" className="hover:text-foreground" data-testid="link-privacy">Privacy Policy</a>
  <a href="#" className="hover:text-foreground" data-testid="link-terms">Terms of Service</a>
</div>
```

With:

```tsx
<div className="flex gap-6">
  {settings?.privacyPolicyUrl && (
    <a href={settings.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground" data-testid="link-privacy">
      Privacy Policy
    </a>
  )}
  {settings?.termsUrl && (
    <a href={settings.termsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground" data-testid="link-terms">
      Terms of Service
    </a>
  )}
</div>
```

- [ ] **Step 3: Fix "Read Our Story" button in `Home.tsx`**

Find the "Read Our Story" Button in the Philosophy section (around line 282). Replace with:

```tsx
{settings?.aboutUrl && (
  <a href={settings.aboutUrl} target="_blank" rel="noopener noreferrer">
    <Button variant="ghost" className="px-0 text-primary uppercase tracking-widest text-xs font-bold mt-4">
      Read Our Story <ArrowRight className="ml-2 w-4 h-4" />
    </Button>
  </a>
)}
```

- [ ] **Step 4: Fix newsletter form in `Layout.tsx`**

Find the newsletter submit button (around line 247). Add an `onSubmit` handler to the wrapping div or convert to a form:

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault();
    const email = (e.currentTarget.elements.namedItem("newsletter-email") as HTMLInputElement)?.value;
    if (!email) return;
    if (settings?.whatsappNumber) {
      window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=Newsletter+subscription:+${email}`, "_blank");
    } else if (settings?.contactEmail) {
      window.open(`mailto:${settings.contactEmail}?subject=Newsletter+Subscription&body=Email:+${email}`, "_blank");
    } else {
      toast({ title: "To subscribe, please contact us via WhatsApp." });
    }
  }}
  className="flex gap-2"
>
  <input
    name="newsletter-email"
    type="email"
    placeholder="Email Address"
    className="bg-background border border-input rounded-sm px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary"
    data-testid="input-newsletter-email"
  />
  <Button type="submit" variant="default" size="sm" className="rounded-sm" data-testid="button-newsletter-join">Join</Button>
</form>
```

Add `useToast` hook to Layout if not already imported.

- [ ] **Step 5: Add privacyPolicyUrl, termsUrl, aboutUrl, contactEmail fields to Admin Settings page**

Open `client/src/pages/admin/Settings.tsx`. Add form fields for the new settings inside the appropriate section (or at the bottom). Each field follows the existing pattern of the settings form.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/Layout.tsx client/src/pages/Home.tsx client/src/pages/admin/Settings.tsx
git commit -m "feat: dynamic footer categories, working newsletter, conditional privacy/terms/about links"
```

---

## Task 8: AR Device Capability Check + QR Code Fallback

**Files:**
- Modify: `client/src/pages/ProductDetails.tsx`

- [ ] **Step 1: Install qrcode.react**

```bash
npm install qrcode.react
```

- [ ] **Step 2: Add AR device detection state to `ProductDetails.tsx`**

Add imports:

```typescript
import { useEffect, useState } from "react";
import QRCode from "qrcode.react";
```

Add state and detection effect after the existing state declarations:

```typescript
const [arSupported, setArSupported] = useState<boolean | null>(null);

useEffect(() => {
  const check = async () => {
    const iosAR = typeof document !== "undefined" &&
      document.createElement("a").relList?.supports?.("ar");
    const webxrAR = await (navigator as any).xr
      ?.isSessionSupported?.("immersive-ar")
      .catch(() => false);
    setArSupported(!!(iosAR || webxrAR));
  };
  check();
}, []);
```

- [ ] **Step 3: Conditionally render AR button vs QR code in the actions section**

Find the AR button block and wrap it:

```tsx
{product.stockStatus !== "out_of_stock" && product.arLink && (
  arSupported === false ? (
    <div className="flex flex-col items-center gap-3 p-4 border border-border rounded-xl sm:rounded-sm bg-muted/30">
      <QRCode value={typeof window !== "undefined" ? window.location.href : ""} size={120} />
      <p className="text-xs text-center text-muted-foreground">
        Scan on your phone to view in your space
      </p>
    </div>
  ) : (
    <Button
      size="lg"
      className="w-full h-12 sm:h-14 text-sm sm:text-base tracking-widest uppercase font-bold gap-2 sm:gap-3 rounded-full sm:rounded-none shadow-xl shadow-primary/10"
      onClick={() => setArViewerOpen(true)}
      data-testid="button-ar-view"
    >
      <Box className="w-4 h-4 sm:w-5 sm:h-5" /> View in Reality
    </Button>
  )
)}
```

Note: when `arSupported === null` (still detecting), the button renders normally (fail-open).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProductDetails.tsx
git commit -m "feat: AR device detection — show QR code fallback on desktop/unsupported devices"
```

---

## Task 9: AR Loading Progress Bar

**Files:**
- Modify: `client/src/components/ARStudio.tsx`

- [ ] **Step 1: Add progress state to ARStudio**

Add a new state variable alongside the other states:

```typescript
const [loadProgress, setLoadProgress] = useState(0);
```

- [ ] **Step 2: Listen to model-viewer progress events**

Inside the `useEffect` that adds the `"load"` event listener (the one that calls `handleLoad`), add a progress listener alongside it:

```typescript
const handleProgress = (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (detail.totalProgress !== undefined) {
    setLoadProgress(detail.totalProgress);
  }
};

mv.addEventListener("load", handleLoad);
mv.addEventListener("progress", handleProgress);
return () => {
  mv.removeEventListener("load", handleLoad);
  mv.removeEventListener("progress", handleProgress);
};
```

- [ ] **Step 3: Replace the spinner overlay with a progress bar**

Find the model swap loading overlay in the JSX:

```tsx
{isSwappingModel && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10 pointer-events-none">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-8 h-8 text-white animate-spin" />
      <span className="text-white/90 text-sm font-medium">Loading variant…</span>
    </div>
  </div>
)}
```

Replace with:

```tsx
{/* Thin gold progress bar at top when loading */}
{(!modelLoaded || isSwappingModel) && (
  <div
    className="absolute top-0 left-0 h-[3px] z-20 transition-all duration-200"
    style={{
      width: `${Math.round(loadProgress * 100)}%`,
      background: "linear-gradient(90deg, #c8a84b, #e8c96a)",
    }}
  />
)}
```

- [ ] **Step 4: Update the bottom bar button text to show percentage**

Find the "Loading…" text in the bottom bar button:

```tsx
{modelLoaded && !isSwappingModel ? "View in AR" : "Loading…"}
```

Replace with:

```tsx
{modelLoaded && !isSwappingModel
  ? "View in AR"
  : `Loading… ${Math.round(loadProgress * 100)}%`}
```

- [ ] **Step 5: Reset progress on model swap**

In `updateModelSrc`, reset the progress:

```typescript
const updateModelSrc = useCallback((newSrc: string) => {
  currentModelSrcRef.current = newSrc;
  setCurrentModelSrc(newSrc);
  setLoadProgress(0); // reset on new model
}, []);
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ARStudio.tsx
git commit -m "feat: replace AR spinner with gold progress bar showing load percentage"
```

---

## Phase 2 Complete

Run the full test suite:

```bash
npm run test
```

Expected: All tests pass. Manual checks:

- [ ] Click color swatches on product page — selected one shows gold ring
- [ ] Click size pills — selected one shows filled border
- [ ] "Request Information" button opens a sheet/modal with product pre-filled
- [ ] Submitting the inquiry opens WhatsApp (if configured) or email
- [ ] Collections page has a search bar — typing filters products instantly
- [ ] Price slider filters products by price range
- [ ] "Out of Stock" product hides the AR button
- [ ] On desktop browser, AR button is replaced by a QR code (AR not supported on desktop)
- [ ] Opening AR studio shows a gold progress bar instead of a spinner
- [ ] Footer shows actual categories from the database
