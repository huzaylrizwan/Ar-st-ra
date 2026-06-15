# Luxury Redesign — Plan 3: Product Page & Admin Editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 1 (Foundation) must be complete — CSS variables, glass classes, and schema changes (specs + sections columns) must exist.

**Goal:** Replace the product page image carousel with an embedded 3D model viewer, add flexible specs and rich optional sections, rebuild the admin product editor into a clear 6-section layout with dynamic specs UI.

**Architecture:** `InlineModelViewer` wraps `<model-viewer>` for in-page rotation. It receives `modelUrl` and `materials` props and handles material swapping using the existing `applyTextureOrColor` logic from ARStudio. The admin editor uses shadcn `Accordion` to group fields into 6 clear sections. Specs and sections are JSON stored on the product row.

**Tech Stack:** React 18, TypeScript, @google/model-viewer, @dnd-kit/core, @dnd-kit/sortable, framer-motion, shadcn/ui, TanStack Query

**Spec:** `docs/superpowers/specs/2026-06-15-luxury-redesign-design.md` — Parts 4, 6, 8

---

## Task 1: InlineModelViewer Component

**Files:**
- Create: `client/src/components/InlineModelViewer.tsx`

- [ ] **Step 1: Create InlineModelViewer.tsx**

Create `client/src/components/InlineModelViewer.tsx`:

```typescript
import { useEffect, useRef, useState } from "react";
import type { ProductMaterial } from "@shared/schema";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
        exposure?: string;
        style?: React.CSSProperties;
        ref?: React.Ref<any>;
      }, HTMLElement>;
    }
  }
}

interface InlineModelViewerProps {
  modelUrl: string;
  materials: ProductMaterial[];
  activeMaterialId: number | null;
  className?: string;
}

export function InlineModelViewer({
  modelUrl,
  materials,
  activeMaterialId,
  className,
}: InlineModelViewerProps) {
  const viewerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Apply material when viewer loads or activeMaterialId changes
  useEffect(() => {
    if (!isLoaded || !viewerRef.current) return;
    const activeMaterial = materials.find(m => m.id === activeMaterialId);
    if (!activeMaterial) return;

    const viewer = viewerRef.current;

    async function applyMaterial() {
      try {
        const model = viewer.model;
        if (!model) return;

        const slotIndex = activeMaterial.materialSlotIndex ?? 0;
        const mat = model.materials[slotIndex];
        if (!mat) return;

        if (activeMaterial.textureUrl) {
          const texture = await viewer.createTexture(activeMaterial.textureUrl);
          const uvScale = activeMaterial.uvScale ?? 8;
          texture.transform.scale = { u: uvScale, v: uvScale };
          mat.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
        } else if (activeMaterial.colorHex) {
          const hex = activeMaterial.colorHex.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
        }
      } catch (err) {
        console.warn("InlineModelViewer material apply failed:", err);
      }
    }

    applyMaterial();
  }, [isLoaded, activeMaterialId, materials]);

  return (
    <div
      className={className}
      style={{ position: "relative", borderRadius: "var(--radius-card)", overflow: "hidden" }}
    >
      {/* Loading overlay */}
      {!isLoaded && (
        <div
          className="absolute inset-0 skeleton-shimmer flex items-center justify-center z-10"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Loading 3D Model…
          </div>
        </div>
      )}

      <model-viewer
        ref={viewerRef}
        src={modelUrl}
        alt="3D product model"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        exposure="0.9"
        onLoad={() => setIsLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
          "--progress-bar-color": "var(--accent)",
        } as React.CSSProperties}
      />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npm run check
```

Expected: 0 errors. If model-viewer types are missing, the existing `@types/google__model-viewer` or the declaration in `ARStudio.tsx` handles it — copy the declaration block if needed.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/InlineModelViewer.tsx
git commit -m "feat: InlineModelViewer — embedded 3D viewer with material swapping, no popup needed"
```

---

## Task 2: Product Page — 3D Viewer as Hero

**Files:**
- Modify: `client/src/pages/ProductDetails.tsx`

- [ ] **Step 1: Fetch product models in ProductDetails.tsx**

Open `client/src/pages/ProductDetails.tsx`. Add a query to fetch product models:

```typescript
import { useQuery } from "@tanstack/react-query";
import type { ProductModel, ProductMaterial } from "@shared/schema";

// Inside the component, after existing queries:
const { data: productModels = [] } = useQuery<ProductModel[]>({
  queryKey: [`/api/products/${id}/models`],
  enabled: !!id,
});

const { data: productMaterials = [] } = useQuery<ProductMaterial[]>({
  queryKey: [`/api/products/${id}/materials`],
  enabled: !!id,
});

const defaultModel = productModels.find(m => m.isDefault) ?? productModels[0];
const defaultMaterial = productMaterials.find(m => m.isDefault && (!m.modelId || m.modelId === defaultModel?.id));
const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);

useEffect(() => {
  if (defaultMaterial && activeMaterialId === null) {
    setActiveMaterialId(defaultMaterial.id);
  }
}, [defaultMaterial, activeMaterialId]);
```

- [ ] **Step 2: Replace image carousel with 3D-first layout**

Find the main product layout `<div className="container mx-auto ... grid grid-cols-1 md:grid-cols-2">`. Replace the left column (currently the image carousel) with:

```typescript
{/* Left column: 3D viewer (primary) or image carousel (fallback) */}
<div className="space-y-4">
  {defaultModel ? (
    <>
      {/* 3D / Photos tab switcher */}
      <div className="flex gap-2">
        {["3D Model", "Photos"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "3D Model" | "Photos")}
            className="px-4 py-1.5 text-xs uppercase tracking-widest transition-all duration-200"
            style={{
              borderRadius: "var(--radius-pill)",
              background: activeTab === tab ? "var(--accent)" : "var(--surface-1)",
              color: activeTab === tab ? "#000" : "var(--text-secondary)",
              border: `1px solid ${activeTab === tab ? "var(--accent)" : "var(--glass-border)"}`,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "3D Model" ? (
        <InlineModelViewer
          modelUrl={defaultModel.modelUrl}
          materials={productMaterials.filter(m => !m.modelId || m.modelId === defaultModel.id)}
          activeMaterialId={activeMaterialId}
          className="w-full"
          style={{ aspectRatio: "4/5" }}
        />
      ) : (
        /* existing photo carousel — keep as-is, just move here */
        <div>{/* existing Embla carousel JSX */}</div>
      )}
    </>
  ) : (
    /* No 3D model: show photo carousel as primary */
    <div>{/* existing Embla carousel JSX */}</div>
  )}

  {/* Photo thumbnail strip */}
  {product.images && product.images.length > 0 && (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {product.images.map((img, i) => (
        <button
          key={i}
          onClick={() => setSelectedIndex(i)}
          className="flex-shrink-0 transition-all duration-200"
          style={{
            width: 60, height: 60,
            borderRadius: "var(--radius-input)",
            overflow: "hidden",
            border: `2px solid ${selectedIndex === i ? "var(--accent)" : "transparent"}`,
            opacity: selectedIndex === i ? 1 : 0.6,
          }}
        >
          <img src={img} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  )}
</div>
```

Add `activeTab` state:
```typescript
const [activeTab, setActiveTab] = useState<"3D Model" | "Photos">("3D Model");
```

Import `InlineModelViewer`:
```typescript
import { InlineModelViewer } from "@/components/InlineModelViewer";
```

- [ ] **Step 3: TypeScript check**

```bash
npm run check
```

Fix any errors.

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Visit a product that has a 3D model. Left column should show 3D viewer with tab switcher. Visit a product without a model — should show photo carousel.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ProductDetails.tsx
git commit -m "feat: product page — InlineModelViewer as hero, photo thumbnail strip, 3D/Photos tab"
```

---

## Task 3: Product Page — Material Swatch Selector

**Files:**
- Modify: `client/src/pages/ProductDetails.tsx`

- [ ] **Step 1: Add swatch selector to the right info column**

In `ProductDetails.tsx`, in the right info column (after the product name and price), add material swatches. Find where colors are currently shown and replace:

```typescript
{/* Material swatches — shown when 3D model has materials */}
{productMaterials.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
        Material
      </span>
      <span className="text-xs" style={{ color: "var(--accent)" }}>
        {productMaterials.find(m => m.id === activeMaterialId)?.colorName || ""}
      </span>
    </div>
    <div className="flex gap-2 flex-wrap">
      {productMaterials
        .filter(m => !m.modelId || m.modelId === defaultModel?.id)
        .map(material => {
          const isActive = activeMaterialId === material.id;
          return (
            <button
              key={material.id}
              title={material.colorName || material.name}
              onClick={() => setActiveMaterialId(material.id)}
              className="relative transition-all duration-200"
              style={{
                width: 32, height: 32,
                borderRadius: "50%",
                background: material.colorHex,
                border: `2px solid ${isActive ? "var(--accent)" : "var(--glass-border)"}`,
                transform: isActive ? "scale(1.15)" : "scale(1)",
                boxShadow: isActive ? `0 0 0 3px var(--accent-glow)` : "none",
              }}
            />
          );
        })}
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify material swapping**

```bash
npm run dev
```

Visit a product with materials. Click a swatch — the 3D model material should update in real time. Tooltip shows color name on hover.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ProductDetails.tsx
git commit -m "feat: product page — material swatch selector updates 3D model in real time"
```

---

## Task 4: Product Page — Flexible Specs + Rich Sections

**Files:**
- Modify: `client/src/pages/ProductDetails.tsx`

- [ ] **Step 1: Add specs display to the info column**

In the right info column, after the material swatches, add:

```typescript
{/* Flexible Specs */}
{Array.isArray(product.specs) && product.specs.length > 0 && (
  <div className="space-y-2">
    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
      Specifications
    </p>
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
      {(product.specs as Array<{ label: string; value: string }>).map((spec, i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-2.5 text-sm"
          style={{
            background: i % 2 === 0 ? "var(--surface-1)" : "var(--surface-2)",
            borderBottom: i < product.specs!.length - 1 ? `1px solid var(--glass-border)` : "none",
          }}
        >
          <span className="w-28 flex-shrink-0 font-medium text-xs uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>
            {spec.label}
          </span>
          <span style={{ color: "var(--text-primary)" }}>{spec.value}</span>
        </div>
      ))}
    </div>
  </div>
)}

{/* Fallback to productMeasurements if no specs */}
{(!product.specs || (product.specs as any[]).length === 0) && measurements && measurements.length > 0 && (
  <div className="space-y-2">
    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Dimensions</p>
    <div className="flex gap-2 flex-wrap">
      {measurements.map((m, i) => (
        <div key={i} className="px-3 py-2 glass text-xs" style={{ borderRadius: "var(--radius-input)" }}>
          <span style={{ color: "var(--text-secondary)" }}>{m.label}: </span>
          <span style={{ color: "var(--text-primary)" }}>{m.value}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

Fetch measurements if not already present:
```typescript
const { data: measurements = [] } = useQuery({
  queryKey: [`/api/products/${id}/measurements`],
  enabled: !!id,
});
```

- [ ] **Step 2: Add rich sections below the main product layout**

After the 2-column grid, before the related products, add:

```typescript
{/* Rich optional sections */}
{product.sections && (
  <div className="space-y-3 mt-12">
    {[
      { key: "story", label: "The Story" },
      { key: "care", label: "Care & Maintenance" },
      { key: "delivery", label: "Delivery Information" },
    ]
      .filter(({ key }) => !!(product.sections as any)?.[key])
      .map(({ key, label }) => (
        <details
          key={key}
          className="group glass"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <summary
            className="flex items-center justify-between px-6 py-4 cursor-pointer list-none"
            style={{ color: "var(--text-primary)" }}
          >
            <span className="font-medium" style={{ fontFamily: "var(--font-serif)" }}>{label}</span>
            <span className="text-lg group-open:rotate-45 transition-transform duration-200"
              style={{ color: "var(--accent)" }}>+</span>
          </summary>
          <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {(product.sections as any)[key]}
          </div>
        </details>
      ))}

    {/* Custom sections */}
    {Array.isArray((product.sections as any)?.custom) &&
      (product.sections as any).custom.map((section: { title: string; body: string }, i: number) => (
        <details
          key={i}
          className="group glass"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none"
            style={{ color: "var(--text-primary)" }}>
            <span className="font-medium" style={{ fontFamily: "var(--font-serif)" }}>{section.title}</span>
            <span className="text-lg group-open:rotate-45 transition-transform duration-200"
              style={{ color: "var(--accent)" }}>+</span>
          </summary>
          <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {section.body}
          </div>
        </details>
      ))}
  </div>
)}
```

- [ ] **Step 3: TypeScript check**

```bash
npm run check
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProductDetails.tsx
git commit -m "feat: product page — flexible specs table, rich sections accordions (story/care/delivery)"
```

---

## Task 5: Product Page — Related Products + Share Button

**Files:**
- Modify: `client/src/pages/ProductDetails.tsx`

- [ ] **Step 1: Add related products query**

In `ProductDetails.tsx`, add a query for related products (same category, excluding current):

```typescript
const { data: relatedProducts = [] } = useQuery<Product[]>({
  queryKey: ["/api/products", { categoryId: product?.categoryId, exclude: id }],
  queryFn: async () => {
    if (!product?.categoryId) return [];
    const res = await fetch(`/api/products?categoryId=${product.categoryId}&limit=6`);
    if (!res.ok) return [];
    const all = await res.json();
    return all.filter((p: Product) => p.id !== id && !p.isHidden).slice(0, 5);
  },
  enabled: !!product?.categoryId,
});
```

- [ ] **Step 2: Render related products strip**

After the rich sections accordions:

```typescript
{relatedProducts.length > 0 && (
  <div className="mt-16">
    <h3 className="font-medium text-xl mb-6"
      style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}>
      From the same collection
    </h3>
    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
      {relatedProducts.map(p => (
        <div key={p.id} className="flex-shrink-0 w-[200px] sm:w-[240px]">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Add Share button to the info column**

After the WhatsApp/inquiry button, add a Share button:

```typescript
<button
  type="button"
  onClick={async () => {
    const shareData = { title: product.name, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Product link copied to clipboard" });
    }
  }}
  className="w-full py-3 text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
  style={{
    border: "1px solid var(--glass-border)",
    borderRadius: "var(--radius-btn)",
    color: "var(--text-secondary)",
    background: "var(--surface-1)",
  }}
>
  Share This Piece
</button>
```

- [ ] **Step 4: Add WhatsApp pre-filled inquiry**

Find the existing inquiry / WhatsApp button and update its href:

```typescript
const whatsappMessage = encodeURIComponent(
  `Hi, I'm interested in the ${product.name} (Ref: #${product.id}).` +
  (selectedColor ? ` Colour: ${selectedColor}.` : "") +
  (selectedSize ? ` Size: ${selectedSize}.` : "") +
  ` Link: ${window.location.href}`
);

// Use this in the inquiry button:
href={`https://wa.me/${settings?.whatsappNumber?.replace(/\D/g, "")}?text=${whatsappMessage}`}
```

- [ ] **Step 5: TypeScript check**

```bash
npm run check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ProductDetails.tsx
git commit -m "feat: product page — related products strip, share button, WhatsApp pre-filled inquiry"
```

---

## Task 6: Admin Editor — 6-Section Accordion Layout

**Files:**
- Modify: `client/src/pages/admin/AdminProductEditor.tsx`

- [ ] **Step 1: Import Accordion from shadcn/ui**

Open `client/src/pages/admin/AdminProductEditor.tsx`. Add to imports:

```typescript
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
```

- [ ] **Step 2: Wrap the form body in an Accordion**

Find where the form fields start (after the page header). Replace the current flat layout with an `<Accordion type="multiple" defaultValue={["basic"]}>` with 6 items:

```typescript
<Accordion type="multiple" defaultValue={["basic"]} className="space-y-3">

  <AccordionItem value="basic" className="glass rounded-2xl px-6 border-none">
    <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5">
      1 · Basic Info
    </AccordionTrigger>
    <AccordionContent className="pb-6 space-y-4">
      {/* Name, description, category, arLink fields — keep existing */}
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="media" className="glass rounded-2xl px-6 border-none">
    <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5">
      2 · Images
    </AccordionTrigger>
    <AccordionContent className="pb-6">
      {/* Image upload + drag-to-reorder grid — keep existing */}
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="models" className="glass rounded-2xl px-6 border-none">
    <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5">
      3 · 3D Models & Materials
    </AccordionTrigger>
    <AccordionContent className="pb-6">
      {/* Existing model/material editor — keep existing */}
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="specs" className="glass rounded-2xl px-6 border-none">
    <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5">
      4 · Specifications
    </AccordionTrigger>
    <AccordionContent className="pb-6">
      {/* Dynamic specs editor — added in Task 7 */}
      {/* Existing measurements section — keep existing */}
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="sections" className="glass rounded-2xl px-6 border-none">
    <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5">
      5 · Rich Content Sections
    </AccordionTrigger>
    <AccordionContent className="pb-6">
      {/* Sections editor — added in Task 8 */}
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="pricing" className="glass rounded-2xl px-6 border-none">
    <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5">
      6 · Pricing & Availability
    </AccordionTrigger>
    <AccordionContent className="pb-6 space-y-4">
      {/* Price, stockStatus, isHidden, sortOrder — keep existing */}
    </AccordionContent>
  </AccordionItem>

</Accordion>
```

Move the existing form fields into the correct accordion sections. Do not change any field logic — only restructure their position.

- [ ] **Step 3: Verify the editor still works**

```bash
npm run dev
```

Go to `http://localhost:5000/admin/products`. Click a product to edit. All 6 sections should be collapsible. Existing fields should work as before.

- [ ] **Step 4: TypeScript check**

```bash
npm run check
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/AdminProductEditor.tsx
git commit -m "feat: admin editor — 6-section accordion layout (Basic/Images/3D/Specs/Sections/Pricing)"
```

---

## Task 7: Admin Editor — Dynamic Specs Key-Value UI

**Files:**
- Modify: `client/src/pages/admin/AdminProductEditor.tsx`

- [ ] **Step 1: Add specs state to the editor**

In `AdminProductEditor.tsx`, add state for specs alongside existing form state:

```typescript
type SpecRow = { label: string; value: string };
const [specs, setSpecs] = useState<SpecRow[]>([]);

// Load specs when editing existing product:
useEffect(() => {
  if (product?.specs && Array.isArray(product.specs)) {
    setSpecs(product.specs as SpecRow[]);
  }
}, [product]);
```

- [ ] **Step 2: Add specs to form submission**

Find the `onSubmit` handler. Before submitting, merge specs into the data:

```typescript
const onSubmit = async (data: InsertProduct) => {
  const payload = { ...data, specs, sections };
  // use payload instead of data in the createMutation/updateMutation call
};
```

- [ ] **Step 3: Add the specs editor UI in Section 4**

Inside the Accordion section 4 ("Specifications"), before the existing measurements:

```typescript
{/* Dynamic Specs */}
<div className="space-y-3 mb-6">
  <div className="flex items-center justify-between">
    <Label className="text-xs uppercase tracking-widest text-muted-foreground">
      Specifications
    </Label>
    <span className="text-xs text-muted-foreground">{specs.length}/20</span>
  </div>

  {specs.map((spec, i) => (
    <div key={i} className="flex gap-2 items-center">
      <Input
        placeholder="Label (e.g. Material)"
        value={spec.label}
        onChange={e => setSpecs(prev => prev.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
        className="w-36 flex-shrink-0"
      />
      <Input
        placeholder="Value (e.g. Italian Velvet)"
        value={spec.value}
        onChange={e => setSpecs(prev => prev.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
        onClick={() => setSpecs(prev => prev.filter((_, j) => j !== i))}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  ))}

  {specs.length < 20 && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => setSpecs(prev => [...prev, { label: "", value: "" }])}
    >
      <Plus className="w-3.5 h-3.5" />
      Add Specification
    </Button>
  )}
</div>

<Separator className="my-4" />
{/* existing productMeasurements section below */}
```

Import `Trash2`, `Plus`, `Separator` if not already imported. `Separator` is from `@/components/ui/separator`.

- [ ] **Step 4: Verify specs save and reload**

```bash
npm run dev
```

Edit a product. Add 2–3 specs. Save. Reopen the product — specs should reload. Visit the public product page — specs table should appear.

- [ ] **Step 5: TypeScript check**

```bash
npm run check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/admin/AdminProductEditor.tsx
git commit -m "feat: admin editor — dynamic specs key-value UI (up to 20 pairs, saved as JSON)"
```

---

## Task 8: Admin Editor — Rich Sections UI

**Files:**
- Modify: `client/src/pages/admin/AdminProductEditor.tsx`

- [ ] **Step 1: Add sections state**

In `AdminProductEditor.tsx`, alongside the `specs` state:

```typescript
type ProductSections = {
  story?: string;
  care?: string;
  delivery?: string;
  custom?: Array<{ title: string; body: string }>;
};

const [sections, setSections] = useState<ProductSections>({});

useEffect(() => {
  if (product?.sections && typeof product.sections === "object") {
    setSections(product.sections as ProductSections);
  }
}, [product]);
```

- [ ] **Step 2: Add sections editor UI in Section 5**

Inside the Accordion section 5 ("Rich Content Sections"):

```typescript
<div className="space-y-6">
  {/* Standard sections */}
  {([
    { key: "story" as const, label: "The Story", placeholder: "Tell the story behind this piece — its craft, inspiration, or origin..." },
    { key: "care" as const, label: "Care & Maintenance", placeholder: "How to care for and maintain this piece..." },
    { key: "delivery" as const, label: "Delivery Information", placeholder: "Lead time, delivery areas, installation details..." },
  ] as const).map(({ key, label, placeholder }) => (
    <div key={key} className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Switch
          checked={!!sections[key]}
          onCheckedChange={checked =>
            setSections(prev => ({
              ...prev,
              [key]: checked ? (prev[key] || "") : undefined,
            }))
          }
        />
      </div>
      {sections[key] !== undefined && (
        <Textarea
          placeholder={placeholder}
          value={sections[key] || ""}
          onChange={e => setSections(prev => ({ ...prev, [key]: e.target.value }))}
          rows={4}
        />
      )}
    </div>
  ))}

  {/* Custom sections */}
  <div className="space-y-3">
    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Custom Sections</Label>
    {sections.custom?.map((section, i) => (
      <div key={i} className="glass p-4 space-y-2" style={{ borderRadius: "var(--radius-input)" }}>
        <div className="flex gap-2">
          <Input
            placeholder="Section title"
            value={section.title}
            onChange={e => setSections(prev => ({
              ...prev,
              custom: prev.custom?.map((s, j) => j === i ? { ...s, title: e.target.value } : s),
            }))}
            className="flex-1"
          />
          <Button
            type="button" variant="ghost" size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive flex-shrink-0"
            onClick={() => setSections(prev => ({
              ...prev,
              custom: prev.custom?.filter((_, j) => j !== i),
            }))}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <Textarea
          placeholder="Section content..."
          value={section.body}
          onChange={e => setSections(prev => ({
            ...prev,
            custom: prev.custom?.map((s, j) => j === i ? { ...s, body: e.target.value } : s),
          }))}
          rows={3}
        />
      </div>
    ))}
    <Button
      type="button" variant="outline" size="sm" className="gap-2"
      onClick={() => setSections(prev => ({
        ...prev,
        custom: [...(prev.custom || []), { title: "", body: "" }],
      }))}
    >
      <Plus className="w-3.5 h-3.5" />
      Add Custom Section
    </Button>
  </div>
</div>
```

- [ ] **Step 3: Verify sections save and display on product page**

```bash
npm run dev
```

Edit a product. Toggle on "The Story", type a paragraph. Save. Go to the public product page — Story accordion should appear at the bottom.

- [ ] **Step 4: TypeScript check**

```bash
npm run check
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/AdminProductEditor.tsx
git commit -m "feat: admin editor — rich sections UI (Story, Care, Delivery, Custom) with toggle + textarea"
```

---

## Verification

After all 8 tasks:

- [ ] `npm run test` — all tests pass
- [ ] `npm run check` — 0 TypeScript errors
- [ ] Manual — Product with 3D model: left column shows model-viewer, clicking material swatches updates the 3D
- [ ] Manual — Product without 3D model: left column shows photo carousel as fallback
- [ ] Manual — Photo thumbnail strip shows below viewer; clicking thumbnails highlights selected
- [ ] Manual — Specs admin: add 3 specs, save, reload editor — specs preserved; public page shows specs table
- [ ] Manual — Sections admin: toggle on Story, type text, save; public page shows Story accordion
- [ ] Manual — Share button: on desktop copies URL + shows toast; on mobile triggers native share sheet
- [ ] Manual — WhatsApp inquiry button: opens WhatsApp with pre-filled message including product name + selected color
- [ ] Manual — Admin editor: 6 sections all expand/collapse, all existing fields still save correctly
