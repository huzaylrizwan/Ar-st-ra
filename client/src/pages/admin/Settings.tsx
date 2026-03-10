import { AdminLayout } from "@/components/AdminLayout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { InsertThemeSettings, HeroImage } from "@shared/schema";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Image as ImageIcon, Check, Upload, Instagram, Facebook, Phone, MapPin, Map } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const THEME_PRESETS = [
  { id: "gold", name: "Gold", primaryColor: "#d4af37", description: "Warm gold accent on cream background" },
  { id: "emerald", name: "Emerald", primaryColor: "#047857", description: "Deep emerald green accent" },
  { id: "midnight", name: "Midnight", primaryColor: "#1e3a5f", description: "Navy blue accent" },
  { id: "rose", name: "Rose", primaryColor: "#b76e79", description: "Soft rose gold accent" },
  { id: "noir", name: "Noir", primaryColor: "#1a1a1a", description: "Jet black accent on warm white" },
] as const;

export default function AdminSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<InsertThemeSettings>();

  const { data: heroImages = [], isLoading: heroImagesLoading } = useQuery<HeroImage[]>({
    queryKey: [api.heroImages.list.path],
    queryFn: async () => {
      const res = await fetch(api.heroImages.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hero images");
      return res.json();
    },
  });

  const activateHeroImageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.heroImages.activate.path, { id }), {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to activate hero image");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.heroImages.list.path] });
      toast({ title: "Success", description: "Hero image updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createHeroImageMutation = useMutation({
    mutationFn: async (data: { url: string; name: string }) => {
      const res = await fetch(api.heroImages.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isPreset: false, isActive: false }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create hero image");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.heroImages.list.path] });
      toast({ title: "Success", description: "Hero image uploaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        brandName: settings.brandName,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        fontFamily: settings.fontFamily,
        activeThemePreset: settings.activeThemePreset,
        instagramUrl: settings.instagramUrl,
        facebookUrl: settings.facebookUrl,
        whatsappNumber: settings.whatsappNumber,
        address: settings.address,
        mapEmbedUrl: settings.mapEmbedUrl,
        showBanner: settings.showBanner,
        showCollections: settings.showCollections,
        showNewArrivals: settings.showNewArrivals,
        showPhilosophy: settings.showPhilosophy,
        showARSection: settings.showARSection,
      });
    }
  }, [settings, form]);

  const onSubmit = (data: InsertThemeSettings) => {
    updateMutation.mutate(data);
  };

  const handleLogoUpload = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const url = result.successful[0].uploadURL;
      form.setValue("logoUrl", url);
    }
  };

  const handleHeroImageUpload = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const url = result.successful[0].uploadURL;
      createHeroImageMutation.mutate({ url, name: "Custom Hero Image" });
    }
  };

  const handlePresetClick = (preset: typeof THEME_PRESETS[number]) => {
    form.setValue("primaryColor", preset.primaryColor);
    form.setValue("activeThemePreset", preset.id);
    updateMutation.mutate({
      primaryColor: preset.primaryColor,
      activeThemePreset: preset.id,
    });
  };

  if (isLoading) return <AdminLayout>Loading...</AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif font-bold mb-8">Theme Settings</h1>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Customize how your store looks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Store Name</Label>
                <Input 
                  id="brandName" 
                  data-testid="input-brand-name"
                  {...form.register("brandName")} 
                />
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {form.watch("logoUrl") && (
                    <div className="p-2 border rounded bg-muted/20">
                      <img src={form.watch("logoUrl")!} alt="Logo" className="h-8 w-auto" />
                    </div>
                  )}
                  <ObjectUploader
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
                      const { uploadURL } = await res.json();
                      return {
                        method: "PUT",
                        url: uploadURL,
                        headers: { "Content-Type": file.type },
                      };
                    }}
                    onComplete={handleLogoUpload}
                  >
                    <span className="flex items-center gap-2" data-testid="button-upload-logo">
                      <ImageIcon className="w-4 h-4" /> Upload Logo
                    </span>
                  </ObjectUploader>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme Presets</CardTitle>
              <CardDescription>Choose a pre-made luxury color theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEME_PRESETS.map((preset) => {
                  const isSelected = form.watch("activeThemePreset") === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`button-preset-${preset.id}`}
                      onClick={() => handlePresetClick(preset)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-md border transition-all",
                        isSelected 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border hover-elevate"
                      )}
                    >
                      <div 
                        className="w-10 h-10 rounded-full border shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: preset.primaryColor }}
                      >
                        {isSelected && <Check className="w-5 h-5 text-white" />}
                      </div>
                      <span className="text-sm font-medium">{preset.name}</span>
                      <span className="text-xs text-muted-foreground text-center">{preset.description}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Colors and typography.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Primary Color (Gold Accent)</Label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-full border shadow-sm"
                    style={{ backgroundColor: form.watch("primaryColor") }}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" data-testid="button-pick-color">Pick Color</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <HexColorPicker 
                        color={form.watch("primaryColor")} 
                        onChange={(color) => {
                          form.setValue("primaryColor", color);
                          form.setValue("activeThemePreset", null);
                        }} 
                      />
                    </PopoverContent>
                  </Popover>
                  <Input 
                    {...form.register("primaryColor")} 
                    className="w-32 font-mono" 
                    data-testid="input-primary-color"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family (Body)</Label>
                <Input 
                  id="fontFamily" 
                  {...form.register("fontFamily")} 
                  placeholder="Inter, sans-serif" 
                  data-testid="input-font-family"
                />
                <p className="text-xs text-muted-foreground">Standard CSS font-family string.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hero Image</CardTitle>
              <CardDescription>Select or upload a hero image for your homepage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {heroImagesLoading ? (
                <p className="text-muted-foreground">Loading hero images...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {heroImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      data-testid={`button-hero-image-${image.id}`}
                      onClick={() => activateHeroImageMutation.mutate(image.id)}
                      className={cn(
                        "relative aspect-video rounded-md overflow-hidden border-2 transition-all",
                        image.isActive 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-transparent hover:border-border"
                      )}
                    >
                      <img 
                        src={image.url} 
                        alt={image.name} 
                        className="w-full h-full object-cover"
                      />
                      {image.isActive && (
                        <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                        <span className="text-xs text-white truncate block">{image.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="pt-2">
                <ObjectUploader
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
                    const { uploadURL } = await res.json();
                    return {
                      method: "PUT",
                      url: uploadURL,
                      headers: { "Content-Type": file.type },
                    };
                  }}
                  onComplete={handleHeroImageUpload}
                >
                  <span className="flex items-center gap-2" data-testid="button-upload-hero">
                    <Upload className="w-4 h-4" /> Upload Custom Hero
                  </span>
                </ObjectUploader>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section Visibility</CardTitle>
              <CardDescription>Control which sections appear on your homepage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showBanner">Promo Banner</Label>
                  <p className="text-xs text-muted-foreground">Show promotional banner bar at the top</p>
                </div>
                <Switch 
                  id="showBanner"
                  data-testid="switch-show-banner"
                  checked={form.watch("showBanner") ?? true}
                  onCheckedChange={(checked) => form.setValue("showBanner", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showCollections">Collections Carousel</Label>
                  <p className="text-xs text-muted-foreground">Show Collections carousel on home</p>
                </div>
                <Switch 
                  id="showCollections"
                  data-testid="switch-show-collections"
                  checked={form.watch("showCollections") ?? true}
                  onCheckedChange={(checked) => form.setValue("showCollections", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showNewArrivals">New Arrivals</Label>
                  <p className="text-xs text-muted-foreground">Show New Arrivals section</p>
                </div>
                <Switch 
                  id="showNewArrivals"
                  data-testid="switch-show-new-arrivals"
                  checked={form.watch("showNewArrivals") ?? true}
                  onCheckedChange={(checked) => form.setValue("showNewArrivals", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showPhilosophy">Philosophy / About</Label>
                  <p className="text-xs text-muted-foreground">Show Philosophy/About section</p>
                </div>
                <Switch 
                  id="showPhilosophy"
                  data-testid="switch-show-philosophy"
                  checked={form.watch("showPhilosophy") ?? true}
                  onCheckedChange={(checked) => form.setValue("showPhilosophy", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showARSection">AR Feature Section</Label>
                  <p className="text-xs text-muted-foreground">Show AR Feature section</p>
                </div>
                <Switch 
                  id="showARSection"
                  data-testid="switch-show-ar-section"
                  checked={form.watch("showARSection") ?? true}
                  onCheckedChange={(checked) => form.setValue("showARSection", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Social links and store contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> Instagram URL
                </Label>
                <Input 
                  id="instagramUrl" 
                  placeholder="https://instagram.com/yourstore"
                  data-testid="input-instagram-url"
                  {...form.register("instagramUrl")} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" /> Facebook URL
                </Label>
                <Input 
                  id="facebookUrl" 
                  placeholder="https://facebook.com/yourstore"
                  data-testid="input-facebook-url"
                  {...form.register("facebookUrl")} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> WhatsApp Number
                </Label>
                <Input 
                  id="whatsappNumber" 
                  placeholder="+1234567890"
                  data-testid="input-whatsapp-number"
                  {...form.register("whatsappNumber")} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Physical Address
                </Label>
                <Textarea 
                  id="address" 
                  placeholder="123 Luxury Lane, Suite 100&#10;New York, NY 10001"
                  data-testid="input-address"
                  rows={3}
                  {...form.register("address")} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapEmbedUrl" className="flex items-center gap-2">
                  <Map className="w-4 h-4" /> Google Maps Embed URL
                </Label>
                <Input 
                  id="mapEmbedUrl" 
                  placeholder="https://www.google.com/maps/embed?..."
                  data-testid="input-map-embed-url"
                  {...form.register("mapEmbedUrl")} 
                />
                <p className="text-xs text-muted-foreground">
                  Paste the embed URL from Google Maps to show a map on your contact page.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg" 
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
