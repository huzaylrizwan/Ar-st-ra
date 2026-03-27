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
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Pencil, Trash2, Image as ImageIcon, X, Box, Upload, Palette } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct, type Product, type ProductMaterial } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PendingMaterial {
  tempId: string;
  name: string;
  colorHex: string;
  textureUrl: string;
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

  const [colorsInput, setColorsInput] = useState("");
  const [sizesInput, setSizesInput] = useState("");
  
  const pendingObjectPathsRef = useRef<Map<string, string>>(new Map());
  const pendingArModelPathRef = useRef<string | null>(null);

  // Material variants state
  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterial[]>([]);
  const [deletedMaterialIds, setDeletedMaterialIds] = useState<number[]>([]);
  const pendingTexturePathsRef = useRef<Map<string, string>>(new Map());

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
      isHidden: false
    }
  });

  const onSubmit = async (data: InsertProduct) => {
    try {
      if (data.categoryId === 0) {
        toast({ 
          title: "Selection Required", 
          description: "Please select a valid category for this product.",
          variant: "destructive" 
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

      // Delete removed materials
      for (const id of deletedMaterialIds) {
        await apiRequest("DELETE", `/api/products/materials/${id}`);
      }

      // Save pending materials
      for (const mat of pendingMaterials) {
        if (mat.isNew) {
          await apiRequest("POST", `/api/products/${productId}/materials`, {
            name: mat.name,
            colorHex: mat.colorHex,
            textureUrl: mat.textureUrl || null,
            sortOrder: pendingMaterials.indexOf(mat),
          });
        } else if (mat.id) {
          await apiRequest("PUT", `/api/products/materials/${mat.id}`, {
            name: mat.name,
            colorHex: mat.colorHex,
            textureUrl: mat.textureUrl || null,
            sortOrder: pendingMaterials.indexOf(mat),
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "materials"] });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setColorsInput("");
    setSizesInput("");
    setPendingMaterials([]);
    setDeletedMaterialIds([]);
    form.reset({
      name: "",
      description: "",
      price: 0,
      categoryId: 0,
      arLink: "",
      colors: [],
      sizes: [],
      images: [],
      isHidden: false
    });
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setColorsInput(product.colors?.join(", ") || "");
    setSizesInput(product.sizes?.join(", ") || "");
    form.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      arLink: product.arLink,
      colors: product.colors,
      sizes: product.sizes,
      images: product.images,
      isHidden: product.isHidden
    });

    // Load existing materials using TanStack Query (ensures credentials are sent)
    try {
      const existingMaterials = await queryClient.fetchQuery<ProductMaterial[]>({
        queryKey: ["/api/products", product.id, "materials"],
        staleTime: 0,
      });
      setPendingMaterials(existingMaterials.map((m) => ({
        tempId: String(m.id),
        name: m.name,
        colorHex: m.colorHex,
        textureUrl: m.textureUrl || "",
        isNew: false,
        id: m.id,
      })));
    } catch (err) {
      console.warn("Failed to load materials for product, opening dialog with empty materials:", err);
      setPendingMaterials([]);
    }
    setDeletedMaterialIds([]);
    setIsDialogOpen(true);
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

  const handleArraysBlur = () => {
    if (colorsInput) {
      form.setValue("colors", colorsInput.split(",").map(s => s.trim()).filter(Boolean));
    }
    if (sizesInput) {
      form.setValue("sizes", sizesInput.split(",").map(s => s.trim()).filter(Boolean));
    }
  };

  // Material variant helpers
  const addMaterialRow = () => {
    setPendingMaterials(prev => [...prev, {
      tempId: `new-${Date.now()}`,
      name: "",
      colorHex: "#888888",
      textureUrl: "",
      isNew: true,
    }]);
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
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" {...form.register("name")} placeholder="Velvet Sofa" />
                  {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select 
                    value={form.watch("categoryId") ? String(form.watch("categoryId")) : undefined} 
                    onValueChange={(val) => {
                      const numVal = Number(val);
                      form.setValue("categoryId", numVal, { shouldValidate: true, shouldDirty: true });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.categoryId && <p className="text-sm text-destructive">Category is required</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...form.register("description")} placeholder="Product details..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (cents)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    {...form.register("price", { valueAsNumber: true })} 
                  />
                  <p className="text-xs text-muted-foreground">Example: 249900 = $2,499.00</p>
                </div>
                <div className="space-y-2">
                  <Label>AR 3D Model (.glb / .gltf)</Label>
                  {form.watch("arLink") ? (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-sm border border-border">
                      <Box className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-xs text-muted-foreground truncate flex-1">Model uploaded</span>
                      <button
                        type="button"
                        onClick={() => form.setValue("arLink", "", { shouldValidate: true })}
                        className="text-destructive hover:text-destructive/70"
                        data-testid="button-remove-ar-model"
                      >
                        <X className="w-3 h-3" />
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
                    buttonClassName="w-full"
                  >
                    <div className="flex items-center gap-2" data-testid="button-upload-ar-model">
                      <Upload className="w-4 h-4" />
                      {form.watch("arLink") ? "Replace Model" : "Upload Model"}
                    </div>
                  </ObjectUploader>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colors">Colors (comma separated)</Label>
                  <Input 
                    id="colors" 
                    value={colorsInput}
                    onChange={(e) => setColorsInput(e.target.value)}
                    onBlur={handleArraysBlur}
                    placeholder="#FFFFFF, #000000" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sizes">Sizes (comma separated)</Label>
                  <Input 
                    id="sizes" 
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                    onBlur={handleArraysBlur}
                    placeholder="S, M, L, XL" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Images</Label>
                <div className="flex flex-wrap gap-4 mb-2">
                  {form.watch("images")?.map((url, i) => (
                    <div key={i} className="relative group w-20 h-20">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-sm border" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <div className="w-20 h-20 border-2 border-dashed border-border rounded-sm flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </ObjectUploader>
                </div>
              </div>

              {/* Material Variants Section */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-base font-semibold">Material Variants</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMaterialRow}
                    className="gap-1"
                    data-testid="button-add-material-variant"
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Variants appear as swatches in the 3D Studio viewer. Provide a PNG texture for texture swapping, or leave blank to apply the color directly.
                </p>

                {pendingMaterials.length === 0 && (
                  <p className="text-sm text-muted-foreground italic text-center py-3">
                    No variants added yet.
                  </p>
                )}

                <div className="space-y-3">
                  {pendingMaterials.map((mat) => (
                    <div
                      key={mat.tempId}
                      className="flex items-start gap-3 p-3 border border-border rounded-md bg-muted/20"
                      data-testid={`material-row-${mat.tempId}`}
                    >
                      {/* Color swatch */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div
                          className="w-8 h-8 rounded-full border border-border shadow-sm"
                          style={{ backgroundColor: mat.colorHex }}
                        />
                        <input
                          type="color"
                          value={mat.colorHex}
                          onChange={(e) => updateMaterialField(mat.tempId, "colorHex", e.target.value)}
                          className="w-8 h-5 cursor-pointer rounded border-0 p-0 bg-transparent"
                          data-testid={`input-material-color-${mat.tempId}`}
                          title="Pick color"
                        />
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="space-y-1">
                          <Label className="text-xs">Variant Name</Label>
                          <Input
                            value={mat.name}
                            onChange={(e) => updateMaterialField(mat.tempId, "name", e.target.value)}
                            placeholder="e.g. Walnut, Ivory, Ocean Blue"
                            className="h-8 text-sm"
                            data-testid={`input-material-name-${mat.tempId}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">PNG Texture (optional)</Label>
                          {mat.textureUrl ? (
                            <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded border border-border">
                              <img
                                src={mat.textureUrl}
                                alt="Texture preview"
                                className="w-6 h-6 object-cover rounded"
                              />
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
                                body: JSON.stringify({
                                  name: file.name,
                                  size: file.size,
                                  contentType: file.type,
                                }),
                              });
                              const { uploadURL, objectPath } = await res.json();
                              pendingTexturePathsRef.current.set(mat.tempId, objectPath);
                              return {
                                method: "PUT",
                                url: uploadURL,
                                headers: { "Content-Type": file.type },
                              };
                            }}
                            onComplete={(result) => {
                              if (result.successful && result.successful.length > 0) {
                                const objectPath = pendingTexturePathsRef.current.get(mat.tempId);
                                if (objectPath) {
                                  updateMaterialField(mat.tempId, "textureUrl", objectPath);
                                  pendingTexturePathsRef.current.delete(mat.tempId);
                                }
                              }
                            }}
                            buttonClassName="h-7 text-xs px-2"
                          >
                            <div className="flex items-center gap-1" data-testid={`button-upload-texture-${mat.tempId}`}>
                              <Upload className="w-3 h-3" />
                              {mat.textureUrl ? "Replace" : "Upload PNG"}
                            </div>
                          </ObjectUploader>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeMaterialRow(mat.tempId)}
                        className="text-destructive hover:text-destructive/70 mt-1 shrink-0"
                        data-testid={`button-remove-material-${mat.tempId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="isHidden">Hide from Store</Label>
                <Switch 
                  id="isHidden" 
                  checked={form.watch("isHidden")}
                  onCheckedChange={(checked) => form.setValue("isHidden", checked)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingProduct ? "Update" : "Create"}
                </Button>
              </div>
            </form>
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
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
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
