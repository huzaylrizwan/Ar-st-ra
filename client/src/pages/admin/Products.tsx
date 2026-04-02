import { useState, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Pencil, Trash2, Image as ImageIcon, X, Box, Upload, Palette, Ruler, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct, type Product, type ProductMaterial, type ProductModel, type ProductMeasurement } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PendingMaterial {
  tempId: string;
  name: string;
  colorHex: string;
  textureUrl: string;
  variantModelUrl: string;
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
}

interface PendingMeasurement {
  tempId: string;
  label: string;
  value: string;
  isNew: boolean;
  id?: number;
}

export default function AdminProducts() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const pendingObjectPathsRef = useRef<Map<string, string>>(new Map());
  const pendingArModelPathRef = useRef<string | null>(null);

  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterial[]>([]);
  const [deletedMaterialIds, setDeletedMaterialIds] = useState<number[]>([]);
  const pendingTexturePathsRef = useRef<Map<string, string>>(new Map());
  const pendingVariantModelPathsRef = useRef<Map<string, string>>(new Map());

  const [pendingModels, setPendingModels] = useState<PendingModel[]>([]);
  const [deletedModelIds, setDeletedModelIds] = useState<number[]>([]);
  const pendingModelGlbPathsRef = useRef<Map<string, string>>(new Map());
  const pendingModelThumbnailPathsRef = useRef<Map<string, string>>(new Map());

  const [pendingMeasurements, setPendingMeasurements] = useState<PendingMeasurement[]>([]);
  const [deletedMeasurementIds, setDeletedMeasurementIds] = useState<number[]>([]);

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
    },
  });

  const onSubmit = async (data: InsertProduct) => {
    try {
      if (data.categoryId === 0) {
        toast({
          title: "Selection Required",
          description: "Please select a valid category for this product.",
          variant: "destructive",
        });
        return;
      }

      let savedProduct: Product;
      if (editingProduct) {
        savedProduct = await updateMutation.mutateAsync({ id: editingProduct.id, ...data });
      } else {
        savedProduct = await createMutation.mutateAsync(data);
      }

      const productId = savedProduct.id;

      for (const id of deletedMaterialIds) {
        await apiRequest("DELETE", `/api/products/materials/${id}`);
      }

      for (const mat of pendingMaterials) {
        if (mat.isNew) {
          await apiRequest("POST", `/api/products/${productId}/materials`, {
            name: mat.name,
            colorHex: mat.colorHex,
            textureUrl: mat.textureUrl || null,
            variantModelUrl: mat.variantModelUrl || null,
            sortOrder: pendingMaterials.indexOf(mat),
            isDefault: mat.isDefault,
          });
        } else if (mat.id) {
          await apiRequest("PUT", `/api/products/materials/${mat.id}`, {
            name: mat.name,
            colorHex: mat.colorHex,
            textureUrl: mat.textureUrl || null,
            variantModelUrl: mat.variantModelUrl || null,
            sortOrder: pendingMaterials.indexOf(mat),
            isDefault: mat.isDefault,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "materials"] });

      for (const id of deletedModelIds) {
        await apiRequest("DELETE", `/api/products/models/${id}`);
      }

      for (const mod of pendingModels) {
        if (mod.isNew) {
          await apiRequest("POST", `/api/products/${productId}/models`, {
            name: mod.name,
            modelUrl: mod.modelUrl,
            thumbnailUrl: mod.thumbnailUrl || null,
            isDefault: mod.isDefault,
            sortOrder: pendingModels.indexOf(mod),
          });
        } else if (mod.id) {
          await apiRequest("PUT", `/api/products/models/${mod.id}`, {
            name: mod.name,
            modelUrl: mod.modelUrl,
            thumbnailUrl: mod.thumbnailUrl || null,
            isDefault: mod.isDefault,
            sortOrder: pendingModels.indexOf(mod),
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "models"] });

      for (const id of deletedMeasurementIds) {
        await apiRequest("DELETE", `/api/products/measurements/${id}`);
      }

      for (const meas of pendingMeasurements) {
        if (meas.isNew) {
          await apiRequest("POST", `/api/products/${productId}/measurements`, {
            label: meas.label,
            value: meas.value,
            sortOrder: pendingMeasurements.indexOf(meas),
          });
        } else if (meas.id) {
          await apiRequest("PUT", `/api/products/measurements/${meas.id}`, {
            label: meas.label,
            value: meas.value,
            sortOrder: pendingMeasurements.indexOf(meas),
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "measurements"] });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setPendingMaterials([]);
    setDeletedMaterialIds([]);
    setPendingModels([]);
    setDeletedModelIds([]);
    setPendingMeasurements([]);
    setDeletedMeasurementIds([]);
    form.reset({
      name: "",
      description: "",
      price: 0,
      categoryId: 0,
      arLink: "",
      colors: [],
      sizes: [],
      images: [],
      isHidden: false,
    });
  };

  const handleEdit = async (product: Product) => {
    setIsLoadingProduct(true);
    setIsDialogOpen(true);
    setEditingProduct(product);
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
    });

    try {
      const [existingMaterials, existingModels, existingMeasurements] = await Promise.all([
        queryClient.fetchQuery<ProductMaterial[]>({
          queryKey: ["/api/products", product.id, "materials"],
          staleTime: 0,
        }).catch(() => []),
        queryClient.fetchQuery<ProductModel[]>({
          queryKey: ["/api/products", product.id, "models"],
          staleTime: 0,
        }).catch(() => []),
        queryClient.fetchQuery<ProductMeasurement[]>({
          queryKey: ["/api/products", product.id, "measurements"],
          staleTime: 0,
        }).catch(() => []),
      ]);

      setPendingMaterials(existingMaterials.map((m) => ({
        tempId: String(m.id),
        name: m.name,
        colorHex: m.colorHex,
        textureUrl: m.textureUrl || "",
        variantModelUrl: m.variantModelUrl || "",
        isNew: false,
        isDefault: m.isDefault,
        id: m.id,
      })));

      setPendingModels(existingModels.map((m) => ({
        tempId: String(m.id),
        name: m.name,
        modelUrl: m.modelUrl,
        thumbnailUrl: m.thumbnailUrl || "",
        isDefault: m.isDefault,
        isNew: false,
        id: m.id,
      })));

      setPendingMeasurements(existingMeasurements.map((m) => ({
        tempId: String(m.id),
        label: m.label,
        value: m.value,
        isNew: false,
        id: m.id,
      })));
    } catch (err) {
      console.warn("Failed to load product details:", err);
    }

    setDeletedMaterialIds([]);
    setDeletedModelIds([]);
    setDeletedMeasurementIds([]);
    setIsLoadingProduct(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will delete the product.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleImageUpload = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const newImages = result.successful.map((f: any) => {
        const objectPath = pendingObjectPathsRef.current.get(f.id);
        return objectPath;
      }).filter(Boolean);

      if (newImages.length > 0) {
        const currentImages = form.getValues("images") || [];
        const updatedImages = [...currentImages, ...newImages];
        form.setValue("images", updatedImages, { shouldValidate: true, shouldDirty: true });
        toast({ title: "Images Uploaded", description: `${newImages.length} image(s) added.` });
        pendingObjectPathsRef.current = new Map();
      }
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    form.setValue("images", newImages);
  };

  const handleArModelUpload = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const objectPath = pendingArModelPathRef.current;
      if (objectPath) {
        form.setValue("arLink", objectPath, { shouldValidate: true, shouldDirty: true });
        pendingArModelPathRef.current = null;
        toast({ title: "3D Model Uploaded", description: `${file.name} is ready.` });
      }
    }
  };

  const addMaterialRow = () => {
    setPendingMaterials(prev => [...prev, {
      tempId: `new-${Date.now()}`,
      name: "",
      colorHex: "#888888",
      textureUrl: "",
      variantModelUrl: "",
      isNew: true,
      isDefault: false,
    }]);
  };

  const setMaterialDefault = (tempId: string) => {
    setPendingMaterials(prev => prev.map(m => ({ ...m, isDefault: m.tempId === tempId })));
  };

  const removeMaterialRow = (tempId: string) => {
    const mat = pendingMaterials.find(m => m.tempId === tempId);
    if (mat && !mat.isNew && mat.id) {
      setDeletedMaterialIds(prev => [...prev, mat.id!]);
    }
    setPendingMaterials(prev => prev.filter(m => m.tempId !== tempId));
  };

  const updateMaterialField = (tempId: string, field: keyof PendingMaterial, value: string) => {
    setPendingMaterials(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: value } : m));
  };

  const addModelRow = () => {
    setPendingModels(prev => [...prev, {
      tempId: `new-${Date.now()}`,
      name: "",
      modelUrl: "",
      thumbnailUrl: "",
      isDefault: false,
      isNew: true,
    }]);
  };

  const setModelDefault = (tempId: string) => {
    setPendingModels(prev => prev.map(m => ({ ...m, isDefault: m.tempId === tempId })));
  };

  const removeModelRow = (tempId: string) => {
    const mod = pendingModels.find(m => m.tempId === tempId);
    if (mod && !mod.isNew && mod.id) {
      setDeletedModelIds(prev => [...prev, mod.id!]);
    }
    setPendingModels(prev => prev.filter(m => m.tempId !== tempId));
  };

  const updateModelField = (tempId: string, field: keyof PendingModel, value: string | boolean) => {
    setPendingModels(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: value } : m));
  };

  const addMeasurementRow = () => {
    setPendingMeasurements(prev => [...prev, {
      tempId: `new-${Date.now()}`,
      label: "",
      value: "",
      isNew: true,
    }]);
  };

  const removeMeasurementRow = (tempId: string) => {
    const meas = pendingMeasurements.find(m => m.tempId === tempId);
    if (meas && !meas.isNew && meas.id) {
      setDeletedMeasurementIds(prev => [...prev, meas.id!]);
    }
    setPendingMeasurements(prev => prev.filter(m => m.tempId !== tempId));
  };

  const updateMeasurementField = (tempId: string, field: keyof PendingMeasurement, value: string) => {
    setPendingMeasurements(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: value } : m));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-product">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[860px] max-h-[92vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-5 border-b shrink-0">
              <DialogTitle className="text-xl font-serif">
                {editingProduct ? "Edit Product" : "New Product"}
              </DialogTitle>
            </DialogHeader>

            {isLoadingProduct ? (
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-1/2" />
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <Accordion type="multiple" defaultValue={["basic-info"]} className="space-y-3">

                    {/* Section 1: Basic Info */}
                    <AccordionItem value="basic-info" className="border border-border rounded-lg overflow-hidden">
                      <AccordionTrigger
                        className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors"
                        data-testid="accordion-basic-info"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-base">Basic Info</p>
                            <p className="text-xs text-muted-foreground font-normal">Name, category, price and description</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-6">
                        <div className="space-y-5 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">Product Name</Label>
                            <Input
                              id="name"
                              {...form.register("name")}
                              placeholder="e.g. Velvet Sofa"
                              className={`h-10 text-base ${form.formState.errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              data-testid="input-product-name"
                            />
                            {form.formState.errors.name && (
                              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label htmlFor="categoryId" className="text-sm font-medium">Category</Label>
                              <Select
                                value={form.watch("categoryId") ? String(form.watch("categoryId")) : undefined}
                                onValueChange={(val) => {
                                  form.setValue("categoryId", Number(val), { shouldValidate: true, shouldDirty: true });
                                }}
                              >
                                <SelectTrigger
                                  className={`h-10 ${form.formState.errors.categoryId ? "border-destructive focus:ring-destructive" : ""}`}
                                  data-testid="select-category"
                                >
                                  <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories?.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.formState.errors.categoryId && (
                                <p className="text-sm text-destructive">Category is required</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="price" className="text-sm font-medium">Price (cents)</Label>
                              <Input
                                id="price"
                                type="number"
                                {...form.register("price", { valueAsNumber: true })}
                                className={`h-10 ${form.formState.errors.price ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                data-testid="input-price"
                              />
                              {form.formState.errors.price ? (
                                <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground">Example: 249900 = $2,499.00</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                            <Textarea
                              id="description"
                              {...form.register("description")}
                              placeholder="Describe this product..."
                              className={`min-h-[100px] resize-y text-base ${form.formState.errors.description ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              rows={4}
                              data-testid="textarea-description"
                            />
                            {form.formState.errors.description && (
                              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/40 border border-border">
                            <div>
                              <Label htmlFor="isHidden" className="text-sm font-medium">Hide from Store</Label>
                              <p className="text-xs text-muted-foreground mt-0.5">Product won't appear on the public storefront</p>
                            </div>
                            <Switch
                              id="isHidden"
                              checked={form.watch("isHidden")}
                              onCheckedChange={(checked) => form.setValue("isHidden", checked)}
                              data-testid="switch-hide-product"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 2: Images & AR Model */}
                    <AccordionItem value="images-ar" className="border border-border rounded-lg overflow-hidden">
                      <AccordionTrigger
                        className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors"
                        data-testid="accordion-images-ar"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/10 text-blue-600 shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-base">Images & AR Model</p>
                            <p className="text-xs text-muted-foreground font-normal">Product photos and default 3D model file</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-6">
                        <div className="space-y-6 pt-2">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Product Images</Label>
                            <p className="text-xs text-muted-foreground">Upload up to 5 product photos. First image is used as the thumbnail.</p>
                            <div className="flex flex-wrap gap-3">
                              {form.watch("images")?.map((url, i) => (
                                <div key={i} className="relative group w-24 h-24">
                                  <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover rounded-lg border border-border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(i)}
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    data-testid={`button-remove-image-${i}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <ObjectUploader
                                maxNumberOfFiles={5}
                                onGetUploadParameters={async (file) => {
                                  const res = await fetch("/api/uploads/request-url", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      name: file.name,
                                      size: file.size,
                                      contentType: file.type,
                                    }),
                                  });
                                  const { uploadURL, objectPath } = await res.json();
                                  pendingObjectPathsRef.current.set(file.id, objectPath);
                                  return {
                                    method: "PUT",
                                    url: uploadURL,
                                    headers: { "Content-Type": file.type },
                                  };
                                }}
                                onComplete={handleImageUpload}
                              >
                                <div
                                  className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors gap-1"
                                  data-testid="button-upload-images"
                                >
                                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground">Add photo</span>
                                </div>
                              </ObjectUploader>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Default AR Model (.glb / .gltf)</Label>
                            <p className="text-xs text-muted-foreground">The default 3D model shown in the AR viewer. Individual material variants can override this.</p>
                            {form.watch("arLink") ? (
                              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <Box className="w-5 h-5 text-blue-500 shrink-0" />
                                <span className="text-sm text-blue-700 dark:text-blue-300 flex-1">3D model uploaded</span>
                                <button
                                  type="button"
                                  onClick={() => form.setValue("arLink", "", { shouldValidate: true })}
                                  className="text-destructive hover:text-destructive/70"
                                  data-testid="button-remove-ar-model"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : null}
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={104857600}
                              allowedFileTypes={[".glb", ".gltf"]}
                              onGetUploadParameters={async (file) => {
                                const res = await fetch("/api/uploads/request-url", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    name: file.name,
                                    size: file.size,
                                    contentType: file.type || "model/gltf-binary",
                                  }),
                                });
                                const { uploadURL, objectPath } = await res.json();
                                pendingArModelPathRef.current = objectPath;
                                return {
                                  method: "PUT",
                                  url: uploadURL,
                                  headers: { "Content-Type": file.type || "model/gltf-binary" },
                                };
                              }}
                              onComplete={handleArModelUpload}
                              buttonClassName="h-9"
                            >
                              <div className="flex items-center gap-2" data-testid="button-upload-ar-model">
                                <Upload className="w-4 h-4" />
                                {form.watch("arLink") ? "Replace AR Model" : "Upload AR Model (.glb)"}
                              </div>
                            </ObjectUploader>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 3: Finish / Material Variants */}
                    <AccordionItem value="materials" className="border border-border rounded-lg overflow-hidden">
                      <AccordionTrigger
                        className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors"
                        data-testid="accordion-materials"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-500/10 text-purple-600 shrink-0">
                            <Palette className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-base">Finish / Material Variants</p>
                            <p className="text-xs text-muted-foreground font-normal">
                              Colour swatches, textures and per-variant GLB files
                              {pendingMaterials.length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                                  {pendingMaterials.length}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-6">
                        <div className="space-y-4 pt-2">
                          <p className="text-sm text-muted-foreground">
                            Variants appear as swatches in the AR Studio viewer. Provide a PNG texture for texture swapping, or leave blank to apply the colour directly.
                          </p>

                          {pendingMaterials.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-lg">
                              <Palette className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">No finish variants added yet</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">Add a variant to offer colour or material options</p>
                            </div>
                          )}

                          <div className="space-y-3">
                            {pendingMaterials.map((mat) => (
                              <div
                                key={mat.tempId}
                                className="border border-border rounded-lg bg-card p-4 space-y-4"
                                data-testid={`material-row-${mat.tempId}`}
                              >
                                <div className="flex items-start gap-4">
                                  <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setMaterialDefault(mat.tempId)}
                                      title={mat.isDefault ? "Default material" : "Set as default"}
                                      data-testid={`radio-material-default-${mat.tempId}`}
                                      className={`w-5 h-5 rounded-full border-2 transition-colors ${mat.isDefault ? "border-primary bg-primary" : "border-muted-foreground bg-transparent hover:border-primary"}`}
                                    />
                                    <span className="text-[10px] text-muted-foreground leading-none">Default</span>
                                  </div>

                                  <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div
                                      className="w-10 h-10 rounded-full border-2 border-border shadow-sm"
                                      style={{ backgroundColor: mat.colorHex }}
                                    />
                                    <input
                                      type="color"
                                      value={mat.colorHex}
                                      onChange={(e) => updateMaterialField(mat.tempId, "colorHex", e.target.value)}
                                      className="w-10 h-6 cursor-pointer rounded border-0 p-0 bg-transparent"
                                      data-testid={`input-material-color-${mat.tempId}`}
                                      title="Pick colour"
                                    />
                                  </div>

                                  <div className="flex-1 space-y-3 min-w-0">
                                    <div className="space-y-1.5">
                                      <Label className="text-sm font-medium">Variant Name</Label>
                                      <Input
                                        value={mat.name}
                                        onChange={(e) => updateMaterialField(mat.tempId, "name", e.target.value)}
                                        placeholder="e.g. Walnut, Ivory, Ocean Blue"
                                        className="h-10"
                                        data-testid={`input-material-name-${mat.tempId}`}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">PNG Texture <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        {mat.textureUrl ? (
                                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border mb-2">
                                            <img src={mat.textureUrl} alt="Texture" className="w-7 h-7 object-cover rounded" />
                                            <span className="text-xs text-muted-foreground flex-1 truncate">Texture uploaded</span>
                                            <button
                                              type="button"
                                              onClick={() => updateMaterialField(mat.tempId, "textureUrl", "")}
                                              className="text-destructive hover:text-destructive/70"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : null}
                                        <ObjectUploader
                                          maxNumberOfFiles={1}
                                          allowedFileTypes={[".png"]}
                                          onGetUploadParameters={async (file) => {
                                            const res = await fetch("/api/uploads/request-url", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                                            });
                                            const { uploadURL, objectPath } = await res.json();
                                            pendingTexturePathsRef.current.set(mat.tempId, objectPath);
                                            return { method: "PUT", url: uploadURL, headers: { "Content-Type": file.type } };
                                          }}
                                          onComplete={(result) => {
                                            if (result.successful?.length > 0) {
                                              const objectPath = pendingTexturePathsRef.current.get(mat.tempId);
                                              if (objectPath) {
                                                updateMaterialField(mat.tempId, "textureUrl", objectPath);
                                                pendingTexturePathsRef.current.delete(mat.tempId);
                                              }
                                            }
                                          }}
                                          buttonClassName="h-9 w-full"
                                        >
                                          <div className="flex items-center gap-2" data-testid={`button-upload-texture-${mat.tempId}`}>
                                            <Upload className="w-4 h-4" />
                                            {mat.textureUrl ? "Replace PNG" : "Upload PNG"}
                                          </div>
                                        </ObjectUploader>
                                      </div>

                                      <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">GLB Model <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        {mat.variantModelUrl ? (
                                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border mb-2">
                                            <Box className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="text-xs text-muted-foreground flex-1 truncate">3D model uploaded</span>
                                            <button
                                              type="button"
                                              onClick={() => updateMaterialField(mat.tempId, "variantModelUrl", "")}
                                              className="text-destructive hover:text-destructive/70"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : null}
                                        <ObjectUploader
                                          maxNumberOfFiles={1}
                                          allowedFileTypes={[".glb", ".gltf"]}
                                          onGetUploadParameters={async (file) => {
                                            const res = await fetch("/api/uploads/request-url", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "model/gltf-binary" }),
                                            });
                                            const { uploadURL, objectPath } = await res.json();
                                            pendingVariantModelPathsRef.current.set(mat.tempId, objectPath);
                                            return { method: "PUT", url: uploadURL, headers: { "Content-Type": file.type || "model/gltf-binary" } };
                                          }}
                                          onComplete={(result) => {
                                            if (result.successful?.length > 0) {
                                              const objectPath = pendingVariantModelPathsRef.current.get(mat.tempId);
                                              if (objectPath) {
                                                updateMaterialField(mat.tempId, "variantModelUrl", objectPath);
                                                pendingVariantModelPathsRef.current.delete(mat.tempId);
                                              }
                                            }
                                          }}
                                          buttonClassName="h-9 w-full"
                                        >
                                          <div className="flex items-center gap-2" data-testid={`button-upload-variant-model-${mat.tempId}`}>
                                            <Box className="w-4 h-4" />
                                            {mat.variantModelUrl ? "Replace GLB" : "Upload GLB"}
                                          </div>
                                        </ObjectUploader>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeMaterialRow(mat.tempId)}
                                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1"
                                    data-testid={`button-remove-material-${mat.tempId}`}
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={addMaterialRow}
                            className="w-full h-10 gap-2 border-dashed"
                            data-testid="button-add-material-variant"
                          >
                            <Plus className="w-4 h-4" /> Add Finish
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 4: 3D Model Configurations */}
                    <AccordionItem value="models" className="border border-border rounded-lg overflow-hidden">
                      <AccordionTrigger
                        className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors"
                        data-testid="accordion-models"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                            <Box className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-base">3D Model Configurations</p>
                            <p className="text-xs text-muted-foreground font-normal">
                              Different model files for the same product (e.g. 2-Seater, 3-Seater)
                              {pendingModels.length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                                  {pendingModels.length}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-6">
                        <div className="space-y-4 pt-2">
                          <p className="text-sm text-muted-foreground">
                            Use configurations when the same product comes in structurally different shapes (e.g. seating configurations). Each has its own GLB file and an optional thumbnail preview.
                          </p>

                          {pendingModels.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-lg">
                              <Box className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">No model configurations added yet</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">Add configurations for product size/shape variations</p>
                            </div>
                          )}

                          <div className="space-y-3">
                            {pendingModels.map((mod) => (
                              <div
                                key={mod.tempId}
                                className="border border-border rounded-lg bg-card p-4 space-y-4"
                                data-testid={`model-row-${mod.tempId}`}
                              >
                                <div className="flex items-start gap-4">
                                  <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setModelDefault(mod.tempId)}
                                      title={mod.isDefault ? "Default model" : "Set as default"}
                                      data-testid={`radio-model-default-${mod.tempId}`}
                                      className={`w-5 h-5 rounded-full border-2 transition-colors ${mod.isDefault ? "border-primary bg-primary" : "border-muted-foreground bg-transparent hover:border-primary"}`}
                                    />
                                    <span className="text-[10px] text-muted-foreground leading-none">Default</span>
                                  </div>

                                  {mod.thumbnailUrl ? (
                                    <div className="relative shrink-0">
                                      <img
                                        src={mod.thumbnailUrl}
                                        alt="Thumbnail"
                                        className="w-14 h-14 object-cover rounded-lg border border-border"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center shrink-0">
                                      <Box className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}

                                  <div className="flex-1 space-y-3 min-w-0">
                                    <div className="space-y-1.5">
                                      <Label className="text-sm font-medium">Configuration Name</Label>
                                      <Input
                                        value={mod.name}
                                        onChange={(e) => updateModelField(mod.tempId, "name", e.target.value)}
                                        placeholder="e.g. 2-Seater, Corner L-Shape"
                                        className="h-10"
                                        data-testid={`input-model-name-${mod.tempId}`}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">GLB Model File</Label>
                                        {mod.modelUrl ? (
                                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border mb-2">
                                            <Box className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span className="text-xs text-muted-foreground flex-1 truncate">Model uploaded</span>
                                            <button
                                              type="button"
                                              onClick={() => updateModelField(mod.tempId, "modelUrl", "")}
                                              className="text-destructive hover:text-destructive/70"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : null}
                                        <ObjectUploader
                                          maxNumberOfFiles={1}
                                          allowedFileTypes={[".glb", ".gltf"]}
                                          onGetUploadParameters={async (file) => {
                                            const res = await fetch("/api/uploads/request-url", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "model/gltf-binary" }),
                                            });
                                            const { uploadURL, objectPath } = await res.json();
                                            pendingModelGlbPathsRef.current.set(mod.tempId, objectPath);
                                            return { method: "PUT", url: uploadURL, headers: { "Content-Type": file.type || "model/gltf-binary" } };
                                          }}
                                          onComplete={(result) => {
                                            if (result.successful?.length > 0) {
                                              const objectPath = pendingModelGlbPathsRef.current.get(mod.tempId);
                                              if (objectPath) {
                                                updateModelField(mod.tempId, "modelUrl", objectPath);
                                                pendingModelGlbPathsRef.current.delete(mod.tempId);
                                              }
                                            }
                                          }}
                                          buttonClassName="h-9 w-full"
                                        >
                                          <div className="flex items-center gap-2" data-testid={`button-upload-model-glb-${mod.tempId}`}>
                                            <Upload className="w-4 h-4" />
                                            {mod.modelUrl ? "Replace GLB" : "Upload GLB"}
                                          </div>
                                        </ObjectUploader>
                                      </div>

                                      <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Thumbnail <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        {mod.thumbnailUrl ? (
                                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border mb-2">
                                            <img src={mod.thumbnailUrl} alt="Thumbnail" className="w-7 h-7 object-cover rounded" />
                                            <span className="text-xs text-muted-foreground flex-1 truncate">Thumbnail uploaded</span>
                                            <button
                                              type="button"
                                              onClick={() => updateModelField(mod.tempId, "thumbnailUrl", "")}
                                              className="text-destructive hover:text-destructive/70"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : null}
                                        <ObjectUploader
                                          maxNumberOfFiles={1}
                                          allowedFileTypes={[".png", ".jpg", ".jpeg", ".webp"]}
                                          onGetUploadParameters={async (file) => {
                                            const res = await fetch("/api/uploads/request-url", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                                            });
                                            const { uploadURL, objectPath } = await res.json();
                                            pendingModelThumbnailPathsRef.current.set(mod.tempId, objectPath);
                                            return { method: "PUT", url: uploadURL, headers: { "Content-Type": file.type } };
                                          }}
                                          onComplete={(result) => {
                                            if (result.successful?.length > 0) {
                                              const objectPath = pendingModelThumbnailPathsRef.current.get(mod.tempId);
                                              if (objectPath) {
                                                updateModelField(mod.tempId, "thumbnailUrl", objectPath);
                                                pendingModelThumbnailPathsRef.current.delete(mod.tempId);
                                              }
                                            }
                                          }}
                                          buttonClassName="h-9 w-full"
                                        >
                                          <div className="flex items-center gap-2" data-testid={`button-upload-model-thumbnail-${mod.tempId}`}>
                                            <Upload className="w-4 h-4" />
                                            {mod.thumbnailUrl ? "Replace" : "Upload Image"}
                                          </div>
                                        </ObjectUploader>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeModelRow(mod.tempId)}
                                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1"
                                    data-testid={`button-remove-model-${mod.tempId}`}
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={addModelRow}
                            className="w-full h-10 gap-2 border-dashed"
                            data-testid="button-add-model-configuration"
                          >
                            <Plus className="w-4 h-4" /> Add Model Config
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 5: Dimensions / Measurements */}
                    <AccordionItem value="dimensions" className="border border-border rounded-lg overflow-hidden">
                      <AccordionTrigger
                        className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors"
                        data-testid="accordion-dimensions"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-orange-500/10 text-orange-600 shrink-0">
                            <Ruler className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-base">Dimensions / Measurements</p>
                            <p className="text-xs text-muted-foreground font-normal">
                              Physical size labels shown in the AR Studio
                              {pendingMeasurements.length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                                  {pendingMeasurements.length}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-6">
                        <div className="space-y-4 pt-2">
                          <p className="text-sm text-muted-foreground">
                            Enter product dimensions (e.g. Width – 220 cm, Depth – 90 cm). These will be shown to customers in the AR Studio.
                          </p>

                          {pendingMeasurements.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-lg">
                              <Ruler className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">No dimensions added yet</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">Add width, height, depth and more</p>
                            </div>
                          )}

                          {pendingMeasurements.length > 0 && (
                            <div className="border border-border rounded-lg overflow-hidden">
                              <div className="grid grid-cols-[1fr_1fr_40px] px-4 py-2 bg-muted/50 border-b border-border">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Label</span>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Value</span>
                                <span />
                              </div>
                              <div className="divide-y divide-border">
                                {pendingMeasurements.map((meas, idx) => (
                                  <div
                                    key={meas.tempId}
                                    className="grid grid-cols-[1fr_1fr_40px] items-center gap-2 px-3 py-2"
                                    data-testid={`measurement-row-${meas.tempId}`}
                                  >
                                    <Input
                                      value={meas.label}
                                      onChange={(e) => updateMeasurementField(meas.tempId, "label", e.target.value)}
                                      placeholder="Width"
                                      className="h-9 border-0 shadow-none focus-visible:ring-1 bg-transparent"
                                      data-testid={`input-measurement-label-${meas.tempId}`}
                                    />
                                    <Input
                                      value={meas.value}
                                      onChange={(e) => updateMeasurementField(meas.tempId, "value", e.target.value)}
                                      placeholder="220 cm"
                                      className="h-9 border-0 shadow-none focus-visible:ring-1 bg-transparent"
                                      data-testid={`input-measurement-value-${meas.tempId}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeMeasurementRow(meas.tempId)}
                                      className="text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
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
                            onClick={addMeasurementRow}
                            className="w-full h-10 gap-2 border-dashed"
                            data-testid="button-add-measurement"
                          >
                            <Plus className="w-4 h-4" /> Add Dimension
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </div>

                {/* Sticky footer with Save/Cancel */}
                <div className="shrink-0 px-6 py-4 border-t bg-background flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="min-w-[100px]"
                    data-testid="button-save-product"
                  >
                    {isSaving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>AR</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found.</TableCell>
              </TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images?.[0] && (
                      <img src={product.images[0]} className="w-10 h-10 rounded-sm object-cover" alt="" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{categories?.find(c => c.id === product.categoryId)?.name}</TableCell>
                  <TableCell>${(product.price / 100).toLocaleString()}</TableCell>
                  <TableCell>
                    {product.arLink ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(product)}
                      data-testid={`button-edit-product-${product.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(product.id)}
                      data-testid={`button-delete-product-${product.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
