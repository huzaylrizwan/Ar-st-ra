import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { useProduct, useCreateProduct, useUpdateProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useSettings } from "@/hooks/use-settings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/ImageUploader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft, Plus, Pencil, Trash2, Image as ImageIcon, X, Box, Upload, Palette, Ruler,
  ChevronDown, ChevronRight, Check, Loader2, AlertCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct, type Product, type ProductMaterial, type ProductModel, type ProductMeasurement } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, fetchWithCsrf, queryClient as globalQueryClient } from "@/lib/queryClient";
import { DndContext, closestCenter, type DragEndEvent, useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PendingMaterial {
  tempId: string;
  name: string;
  colorHex: string;
  colorName: string;
  textureUrl: string;
  variantModelUrl: string;
  materialSlotIndex: number;
  uvScale: number;
  isNew: boolean;
  isDefault: boolean;
  id?: number;
}

interface PendingModel {
  tempId: string;
  name: string;
  modelUrl: string;
  thumbnailUrl: string;
  isDefault: boolean;
  isNew: boolean;
  id?: number;
  materials?: PendingMaterial[];
  materialsLoaded?: boolean;
  expanded?: boolean;
}

interface PendingMeasurement {
  tempId: string;
  label: string;
  value: string;
  isNew: boolean;
  id?: number;
}

export default function AdminProductEditor() {
  const params = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const isNew = !params.id || params.id === "new" || location === "/admin/products/new";
  const productId = isNew ? null : Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useSettings();
  const currencySymbol = "$";

  const { data: product, isLoading: productLoading } = useProduct(productId ?? NaN);
  const { data: categories } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const [pendingMeasurements, setPendingMeasurements] = useState<PendingMeasurement[]>([]);
  const [deletedMeasurementIds, setDeletedMeasurementIds] = useState<number[]>([]);

  type SpecRow = { label: string; value: string };
  const [specs, setSpecs] = useState<SpecRow[]>([]);

  type ProductSections = {
    story?: string;
    care?: string;
    delivery?: string;
    custom?: Array<{ title: string; body: string }>;
  };

  const [sections, setSections] = useState<ProductSections>({});

  const [pendingModels, setPendingModels] = useState<PendingModel[]>([]);
  const [deletedModelIds, setDeletedModelIds] = useState<number[]>([]);

  const [isDataLoaded, setIsDataLoaded] = useState(() => isNew);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [arLinkStatus, setArLinkStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [isValidatingArLink, setIsValidatingArLink] = useState(false);

  const validateArLinkField = async (url: string) => {
    if (!url) { setArLinkStatus(null); return; }
    setIsValidatingArLink(true);
    setArLinkStatus(null);
    try {
      const res = await fetchWithCsrf("/api/validate-ar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      categoryId: 0,
      arLink: "",
      colors: [],
      sizes: [],
      images: [],
      isHidden: false,
      stockStatus: "in_stock",
    },
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (isNew || isDataLoaded) return;
    if (!product) return;

    form.reset({
        name: product.name,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId,
        arLink: product.arLink,
        colors: product.colors,
        sizes: product.sizes,
        images: product.images,
        isHidden: product.isHidden,
        stockStatus: product.stockStatus ?? "in_stock",
      });

      Promise.all([
        queryClient.fetchQuery<ProductModel[]>({
          queryKey: ["/api/products", product.id, "models"],
          queryFn: async () => {
            const res = await fetchWithCsrf(`/api/products/${product.id}/models`);
            if (!res.ok) return [];
            return res.json();
          },
          staleTime: 0,
        }).catch(() => []),
        queryClient.fetchQuery<ProductMeasurement[]>({
          queryKey: ["/api/products", product.id, "measurements"],
          queryFn: async () => {
            const res = await fetchWithCsrf(`/api/products/${product.id}/measurements`);
            if (!res.ok) return [];
            return res.json();
          },
          staleTime: 0,
        }).catch(() => []),
      ]).then(([existingModels, existingMeasurements]) => {
        setPendingModels(existingModels.map((m) => ({
          tempId: String(m.id),
          name: m.name,
          modelUrl: m.modelUrl,
          thumbnailUrl: m.thumbnailUrl || "",
          isDefault: m.isDefault,
          isNew: false,
          id: m.id,
          expanded: false,
          materialsLoaded: false,
        })));

        setPendingMeasurements(existingMeasurements.map((m) => ({
          tempId: String(m.id),
          label: m.label,
          value: m.value,
          isNew: false,
          id: m.id,
        })));

        setIsDataLoaded(true);
      });
  }, [product, isNew, isDataLoaded]);

  useEffect(() => {
    if (product?.specs && Array.isArray(product.specs)) {
      setSpecs(product.specs as SpecRow[]);
    }
  }, [product?.specs]);

  useEffect(() => {
    if (product?.sections && typeof product.sections === "object") {
      setSections(product.sections as ProductSections);
    }
  }, [product?.sections]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleBack = () => {
    if (isDirty && !confirm("You have unsaved changes. Leave anyway?")) return;
    navigate("/admin/products");
  };

  const onSaveForm = async (data: InsertProduct) => {
    try {
      if (data.categoryId === 0) {
        toast({ title: "Selection Required", description: "Please select a category.", variant: "destructive" });
        return;
      }

      setIsSavingForm(true);

      const priceCents = Math.round(Number(data.price));
      const payload = { ...data, price: priceCents, categoryId: Number(data.categoryId), specs, sections };

      let savedProduct: Product;
      if (isNew) {
        savedProduct = await createMutation.mutateAsync(payload);
        navigate(`/admin/products/${savedProduct.id}`, { replace: true });
      } else {
        savedProduct = await updateMutation.mutateAsync({ id: productId!, ...payload });
      }

      form.reset(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingForm(false);
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    form.setValue("images", newImages, { shouldDirty: true });
  };

  const addMeasurementRow = () => {
    setPendingMeasurements((prev) => [...prev, { tempId: `new-${Date.now()}`, label: "", value: "", isNew: true }]);
  };

  const removeMeasurementRow = (tempId: string) => {
    const meas = pendingMeasurements.find((m) => m.tempId === tempId);
    if (meas && !meas.isNew && meas.id) {
      setDeletedMeasurementIds((prev) => [...prev, meas.id!]);
    }
    setPendingMeasurements((prev) => prev.filter((m) => m.tempId !== tempId));
  };

  const saveMeasurements = async (pid: number) => {
    for (const id of deletedMeasurementIds) {
      await apiRequest("DELETE", `/api/products/measurements/${id}`);
    }
    for (const meas of pendingMeasurements) {
      if (meas.isNew) {
        await apiRequest("POST", `/api/products/${pid}/measurements`, { label: meas.label, value: meas.value, sortOrder: pendingMeasurements.indexOf(meas) });
      } else if (meas.id) {
        await apiRequest("PUT", `/api/products/measurements/${meas.id}`, { label: meas.label, value: meas.value, sortOrder: pendingMeasurements.indexOf(meas) });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/products", pid, "measurements"] });
    setDeletedMeasurementIds([]);
    setPendingMeasurements((prev) => prev.map((m) => ({ ...m, isNew: false })));
  };

  const addModelRow = () => {
    setPendingModels((prev) => [...prev, {
      tempId: `new-${Date.now()}`,
      name: "",
      modelUrl: "",
      thumbnailUrl: "",
      isDefault: false,
      isNew: true,
      expanded: false,
      materialsLoaded: true,
      materials: [],
    }]);
  };

  const removeModelRow = async (tempId: string) => {
    const mod = pendingModels.find((m) => m.tempId === tempId);
    if (mod && !mod.isNew && mod.id) {
      if (!confirm("Delete this model and all its materials?")) return;
      await apiRequest("DELETE", `/api/products/models/${mod.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "models"] });
    }
    setPendingModels((prev) => prev.filter((m) => m.tempId !== tempId));
  };

  const updateModelField = (tempId: string, field: keyof PendingModel, value: string | boolean) => {
    setPendingModels((prev) => prev.map((m) => m.tempId === tempId ? { ...m, [field]: value } : m));
  };

  const setModelDefault = (tempId: string) => {
    setPendingModels((prev) => prev.map((m) => ({ ...m, isDefault: m.tempId === tempId })));
  };

  const saveModel = async (pid: number, mod: PendingModel): Promise<number | undefined> => {
    if (mod.isNew) {
      const res = await apiRequest("POST", `/api/products/${pid}/models`, {
        name: mod.name,
        modelUrl: mod.modelUrl,
        thumbnailUrl: mod.thumbnailUrl || null,
        isDefault: mod.isDefault,
        sortOrder: pendingModels.indexOf(mod),
      });
      const created = await res.json();
      return created.id;
    } else if (mod.id) {
      await apiRequest("PUT", `/api/products/models/${mod.id}`, {
        name: mod.name,
        modelUrl: mod.modelUrl,
        thumbnailUrl: mod.thumbnailUrl || null,
        isDefault: mod.isDefault,
        sortOrder: pendingModels.indexOf(mod),
      });
      return mod.id;
    }
  };

  const toggleModelExpanded = async (tempId: string) => {
    const mod = pendingModels.find((m) => m.tempId === tempId);
    if (!mod) return;

    if (!mod.expanded && !mod.materialsLoaded && mod.id) {
      const materials = await fetchWithCsrf(`/api/products/${productId}/models/${mod.id}/materials`)
        .then((r) => r.ok ? r.json() : [])
        .catch(() => []);

      setPendingModels((prev) => prev.map((m) =>
        m.tempId === tempId
          ? {
            ...m,
            expanded: true,
            materialsLoaded: true,
            materials: materials.map((mat: ProductMaterial) => ({
              tempId: String(mat.id),
              name: mat.name,
              colorHex: mat.colorHex,
              colorName: mat.colorName ?? "",
              textureUrl: mat.textureUrl || "",
              variantModelUrl: mat.variantModelUrl || "",
              materialSlotIndex: mat.materialSlotIndex ?? 0,
              uvScale: mat.uvScale ?? 8,
              isNew: false,
              isDefault: mat.isDefault,
              id: mat.id,
            })),
          }
          : m
      ));
    } else {
      setPendingModels((prev) => prev.map((m) =>
        m.tempId === tempId ? { ...m, expanded: !m.expanded } : m
      ));
    }
  };

  const addMaterialToModel = (modelTempId: string) => {
    setPendingModels((prev) => prev.map((m) =>
      m.tempId === modelTempId
        ? {
          ...m,
          materials: [...(m.materials || []), {
            tempId: `new-${Date.now()}`,
            name: "",
            colorHex: "#888888",
            colorName: "",
            textureUrl: "",
            variantModelUrl: "",
            materialSlotIndex: 0,
            uvScale: 8,
            isNew: true,
            isDefault: false,
          }],
        }
        : m
    ));
  };

  const updateMaterialInModel = (modelTempId: string, matTempId: string, field: keyof PendingMaterial, value: string | boolean | number) => {
    setPendingModels((prev) => prev.map((m) =>
      m.tempId === modelTempId
        ? { ...m, materials: (m.materials || []).map((mat) => mat.tempId === matTempId ? { ...mat, [field]: value } : mat) }
        : m
    ));
  };

  const setMaterialDefaultInModel = (modelTempId: string, matTempId: string) => {
    setPendingModels((prev) => prev.map((m) =>
      m.tempId === modelTempId
        ? { ...m, materials: (m.materials || []).map((mat) => ({ ...mat, isDefault: mat.tempId === matTempId })) }
        : m
    ));
  };

  const removeMaterialFromModel = async (modelTempId: string, matTempId: string) => {
    const mod = pendingModels.find((m) => m.tempId === modelTempId);
    const mat = mod?.materials?.find((m) => m.tempId === matTempId);
    if (mat && !mat.isNew && mat.id && mod?.id) {
      await apiRequest("DELETE", `/api/products/${productId}/models/${mod.id}/materials/${mat.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "models", mod.id, "materials"] });
    }
    setPendingModels((prev) => prev.map((m) =>
      m.tempId === modelTempId
        ? { ...m, materials: (m.materials || []).filter((mat) => mat.tempId !== matTempId) }
        : m
    ));
  };

  const saveMaterialsForModel = async (modelId: number, materials: PendingMaterial[]) => {
    for (const mat of materials) {
      if (mat.isNew) {
        await apiRequest("POST", `/api/products/${productId}/models/${modelId}/materials`, {
          name: mat.name,
          colorHex: mat.colorHex,
          colorName: mat.colorName || null,
          textureUrl: mat.textureUrl || null,
          variantModelUrl: mat.variantModelUrl || null,
          materialSlotIndex: mat.materialSlotIndex,
          uvScale: mat.uvScale,
          sortOrder: materials.indexOf(mat),
          isDefault: mat.isDefault,
        });
      } else if (mat.id) {
        await apiRequest("PUT", `/api/products/${productId}/models/${modelId}/materials/${mat.id}`, {
          name: mat.name,
          colorHex: mat.colorHex,
          colorName: mat.colorName || null,
          textureUrl: mat.textureUrl || null,
          variantModelUrl: mat.variantModelUrl || null,
          materialSlotIndex: mat.materialSlotIndex,
          uvScale: mat.uvScale,
          sortOrder: materials.indexOf(mat),
          isDefault: mat.isDefault,
        });
      }
    }
  };

  const handleSaveModels = async () => {
    if (!productId) return;
    try {
      for (const id of deletedModelIds) {
        await apiRequest("DELETE", `/api/products/models/${id}`);
      }
      for (const mod of pendingModels) {
        const savedId = await saveModel(productId, mod);
        if (savedId && mod.materialsLoaded && mod.materials) {
          await saveMaterialsForModel(savedId, mod.materials);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "models"] });
      setDeletedModelIds([]);
      toast({ title: "Models saved" });

      const refreshedModels = await queryClient.fetchQuery<ProductModel[]>({
        queryKey: ["/api/products", productId, "models"],
        queryFn: async () => {
          const res = await fetchWithCsrf(`/api/products/${productId}/models`);
          if (!res.ok) return [];
          return res.json();
        },
        staleTime: 0,
      }).catch(() => []);

      setPendingModels(refreshedModels.map((m) => ({
        tempId: String(m.id),
        name: m.name,
        modelUrl: m.modelUrl,
        thumbnailUrl: m.thumbnailUrl || "",
        isDefault: m.isDefault,
        isNew: false,
        id: m.id,
        expanded: false,
        materialsLoaded: false,
      })));
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save models", variant: "destructive" });
    }
  };

  const isLoadingPage = !isNew && (productLoading || !isDataLoaded);
  const isSaving = isSavingForm || createMutation.isPending || updateMutation.isPending;

  const images = form.watch("images") || [];
  const arLink = form.watch("arLink");
  const isHidden = form.watch("isHidden");

  const imageDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  if (isLoadingPage) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.indexOf(String(active.id));
    const newIndex = images.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(images, oldIndex, newIndex);
    form.setValue("images", reordered, { shouldDirty: true });
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Products
          </button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-2xl font-serif font-bold">{isNew ? "New Product" : (product?.name || "Edit Product")}</h1>
        </div>

        {/* Product Form */}
        <form onSubmit={form.handleSubmit(onSaveForm)} className="space-y-8">
          <Accordion type="multiple" defaultValue={["basic"]} className="space-y-3">

            {/* Section 1 — Basic Info */}
            <AccordionItem value="basic" className="glass rounded-2xl border-none" style={{ padding: "0 24px" }}>
              <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5 hover:no-underline">
                1 · Basic Info
              </AccordionTrigger>
              <AccordionContent className="pb-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Product Name</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="e.g. Velvet Sofa"
                    className={`h-10 ${form.formState.errors.name ? "border-destructive" : ""}`}
                    data-testid="input-product-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId" className="text-sm font-medium">Category</Label>
                  <Select
                    value={form.watch("categoryId") ? String(form.watch("categoryId")) : undefined}
                    onValueChange={(val) => form.setValue("categoryId", Number(val), { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger className={`h-10 ${form.formState.errors.categoryId ? "border-destructive" : ""}`} data-testid="select-category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.categoryId && (
                    <p className="text-sm text-destructive">Category is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Describe this product..."
                    rows={4}
                    className={`resize-y ${form.formState.errors.description ? "border-destructive" : ""}`}
                    data-testid="textarea-description"
                  />
                </div>

                <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <Label htmlFor="isHidden" className="text-sm font-medium">Hide from Store</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Product won't appear on the public storefront</p>
                  </div>
                  <Switch
                    id="isHidden"
                    checked={isHidden}
                    onCheckedChange={(checked) => form.setValue("isHidden", checked, { shouldDirty: true })}
                    data-testid="switch-hide-product"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2 — Images */}
            <AccordionItem value="media" className="glass rounded-2xl border-none" style={{ padding: "0 24px" }}>
              <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5 hover:no-underline">
                2 · Images
              </AccordionTrigger>
              <AccordionContent className="pb-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product Images</Label>
                  <p className="text-xs text-muted-foreground">First image used as thumbnail. Upload up to 5 photos.</p>
                  <DndContext sensors={imageDndSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                    <SortableContext items={images} strategy={horizontalListSortingStrategy}>
                      <div className="flex flex-wrap gap-3">
                        {images.map((url, i) => (
                          <SortableImage key={url} url={url} index={i} onRemove={() => removeImage(i)} />
                        ))}
                        <ImageUploader
                          accept="image/*"
                          className="p-0 h-auto bg-transparent border-0 hover:bg-transparent shadow-none"
                          onUpload={(url) => {
                            const current = form.getValues("images") || [];
                            form.setValue("images", [...current, url], { shouldDirty: true });
                          }}
                        >
                          <div
                            className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors gap-1"
                            data-testid="button-upload-images"
                          >
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Add photo</span>
                          </div>
                        </ImageUploader>
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 3 — 3D Models & Materials */}
            <AccordionItem value="models" className="glass rounded-2xl border-none" style={{ padding: "0 24px" }}>
              <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5 hover:no-underline">
                3 · 3D Models &amp; Materials
              </AccordionTrigger>
              <AccordionContent className="pb-6 space-y-4">
                {isNew ? (
                  <p className="text-sm text-muted-foreground">Save the product first to manage 3D models.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">3D model configurations for this product</p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addModelRow}
                          className="gap-2"
                          data-testid="button-add-model"
                        >
                          <Plus className="w-4 h-4" /> Add Model
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveModels}
                          data-testid="button-save-models"
                        >
                          Save Models
                        </Button>
                      </div>
                    </div>

                    {pendingModels.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl">
                        <Box className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No models yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Add a 3D model configuration for this product</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingModels.map((mod) => (
                          <ModelCard
                            key={mod.tempId}
                            mod={mod}
                            onToggleExpand={() => toggleModelExpanded(mod.tempId)}
                            onSetDefault={() => setModelDefault(mod.tempId)}
                            onUpdateField={(field, value) => updateModelField(mod.tempId, field, value)}
                            onRemove={() => removeModelRow(mod.tempId)}
                            onAddMaterial={() => addMaterialToModel(mod.tempId)}
                            onRemoveMaterial={(matTempId) => removeMaterialFromModel(mod.tempId, matTempId)}
                            onUpdateMaterial={(matTempId, field, value) => updateMaterialInModel(mod.tempId, matTempId, field, value)}
                            onSetMaterialDefault={(matTempId) => setMaterialDefaultInModel(mod.tempId, matTempId)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Section 4 — Specifications */}
            <AccordionItem value="specs" className="glass rounded-2xl border-none" style={{ padding: "0 24px" }}>
              <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5 hover:no-underline">
                4 · Specifications
              </AccordionTrigger>
              <AccordionContent className="pb-6 space-y-4">
                {/* Dynamic Specs */}
                <div className="space-y-3">
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
                      className="gap-2 border-dashed"
                      onClick={() => setSpecs(prev => [...prev, { label: "", value: "" }])}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Specification
                    </Button>
                  )}
                </div>

                <Separator className="my-4" />

                {/* AR Model */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Default AR Model <span className="text-muted-foreground font-normal text-xs">(.glb / .gltf)</span></Label>
                  {arLink ? (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mb-2">
                      <Box className="w-5 h-5 text-blue-500 shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 flex-1">3D model uploaded</span>
                      <button
                        type="button"
                        onClick={() => { form.setValue("arLink", "", { shouldValidate: true, shouldDirty: true }); setArLinkStatus(null); }}
                        className="text-destructive hover:text-destructive/70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                  <ImageUploader
                    accept=".glb,.gltf"
                    className="h-9"
                    onUpload={(url) => {
                      form.setValue("arLink", url, { shouldValidate: true, shouldDirty: true });
                      validateArLinkField(url);
                    }}
                  >
                    <div className="flex items-center gap-2" data-testid="button-upload-ar-model">
                      <Upload className="w-4 h-4" />
                      {arLink ? "Replace AR Model" : "Upload AR Model (.glb)"}
                    </div>
                  </ImageUploader>
                  <Input
                    placeholder="Or paste a .glb URL directly"
                    value={arLink || ""}
                    onChange={(e) => form.setValue("arLink", e.target.value, { shouldValidate: true, shouldDirty: true })}
                    onBlur={(e) => validateArLinkField(e.target.value)}
                    className="text-xs h-8"
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

                {/* Measurements */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> Measurements
                  </Label>
                  {pendingMeasurements.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden mb-2">
                      <div className="grid grid-cols-[1fr_1fr_36px] px-3 py-2 bg-muted/50 border-b border-border">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Label</span>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Value</span>
                        <span />
                      </div>
                      <div className="divide-y divide-border">
                        {pendingMeasurements.map((meas) => (
                          <div key={meas.tempId} className="grid grid-cols-[1fr_1fr_36px] items-center gap-1 px-2 py-1.5" data-testid={`measurement-row-${meas.tempId}`}>
                            <Input
                              value={meas.label}
                              onChange={(e) => setPendingMeasurements((prev) => prev.map((m) => m.tempId === meas.tempId ? { ...m, label: e.target.value } : m))}
                              placeholder="Width"
                              className="h-8 border-0 shadow-none focus-visible:ring-1 bg-transparent text-sm"
                              data-testid={`input-measurement-label-${meas.tempId}`}
                            />
                            <Input
                              value={meas.value}
                              onChange={(e) => setPendingMeasurements((prev) => prev.map((m) => m.tempId === meas.tempId ? { ...m, value: e.target.value } : m))}
                              placeholder="220 cm"
                              className="h-8 border-0 shadow-none focus-visible:ring-1 bg-transparent text-sm"
                              data-testid={`input-measurement-value-${meas.tempId}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeMeasurementRow(meas.tempId)}
                              className="text-muted-foreground hover:text-destructive flex items-center justify-center"
                              data-testid={`button-remove-measurement-${meas.tempId}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMeasurementRow}
                    className="gap-2 border-dashed w-full"
                    data-testid="button-add-measurement"
                  >
                    <Plus className="w-4 h-4" /> Add Measurement
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 5 — Rich Content Sections */}
            <AccordionItem value="sections" className="glass rounded-2xl border-none" style={{ padding: "0 24px" }}>
              <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5 hover:no-underline">
                5 · Rich Content Sections
              </AccordionTrigger>
              <AccordionContent className="pb-6 space-y-6">
                <div className="space-y-6">
                  {/* Standard sections */}
                  {([
                    { key: "story" as const, label: "The Story", placeholder: "Tell the story behind this piece — its craft, inspiration, or origin..." },
                    { key: "care" as const, label: "Care & Maintenance", placeholder: "How to care for and maintain this piece..." },
                    { key: "delivery" as const, label: "Delivery Information", placeholder: "Lead time, delivery areas, installation details..." },
                  ]).map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{label}</Label>
                        <Switch
                          checked={sections[key] !== undefined}
                          onCheckedChange={checked =>
                            setSections(prev => ({
                              ...prev,
                              [key]: checked ? (prev[key] ?? "") : undefined,
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
              </AccordionContent>
            </AccordionItem>

            {/* Section 6 — Pricing & Availability */}
            <AccordionItem value="pricing" className="glass rounded-2xl border-none" style={{ padding: "0 24px" }}>
              <AccordionTrigger className="text-sm font-semibold uppercase tracking-widest py-5 hover:no-underline">
                6 · Pricing &amp; Availability
              </AccordionTrigger>
              <AccordionContent className="pb-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium">Price</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.watch("price") ? (form.watch("price") / 100).toFixed(2) : ""}
                      onChange={(e) => {
                        const dollars = parseFloat(e.target.value) || 0;
                        form.setValue("price", Math.round(dollars * 100), { shouldDirty: true });
                      }}
                      className={`rounded-l-none h-10 ${form.formState.errors.price ? "border-destructive" : ""}`}
                      data-testid="input-price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Enter price in dollars (stored as cents)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stock Status</Label>
                  <Select
                    value={form.watch("stockStatus") ?? "in_stock"}
                    onValueChange={(val) => form.setValue("stockStatus", val as "in_stock" | "made_to_order" | "out_of_stock", { shouldDirty: true })}
                  >
                    <SelectTrigger data-testid="select-stock-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="made_to_order">Made to Order</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* Save bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              data-testid="button-save-product"
            >
              {isSaving ? "Saving..." : isNew ? "Create Product" : "Save Product"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

interface ModelCardProps {
  mod: PendingModel;
  onToggleExpand: () => void;
  onSetDefault: () => void;
  onUpdateField: (field: keyof PendingModel, value: string | boolean) => void;
  onRemove: () => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (matTempId: string) => void;
  onUpdateMaterial: (matTempId: string, field: keyof PendingMaterial, value: string | boolean | number) => void;
  onSetMaterialDefault: (matTempId: string) => void;
}

function ModelCard({
  mod,
  onToggleExpand,
  onSetDefault,
  onUpdateField,
  onRemove,
  onAddMaterial,
  onRemoveMaterial,
  onUpdateMaterial,
  onSetMaterialDefault,
}: ModelCardProps) {

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden" data-testid={`model-card-${mod.tempId}`}>
      {/* Model header row */}
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={onSetDefault}
          title={mod.isDefault ? "Default model" : "Set as default"}
          data-testid={`radio-model-default-${mod.tempId}`}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center ${mod.isDefault ? "border-primary bg-primary text-white" : "border-muted-foreground bg-transparent hover:border-primary"}`}
        >
          {mod.isDefault && <Check className="w-3 h-3" />}
        </button>

        {mod.thumbnailUrl ? (
          <img src={mod.thumbnailUrl} alt="thumbnail" className="w-12 h-12 object-cover rounded-lg border border-border shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center shrink-0">
            <Box className="w-5 h-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          <Input
            value={mod.name}
            onChange={(e) => onUpdateField("name", e.target.value)}
            placeholder="Model name (e.g. 2-Seater)"
            className="h-9"
            data-testid={`input-model-name-${mod.tempId}`}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {mod.modelUrl ? (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Box className="w-2.5 h-2.5" /> GLB uploaded
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">No GLB</Badge>
            )}
            {mod.isDefault && <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/30">Default</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <ImageUploader
            accept=".glb,.gltf"
            className="h-8 text-xs px-2"
            onUpload={(url) => onUpdateField("modelUrl", url)}
          >
            <span data-testid={`button-upload-model-glb-${mod.tempId}`} className="flex items-center gap-1">
              <Upload className="w-3 h-3" />
              {mod.modelUrl ? "GLB" : "Upload GLB"}
            </span>
          </ImageUploader>

          <ImageUploader
            accept="image/*"
            className="h-8 text-xs px-2"
            onUpload={(url) => onUpdateField("thumbnailUrl", url)}
          >
            <span data-testid={`button-upload-model-thumbnail-${mod.tempId}`} className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Thumb
            </span>
          </ImageUploader>

          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5"
            data-testid={`button-remove-model-${mod.tempId}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5"
            data-testid={`button-expand-model-${mod.tempId}`}
          >
            {mod.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Materials sub-panel */}
      {mod.expanded && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" /> Materials
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddMaterial}
              className="gap-1.5 h-7 text-xs"
              data-testid={`button-add-material-${mod.tempId}`}
            >
              <Plus className="w-3 h-3" /> Add Material
            </Button>
          </div>

          {!mod.materials || mod.materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-border rounded-lg">
              <Palette className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No materials yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {mod.materials.map((mat) => (
                <MaterialCard
                  key={mat.tempId}
                  mat={mat}
                  onSetDefault={() => onSetMaterialDefault(mat.tempId)}
                  onUpdate={(field, value) => onUpdateMaterial(mat.tempId, field, value)}
                  onRemove={() => onRemoveMaterial(mat.tempId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MaterialCardProps {
  mat: PendingMaterial;
  onSetDefault: () => void;
  onUpdate: (field: keyof PendingMaterial, value: string | boolean | number) => void;
  onRemove: () => void;
}

function MaterialCard({ mat, onSetDefault, onUpdate, onRemove }: MaterialCardProps) {
  return (
    <div
      className="border border-border rounded-lg bg-card p-3 space-y-2 relative"
      data-testid={`material-card-${mat.tempId}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSetDefault}
          title={mat.isDefault ? "Default material" : "Set as default"}
          data-testid={`radio-material-default-${mat.tempId}`}
          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${mat.isDefault ? "border-primary bg-primary text-white" : "border-muted-foreground hover:border-primary"}`}
        >
          {mat.isDefault && <Check className="w-2.5 h-2.5" />}
        </button>

        <div
          className="w-8 h-8 rounded-full border-2 border-border shadow-sm shrink-0 cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: mat.colorHex }}
          title="Click to change color"
        >
          <input
            type="color"
            value={mat.colorHex}
            onChange={(e) => onUpdate("colorHex", e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            data-testid={`input-material-color-${mat.tempId}`}
          />
        </div>

        {mat.textureUrl && (
          <img src={mat.textureUrl} alt="texture" className="w-8 h-8 object-cover rounded border border-border shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <Input
            value={mat.name}
            onChange={(e) => onUpdate("name", e.target.value)}
            placeholder="Name"
            className="h-7 text-xs"
            data-testid={`input-material-name-${mat.tempId}`}
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          data-testid={`button-remove-material-${mat.tempId}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-1.5">
        <ImageUploader
          accept=".png,image/*"
          className="h-7 text-xs flex-1 px-2"
          onUpload={(url) => onUpdate("textureUrl", url)}
        >
          <span data-testid={`button-upload-texture-${mat.tempId}`} className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {mat.textureUrl ? "PNG" : "Texture"}
          </span>
        </ImageUploader>

        <ImageUploader
          accept=".glb,.gltf"
          className="h-7 text-xs flex-1 px-2"
          onUpload={(url) => onUpdate("variantModelUrl", url)}
        >
          <span data-testid={`button-upload-material-glb-${mat.tempId}`} className="flex items-center gap-1">
            <Box className="w-3 h-3" />
            {mat.variantModelUrl ? "GLB" : "Model"}
          </span>
        </ImageUploader>
      </div>

      {/* New fields row */}
      <div className="space-y-1.5">
        <Input
          value={mat.colorName}
          onChange={(e) => onUpdate("colorName", e.target.value)}
          placeholder="Color name (e.g. Ivory)"
          className="h-7 text-xs"
          data-testid={`input-material-color-name-${mat.tempId}`}
        />
        <div className="flex gap-1.5">
          <div className="flex-1 space-y-0.5">
            <label className="text-[10px] text-muted-foreground">Slot</label>
            <Input
              type="number"
              min={0}
              value={mat.materialSlotIndex}
              onChange={(e) => onUpdate("materialSlotIndex", Number(e.target.value))}
              className="h-7 text-xs"
              data-testid={`input-material-slot-${mat.tempId}`}
            />
          </div>
          <div className="flex-1 space-y-0.5">
            <label className="text-[10px] text-muted-foreground">UV Scale</label>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={mat.uvScale}
              onChange={(e) => onUpdate("uvScale", Number(e.target.value))}
              className="h-7 text-xs"
              data-testid={`input-material-uv-scale-${mat.tempId}`}
            />
          </div>
        </div>
      </div>

      {(mat.isDefault) && (
        <Badge className="text-[9px] bg-primary/10 text-primary border border-primary/30 h-4 px-1">Default</Badge>
      )}
    </div>
  );
}

interface SortableImageProps {
  url: string;
  index: number;
  onRemove: () => void;
}

function SortableImage({ url, index, onRemove }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: url });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group w-20 h-20"
      data-testid={`image-tile-${index}`}
    >
      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-border" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        data-testid={`button-remove-image-${index}`}
      >
        <X className="w-3 h-3" />
      </button>
      {index === 0 && (
        <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-black/50 text-white rounded-b-lg py-0.5">
          Cover
        </span>
      )}
    </div>
  );
}
