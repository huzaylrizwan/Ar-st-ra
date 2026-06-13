# Phase 3 — Admin Power Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real analytics dashboard with charts, drag-to-reorder products/categories, bulk operations, an inquiry log with unread badge, hero image slideshow, and a tabbed Settings page.

**Architecture:** New analytics routes query the existing `pageViews` table. Drag-to-reorder uses `@dnd-kit` (lightweight, no browser-only deps). All new admin routes require `requireAdmin`. No new auth changes.

**Prerequisites:** Phase 1 complete (sortOrder on products), Phase 2 complete (inquiries table, themeSettings new fields).

**Tech Stack:** recharts (already installed), @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities, shadcn Tabs (already installed), React 18

---

## File Map

**Create:**
- `client/src/pages/admin/Analytics.tsx` — analytics dashboard page
- `client/src/pages/admin/Inquiries.tsx` — inquiry log page
- `client/src/hooks/use-inquiries.ts` — TanStack Query hooks for inquiries
- `client/src/components/SortableProductRow.tsx` — dnd-kit sortable row
- `client/src/components/SortableCategoryRow.tsx` — dnd-kit sortable row

**Modify:**
- `shared/schema.ts` — heroSlideInterval on themeSettings; heroImages isActive semantics
- `server/routes.ts` — analytics routes, reorder routes, bulk operations, hero slideshow
- `server/storage.ts` — analytics queries, reorder storage, bulk ops, hero slideshow
- `client/src/App.tsx` — add /admin/analytics and /admin/inquiries routes
- `client/src/components/AdminLayout.tsx` — add nav items + unread badge
- `client/src/pages/admin/Dashboard.tsx` — replace with analytics layout
- `client/src/pages/admin/Products.tsx` — add drag-to-reorder + bulk ops
- `client/src/pages/admin/Categories.tsx` — add drag-to-reorder
- `client/src/pages/admin/Settings.tsx` — tabbed layout
- `client/src/pages/admin/Banners.tsx` — update for multi-active hero images

---

## Task 1: Schema — heroSlideInterval + Analytics Storage Methods

**Files:**
- Modify: `shared/schema.ts`
- Modify: `server/storage.ts`

- [ ] **Step 1: Add `heroSlideInterval` to `themeSettings` in `shared/schema.ts`**

```typescript
// In themeSettings table, add:
heroSlideInterval: integer("hero_slide_interval").default(5).notNull(),
```

- [ ] **Step 2: Push schema**

```bash
npm run db:push
```

- [ ] **Step 3: Add analytics query methods to `server/storage.ts`**

Add these methods to the storage object. Ensure `sql` and `desc` are imported from `drizzle-orm`, and `pageViews`, `products`, `categories` are imported from `@shared/schema`:

```typescript
async getAnalyticsSummary() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Today's page views
  const todayResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pageViews)
    .where(gte(pageViews.viewedAt, todayStart));

  // Last 30 days — grouped by date
  const last30 = await db
    .select({
      date: sql<string>`DATE(viewed_at)::text`,
      views: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(gte(pageViews.viewedAt, thirtyDaysAgo))
    .groupBy(sql`DATE(viewed_at)`)
    .orderBy(sql`DATE(viewed_at)`);

  // Top product pages
  const topProducts = await db
    .select({
      path: pageViews.path,
      views: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.viewedAt, thirtyDaysAgo), like(pageViews.path, "/products/%")))
    .groupBy(pageViews.path)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  // Top category pages
  const topCategories = await db
    .select({
      path: pageViews.path,
      views: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.viewedAt, thirtyDaysAgo), like(pageViews.path, "/categories%")))
    .groupBy(pageViews.path)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  return {
    todayViews: todayResult[0]?.count ?? 0,
    last30Days: last30,
    topProducts,
    topCategories,
  };
},

async getCatalogHealth() {
  const [allProducts, allCategories] = await Promise.all([
    db.select().from(products),
    db.select().from(categories),
  ]);
  const allProductsByCat = allProducts.reduce((acc, p) => {
    if (p.categoryId) acc.add(p.categoryId);
    return acc;
  }, new Set<number>());

  return {
    productsNoArLink: allProducts.filter(p => !p.arLink).length,
    productsHidden: allProducts.filter(p => p.isHidden).length,
    productsNoImages: allProducts.filter(p => !p.images || p.images.length === 0).length,
    categoriesEmpty: allCategories.filter(c => !allProductsByCat.has(c.id)).length,
    productsOutOfStock: allProducts.filter(p => p.stockStatus === "out_of_stock").length,
  };
},
```

Add missing imports at the top of `storage.ts`:

```typescript
import { eq, and, asc, lt, desc, sql, gte, like } from "drizzle-orm";
```

- [ ] **Step 4: Add reorder methods to `server/storage.ts`**

```typescript
async reorderProducts(items: { id: number; sortOrder: number }[]): Promise<void> {
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      db.update(products).set({ sortOrder }).where(eq(products.id, id))
    )
  );
},

async reorderCategories(items: { id: number; sortOrder: number }[]): Promise<void> {
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      db.update(categories).set({ sortOrder }).where(eq(categories.id, id))
    )
  );
},

async bulkUpdateProducts(ids: number[], action: "hide" | "show" | "delete"): Promise<void> {
  if (ids.length === 0) return;
  if (action === "delete") {
    await db.delete(products).where(inArray(products.id, ids));
  } else {
    await db.update(products)
      .set({ isHidden: action === "hide" })
      .where(inArray(products.id, ids));
  }
},
```

Add `inArray` to the drizzle-orm import.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts server/storage.ts
git commit -m "feat: analytics queries, reorder/bulk storage methods, heroSlideInterval schema"
```

---

## Task 2: Analytics API Routes

**Files:**
- Modify: `server/routes.ts`

- [ ] **Step 1: Add analytics and catalog-health routes to `server/routes.ts`**

Add after the existing page-view tracking routes:

```typescript
// Analytics (authenticated)
app.get("/api/analytics/summary", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const summary = await storage.getAnalyticsSummary();
  res.json(summary);
});

app.get("/api/analytics/catalog-health", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const health = await storage.getCatalogHealth();
  res.json(health);
});
```

- [ ] **Step 2: Add reorder routes**

```typescript
// Reorder
app.patch("/api/products/reorder", requireAdmin, async (req, res) => {
  const items = z.array(z.object({ id: z.number(), sortOrder: z.number() })).parse(req.body);
  await storage.reorderProducts(items);
  res.sendStatus(204);
});

app.patch("/api/categories/reorder", requireAdmin, async (req, res) => {
  const items = z.array(z.object({ id: z.number(), sortOrder: z.number() })).parse(req.body);
  await storage.reorderCategories(items);
  res.sendStatus(204);
});
```

- [ ] **Step 3: Add bulk operations route**

```typescript
// Bulk product operations
app.patch("/api/products/bulk", requireAdmin, async (req, res) => {
  const { ids, action } = z.object({
    ids: z.array(z.number()),
    action: z.enum(["hide", "show", "delete"]),
  }).parse(req.body);
  await storage.bulkUpdateProducts(ids, action);
  res.sendStatus(204);
});
```

- [ ] **Step 4: Commit**

```bash
git add server/routes.ts
git commit -m "feat: analytics summary, catalog health, reorder, and bulk operations API routes"
```

---

## Task 3: Analytics Dashboard Page

**Files:**
- Create: `client/src/pages/admin/Analytics.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AdminLayout.tsx`

- [ ] **Step 1: Create `client/src/pages/admin/Analytics.tsx`**

```tsx
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, Users, Package, AlertTriangle } from "lucide-react";

interface AnalyticsSummary {
  todayViews: number;
  last30Days: { date: string; views: number }[];
  topProducts: { path: string; views: number }[];
  topCategories: { path: string; views: number }[];
}

interface CatalogHealth {
  productsNoArLink: number;
  productsHidden: number;
  productsNoImages: number;
  categoriesEmpty: number;
  productsOutOfStock: number;
}

export default function Analytics() {
  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    refetchInterval: 30 * 1000, // refresh every 30s
  });

  const { data: liveVisitors } = useQuery<{ count: number }>({
    queryKey: ["/api/analytics/live-visitors"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/live-visitors", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 30 * 1000,
  });

  const { data: health } = useQuery<CatalogHealth>({
    queryKey: ["/api/analytics/catalog-health"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/catalog-health", { credentials: "include" });
      return res.json();
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">Live traffic and catalog health overview.</p>
        </div>

        {/* Live KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Live Visitors</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{liveVisitors?.count ?? "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">Active right now</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Today's Views</CardTitle>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary?.todayViews ?? "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">Page views today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Top Page Today</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold truncate">
                {summary?.topProducts?.[0]?.path ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.topProducts?.[0]?.views ?? 0} views
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 30-day trend chart */}
        {summary?.last30Days && summary.last30Days.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Daily Sessions — Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={summary.last30Days}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => d.slice(5)} // MM-DD
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top products + categories */}
        <div className="grid gap-4 md:grid-cols-2">
          {summary?.topProducts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Top Products (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={summary.topProducts} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="path"
                      type="category"
                      tick={{ fontSize: 9 }}
                      width={100}
                      tickFormatter={(p) => p.replace("/products/", "#")}
                    />
                    <Tooltip />
                    <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Catalog Health */}
          {health && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Catalog Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "Products without AR link", value: health.productsNoArLink },
                  { label: "Hidden products", value: health.productsHidden },
                  { label: "Products without images", value: health.productsNoImages },
                  { label: "Empty categories", value: health.categoriesEmpty },
                  { label: "Out of stock products", value: health.productsOutOfStock },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${value > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 2: Add route in `client/src/App.tsx`**

Add import:

```typescript
import Analytics from "@/pages/admin/Analytics";
```

Add route inside the admin section:

```tsx
<Route path="/admin/analytics">
  <ProtectedRoute component={Analytics} />
</Route>
```

- [ ] **Step 3: Add "Analytics" nav item to `AdminLayout.tsx`**

Find the nav links array or sidebar in `AdminLayout.tsx`. Add:

```tsx
{ href: "/admin/analytics", label: "Analytics", icon: TrendingUp }
```

Import `TrendingUp` from lucide-react if not already there.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/Analytics.tsx client/src/App.tsx client/src/components/AdminLayout.tsx
git commit -m "feat: analytics dashboard with live visitors, 30-day trend chart, catalog health"
```

---

## Task 4: Drag-to-Reorder Products

**Files:**
- Create: `client/src/components/SortableProductRow.tsx`
- Modify: `client/src/pages/admin/Products.tsx`

- [ ] **Step 1: Install @dnd-kit**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Create `client/src/components/SortableProductRow.tsx`**

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Product } from "@shared/schema";

interface Props {
  product: Product;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}

export function SortableProductRow({ product, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
      aria-label="Drag to reorder"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}
```

- [ ] **Step 3: Update `client/src/pages/admin/Products.tsx` to add DnD + bulk ops**

Add imports:

```typescript
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableProductRow } from "@/components/SortableProductRow";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
```

Add state and mutation inside the component:

```typescript
const queryClient = useQueryClient();
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
const [localProducts, setLocalProducts] = useState<Product[]>([]);

// Sync localProducts when data loads
useEffect(() => {
  if (products) setLocalProducts([...products].sort((a, b) => a.sortOrder - b.sortOrder));
}, [products]);

const sensors = useSensors(useSensor(PointerSensor));

const reorderMutation = useMutation({
  mutationFn: async (items: { id: number; sortOrder: number }[]) => {
    const res = await fetch("/api/products/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error("Reorder failed");
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
});

const bulkMutation = useMutation({
  mutationFn: async ({ ids, action }: { ids: number[]; action: "hide" | "show" | "delete" }) => {
    const res = await fetch("/api/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids, action }),
    });
    if (!res.ok) throw new Error("Bulk action failed");
  },
  onSuccess: () => {
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  },
});

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = localProducts.findIndex(p => p.id === active.id);
  const newIndex = localProducts.findIndex(p => p.id === over.id);
  const reordered = arrayMove(localProducts, oldIndex, newIndex);

  setLocalProducts(reordered);
  reorderMutation.mutate(reordered.map((p, i) => ({ id: p.id, sortOrder: i })));
};

const toggleSelect = (id: number) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};
```

Wrap the product list in DnD context in the JSX:

```tsx
{/* Bulk action bar */}
{selectedIds.size > 0 && (
  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
    <span className="text-sm font-medium">{selectedIds.size} selected</span>
    <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: "hide" })}>Hide</Button>
    <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: "show" })}>Show</Button>
    <Button size="sm" variant="destructive" onClick={() => {
      if (confirm(`Delete ${selectedIds.size} products? This cannot be undone.`)) {
        bulkMutation.mutate({ ids: [...selectedIds], action: "delete" });
      }
    }}>Delete</Button>
    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
  </div>
)}

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={localProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
    {localProducts.map(product => (
      <SortableProductRow key={product.id} product={product}>
        {(dragHandle) => (
          <div className="flex items-center gap-2 p-3 border-b border-border last:border-0">
            {dragHandle}
            <Checkbox
              checked={selectedIds.has(product.id)}
              onCheckedChange={() => toggleSelect(product.id)}
            />
            {/* existing product row content here */}
          </div>
        )}
      </SortableProductRow>
    ))}
  </SortableContext>
</DndContext>
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/SortableProductRow.tsx client/src/pages/admin/Products.tsx
git commit -m "feat: drag-to-reorder and bulk hide/show/delete on admin products page"
```

---

## Task 5: Drag-to-Reorder Categories

**Files:**
- Create: `client/src/components/SortableCategoryRow.tsx`
- Modify: `client/src/pages/admin/Categories.tsx`
- Modify: `shared/schema.ts`

- [ ] **Step 1: Add `sortOrder` to categories table in `shared/schema.ts`**

```typescript
// In categories table, add:
sortOrder: integer("sort_order").default(0).notNull(),
```

```bash
npm run db:push
```

- [ ] **Step 2: Create `client/src/components/SortableCategoryRow.tsx`**

Identical pattern to `SortableProductRow.tsx` but typed for `Category`:

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Category } from "@shared/schema";

interface Props {
  category: Category;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}

export function SortableCategoryRow({ category, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
      aria-label="Drag to reorder"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}
```

- [ ] **Step 3: Apply drag-to-reorder in `Categories.tsx`**

Same pattern as Products.tsx (Task 4, Step 3). Use `SortableCategoryRow`, call `PATCH /api/categories/reorder` on drag end.

- [ ] **Step 4: Update `storage.ts` to order categories by sortOrder**

In `getCategories`, add `.orderBy(asc(categories.sortOrder))`.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts client/src/components/SortableCategoryRow.tsx client/src/pages/admin/Categories.tsx server/storage.ts
git commit -m "feat: drag-to-reorder categories with sortOrder persistence"
```

---

## Task 6: Inquiry Log Admin Page

**Files:**
- Create: `client/src/pages/admin/Inquiries.tsx`
- Create: `client/src/hooks/use-inquiries.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AdminLayout.tsx`

- [ ] **Step 1: Create `client/src/hooks/use-inquiries.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Inquiry } from "@shared/schema";

export function useInquiries() {
  return useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
    queryFn: async () => {
      const res = await fetch("/api/inquiries", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      return res.json();
    },
  });
}

export function useUnreadInquiryCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/inquiries/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/inquiries/unread-count", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 60 * 1000,
  });
}

export function useMarkInquiryRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/inquiries/${id}/read`, { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inquiries"] });
      qc.invalidateQueries({ queryKey: ["/api/inquiries/unread-count"] });
    },
  });
}

export function useDeleteInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/inquiries/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/inquiries"] }),
  });
}
```

- [ ] **Step 2: Create `client/src/pages/admin/Inquiries.tsx`**

```tsx
import { AdminLayout } from "@/components/AdminLayout";
import { useInquiries, useMarkInquiryRead, useDeleteInquiry } from "@/hooks/use-inquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Trash2, Mail } from "lucide-react";
import { useState } from "react";
import type { Inquiry } from "@shared/schema";

function InquiryRow({ inquiry }: { inquiry: Inquiry }) {
  const [expanded, setExpanded] = useState(false);
  const markRead = useMarkInquiryRead();
  const deleteInquiry = useDeleteInquiry();

  const handleExpand = () => {
    setExpanded(v => !v);
    if (!inquiry.isRead) markRead.mutate(inquiry.id);
  };

  return (
    <div
      className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${
        !inquiry.isRead ? "bg-primary/5" : ""
      }`}
      onClick={handleExpand}
    >
      <div className="flex items-center gap-3 p-4">
        {!inquiry.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
        {inquiry.isRead && <div className="w-2 h-2 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{inquiry.customerName}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-sm text-primary font-medium truncate">{inquiry.productName}</span>
            {inquiry.selectedColor && (
              <span
                className="w-3 h-3 rounded-full border border-border flex-shrink-0"
                style={{ backgroundColor: inquiry.selectedColor }}
                title={inquiry.selectedColor}
              />
            )}
            {inquiry.selectedSize && (
              <Badge variant="outline" className="text-[10px]">{inquiry.selectedSize}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{inquiry.contact}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {format(new Date(inquiry.createdAt), "MMM d, h:mm a")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this inquiry?")) deleteInquiry.mutate(inquiry.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="px-9 pb-4 text-sm text-muted-foreground space-y-1">
          {inquiry.message && <p>{inquiry.message}</p>}
          <a
            href={`mailto:${inquiry.contact}?subject=Re: ${inquiry.productName}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3 h-3" /> Reply via email
          </a>
        </div>
      )}
    </div>
  );
}

export default function Inquiries() {
  const { data: inquiries, isLoading } = useInquiries();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Inquiries</h1>
          <p className="text-muted-foreground mt-2">Customer product inquiries.</p>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          {isLoading && <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>}
          {!isLoading && (!inquiries || inquiries.length === 0) && (
            <div className="p-8 text-center text-muted-foreground text-sm">No inquiries yet.</div>
          )}
          {inquiries?.map(inq => <InquiryRow key={inq.id} inquiry={inq} />)}
        </div>
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 3: Add route in `App.tsx`**

```typescript
import Inquiries from "@/pages/admin/Inquiries";

// In Router():
<Route path="/admin/inquiries">
  <ProtectedRoute component={Inquiries} />
</Route>
```

- [ ] **Step 4: Add "Inquiries" nav item with unread badge to `AdminLayout.tsx`**

```tsx
import { useUnreadInquiryCount } from "@/hooks/use-inquiries";

// Inside AdminLayout:
const { data: unreadData } = useUnreadInquiryCount();
const unreadCount = unreadData?.count ?? 0;

// In the nav items, add:
<Link href="/admin/inquiries" className={navItemClass}>
  Inquiries
  {unreadCount > 0 && (
    <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
      {unreadCount}
    </span>
  )}
</Link>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/use-inquiries.ts client/src/pages/admin/Inquiries.tsx client/src/App.tsx client/src/components/AdminLayout.tsx
git commit -m "feat: inquiry log page with unread badge in admin nav"
```

---

## Task 7: Hero Image Slideshow

**Files:**
- Modify: `server/storage.ts`
- Modify: `client/src/pages/Home.tsx`
- Modify: `client/src/pages/admin/Banners.tsx`

- [ ] **Step 1: Update `storage.ts` — getActiveHeroImage returns ALL active images**

Find `getActiveHeroImage` and add a new method alongside it:

```typescript
async getActiveHeroImages(): Promise<HeroImage[]> {
  return db.select().from(heroImages).where(eq(heroImages.isActive, true));
},
```

- [ ] **Step 2: Add route in `server/routes.ts`**

```typescript
app.get("/api/hero-images/active-all", async (req, res) => {
  const images = await storage.getActiveHeroImages();
  res.json(images);
});
```

- [ ] **Step 3: Update `Home.tsx` to cycle through multiple hero images**

Replace the single hero image query with the multi-image query:

```typescript
const { data: activeHeroImages } = useQuery<HeroImage[]>({
  queryKey: ["/api/hero-images/active-all"],
  queryFn: async () => {
    const res = await fetch("/api/hero-images/active-all", { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  },
});

const { data: settings } = useSettings();
const slideInterval = (settings?.heroSlideInterval ?? 5) * 1000;
const [slideIndex, setSlideIndex] = useState(0);

useEffect(() => {
  if (!activeHeroImages || activeHeroImages.length <= 1) return;
  const timer = setInterval(() => {
    setSlideIndex(i => (i + 1) % activeHeroImages.length);
  }, slideInterval);
  return () => clearInterval(timer);
}, [activeHeroImages, slideInterval]);

const heroImageUrl = activeHeroImages?.[slideIndex]?.url ?? FALLBACK_HERO_IMAGE;
```

In the hero section JSX, wrap the `<img>` with `AnimatePresence` for crossfade:

```tsx
<section className="relative h-[70vh] sm:h-[85vh] w-full max-w-full overflow-hidden">
  <AnimatePresence mode="sync">
    <motion.img
      key={heroImageUrl}
      src={heroImageUrl}
      alt="Luxury Interior"
      className="absolute inset-0 w-full h-full object-cover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    />
  </AnimatePresence>

  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />

  {/* Dot indicators */}
  {activeHeroImages && activeHeroImages.length > 1 && (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
      {activeHeroImages.map((_, i) => (
        <button
          key={i}
          onClick={() => setSlideIndex(i)}
          className={`w-2 h-2 rounded-full transition-all ${
            i === slideIndex ? "bg-white scale-125" : "bg-white/50"
          }`}
        />
      ))}
    </div>
  )}

  {/* ... rest of hero content ... */}
</section>
```

- [ ] **Step 4: Update admin hero images UI to allow multiple active images**

In `client/src/pages/admin/Banners.tsx` (or wherever hero images are managed), change the activate toggle from radio-button style (only one active) to checkbox style (multiple can be active).

The `PUT /api/hero-images/:id/activate` route currently uses `setActiveHeroImage` which deactivates all others. Add a new toggle route:

In `server/routes.ts`:
```typescript
app.patch("/api/hero-images/:id/toggle", requireAdmin, async (req, res) => {
  const image = await storage.getHeroImage(Number(req.params.id));
  if (!image) return res.status(404).json({ message: "Not found" });
  const updated = await storage.updateHeroImage(image.id, { isActive: !image.isActive });
  res.json(updated);
});
```

Add `getHeroImage(id)` to storage if missing:
```typescript
async getHeroImage(id: number): Promise<HeroImage | undefined> {
  const [image] = await db.select().from(heroImages).where(eq(heroImages.id, id));
  return image;
},
```

In the admin UI, replace the "Activate" button (which forces single selection) with a toggle switch.

- [ ] **Step 5: Commit**

```bash
git add server/storage.ts server/routes.ts client/src/pages/Home.tsx client/src/pages/admin/Banners.tsx
git commit -m "feat: hero image slideshow — multiple active images, crossfade, dot indicators"
```

---

## Task 8: Settings Page — Tabbed Layout

**Files:**
- Modify: `client/src/pages/admin/Settings.tsx`

- [ ] **Step 1: Restructure `Settings.tsx` into tabs**

The current Settings page is a single scroll. Wrap all sections in `<Tabs>` from shadcn:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// In JSX, replace the flat layout with:
<Tabs defaultValue="branding">
  <TabsList className="mb-6 flex-wrap h-auto gap-1">
    <TabsTrigger value="branding">Branding</TabsTrigger>
    <TabsTrigger value="homepage">Homepage</TabsTrigger>
    <TabsTrigger value="contact">Contact</TabsTrigger>
    <TabsTrigger value="pages">Pages</TabsTrigger>
    <TabsTrigger value="ar-studio">AR Studio</TabsTrigger>
  </TabsList>

  <TabsContent value="branding">
    {/* brandName, logoUrl, primaryColor, fontFamily, currencySymbol */}
  </TabsContent>

  <TabsContent value="homepage">
    {/* showCollections, showNewArrivals, showPhilosophy, showARSection toggles */}
    {/* heroSlideInterval slider (range 3-15) */}
  </TabsContent>

  <TabsContent value="contact">
    {/* whatsappNumber, instagramUrl, facebookUrl, address, mapEmbedUrl, contactEmail */}
  </TabsContent>

  <TabsContent value="pages">
    {/* privacyPolicyUrl, termsUrl, aboutUrl */}
  </TabsContent>

  <TabsContent value="ar-studio">
    {/* arStudioTab1Label, arStudioTab1Icon, arStudioTab2Label, arStudioTab2Icon */}
    {/* studioSidebarColor, studioSidebarOpacity, studioBottomBarColor, studioBottomBarOpacity */}
  </TabsContent>
</Tabs>
```

Move existing form fields into the appropriate tab. Each tab has its own Save button calling `PUT /api/settings` with only that tab's fields.

- [ ] **Step 2: Add heroSlideInterval slider in the Homepage tab**

```tsx
<div className="space-y-2">
  <Label>Hero Slideshow Interval: {watch("heroSlideInterval") ?? 5}s</Label>
  <Slider
    min={3}
    max={15}
    step={1}
    value={[watch("heroSlideInterval") ?? 5]}
    onValueChange={([v]) => setValue("heroSlideInterval", v)}
    className="max-w-xs"
  />
  <p className="text-xs text-muted-foreground">How long each image displays (seconds)</p>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/Settings.tsx
git commit -m "feat: admin settings page — 5 organized tabs (Branding, Homepage, Contact, Pages, AR Studio)"
```

---

---

## Task 9: Product Editor — Image Reorder + Material Slot/UV/Color Name Fields

**Files:**
- Modify: `client/src/pages/admin/AdminProductEditor.tsx`

This task exposes the Phase 1 schema fields (`materialSlotIndex`, `uvScale`) in the admin UI, adds color name labels for materials, and adds image drag-to-reorder.

- [ ] **Step 1: Add image drag-to-reorder in `AdminProductEditor.tsx`**

Find where product images are listed/managed in the editor. Wrap the image list with `DndContext` + `SortableContext` (same imports as Task 4):

```tsx
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable image thumbnail component:
function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="relative group"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <img src={url} className="w-20 h-20 object-cover rounded-lg border border-border" alt={`Image ${index + 1}`} />
        {index === 0 && (
          <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[9px] px-1 rounded font-bold">Cover</span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
      >×</button>
    </div>
  );
}
```

Wrap the images array in the form with DnD:

```tsx
// Get images from form state (adjust field name to match existing form):
const images = watch("images") ?? [];

const imageSensors = useSensors(useSensor(PointerSensor));

const handleImageDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIdx = images.indexOf(active.id as string);
  const newIdx = images.indexOf(over.id as string);
  setValue("images", arrayMove(images, oldIdx, newIdx));
};

// In JSX:
<DndContext sensors={imageSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
  <SortableContext items={images} strategy={horizontalListSortingStrategy}>
    <div className="flex flex-wrap gap-3">
      {images.map((url, i) => (
        <SortableImage
          key={url}
          url={url}
          index={i}
          onRemove={() => setValue("images", images.filter((_, idx) => idx !== i))}
        />
      ))}
    </div>
  </SortableContext>
</DndContext>
```

- [ ] **Step 2: Add `materialSlotIndex`, `uvScale`, and `colorName` fields to the material editor**

Find where materials are created/edited in the product editor (likely a form or modal for each material). Add these three fields alongside the existing `colorHex` and `textureUrl` fields:

```tsx
{/* Material Slot Index */}
<div className="space-y-1">
  <Label htmlFor="materialSlotIndex">
    GLB Material Slot
    <span className="text-xs text-muted-foreground ml-1">(0 = first material in file)</span>
  </Label>
  <Input
    id="materialSlotIndex"
    type="number"
    min={0}
    max={20}
    {...register("materialSlotIndex", { valueAsNumber: true })}
    defaultValue={0}
    className="w-24"
  />
</div>

{/* UV Tiling Scale */}
<div className="space-y-1">
  <Label htmlFor="uvScale">
    Texture Tiling Scale
    <span className="text-xs text-muted-foreground ml-1">(default 8 — higher = smaller tiles)</span>
  </Label>
  <Input
    id="uvScale"
    type="number"
    min={0.1}
    max={100}
    step={0.5}
    {...register("uvScale", { valueAsNumber: true })}
    defaultValue={8}
    className="w-24"
  />
</div>

{/* Color Name */}
<div className="space-y-1">
  <Label htmlFor="colorName">
    Color Name
    <span className="text-xs text-muted-foreground ml-1">(optional — shown to customers)</span>
  </Label>
  <Input
    id="colorName"
    {...register("colorName")}
    placeholder="e.g. Obsidian, Pearl, Walnut"
  />
</div>
```

Ensure the material form submission includes these fields in the PATCH/POST body.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/AdminProductEditor.tsx
git commit -m "feat: image drag-to-reorder in product editor + materialSlotIndex/uvScale/colorName fields on materials"
```

---

## Phase 3 Complete

Run the full test suite:

```bash
npm run test
```

Manual checks:
- [ ] `/admin/analytics` shows live visitors, daily chart, catalog health warnings
- [ ] Admin products page — drag a product row to reorder; reload page and order is preserved
- [ ] Selecting multiple products shows bulk action bar; Hide/Show/Delete works
- [ ] Admin nav shows "Inquiries" with an unread count badge when inquiries exist
- [ ] Inquiry page shows clickable rows; clicking marks as read (blue dot disappears)
- [ ] Homepage cycles through multiple active hero images with crossfade and dot indicators
- [ ] Admin Settings opens with 5 tabs; each tab saves independently
