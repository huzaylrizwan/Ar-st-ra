import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBannerSchema, type InsertBanner, type Banner, type HeroImage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function HeroImagesManager() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: heroImages, isLoading } = useQuery<HeroImage[]>({
    queryKey: ["/api/hero-images"],
    queryFn: async () => {
      const res = await fetch("/api/hero-images", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/hero-images/${id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hero-images"] });
      qc.invalidateQueries({ queryKey: ["/api/hero-images/active-all"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to update hero image.", variant: "destructive" }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!heroImages || heroImages.length === 0) return (
    <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
      No hero images yet. Upload images via the image uploader or add a URL.
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {heroImages.map(img => (
        <div key={img.id} className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
          img.isActive ? "border-primary" : "border-border"
        }`}>
          <img src={img.url} alt={img.name} className="w-full aspect-video object-cover" />
          <div className="p-2 flex items-center justify-between bg-card">
            <span className="text-xs font-medium truncate max-w-[80px]">{img.name}</span>
            <Switch
              checked={img.isActive}
              onCheckedChange={() => toggleMutation.mutate(img.id)}
              disabled={toggleMutation.isPending}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminBanners() {
  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertBanner) => apiRequest("POST", "/api/banners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: "Success", description: "Banner created successfully." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: InsertBanner & { id: number }) =>
      apiRequest("PUT", `/api/banners/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: "Success", description: "Banner updated successfully." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: "Success", description: "Banner deleted successfully." });
    },
  });

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const form = useForm<InsertBanner>({
    resolver: zodResolver(insertBannerSchema),
    defaultValues: {
      text: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  const onSubmit = async (data: InsertBanner) => {
    try {
      if (editingBanner) {
        await updateMutation.mutateAsync({ id: editingBanner.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    form.reset({
      text: "",
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    form.reset({
      text: banner.text,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this banner?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Banners</h1>
          <p className="text-muted-foreground mt-1">Manage promotional banners</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-banner">
              <Plus className="w-4 h-4" /> Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Edit Banner" : "New Banner"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="text">Banner Text</Label>
                <Input
                  id="text"
                  {...form.register("text")}
                  placeholder="Enter banner text..."
                  data-testid="input-banner-text"
                />
                {form.formState.errors.text && (
                  <p className="text-sm text-destructive">{form.formState.errors.text.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  {...form.register("sortOrder", { valueAsNumber: true })}
                  placeholder="0"
                  data-testid="input-banner-sort-order"
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                  data-testid="switch-banner-active"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-banner"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-banner"
                >
                  {editingBanner ? "Update" : "Create"}
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
              <TableHead>Text</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : banners?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No banners found.
                </TableCell>
              </TableRow>
            ) : (
              banners?.map((banner) => (
                <TableRow key={banner.id} data-testid={`row-banner-${banner.id}`}>
                  <TableCell className="font-medium max-w-md truncate">{banner.text}</TableCell>
                  <TableCell>
                    {banner.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{banner.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(banner)}
                      data-testid={`button-edit-banner-${banner.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(banner.id)}
                      data-testid={`button-delete-banner-${banner.id}`}
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

      {/* Hero Images Section */}
      <div className="mt-10">
        <h2 className="text-xl font-serif font-bold mb-1">Hero Images</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Toggle which images appear in the homepage slideshow. Multiple can be active at once.
        </p>
        <HeroImagesManager />
      </div>
    </AdminLayout>
  );
}
