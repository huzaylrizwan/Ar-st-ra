import { AdminLayout } from "@/components/AdminLayout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { InsertThemeSettings } from "@shared/schema";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageUploader } from "@/components/ImageUploader";
import { Image as ImageIcon, Check, Instagram, Facebook, Phone, MapPin, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const { toast } = useToast();

  const form = useForm<InsertThemeSettings>();

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
        arStudioTab1Label: settings.arStudioTab1Label ?? "Model",
        arStudioTab1Icon: settings.arStudioTab1Icon ?? "",
        arStudioTab2Label: settings.arStudioTab2Label ?? "Variants",
        arStudioTab2Icon: settings.arStudioTab2Icon ?? "",
        studioSidebarOpacity: settings.studioSidebarOpacity ?? 0.65,
        studioSidebarColor: settings.studioSidebarColor ?? "#000000",
        studioBottomBarOpacity: settings.studioBottomBarOpacity ?? 0.65,
        studioBottomBarColor: settings.studioBottomBarColor ?? "#000000",
        currencySymbol: settings.currencySymbol ?? "$",
        contactEmail: settings.contactEmail ?? "",
        privacyPolicyUrl: settings.privacyPolicyUrl ?? "",
        termsUrl: settings.termsUrl ?? "",
        aboutUrl: settings.aboutUrl ?? "",
        heroSlideInterval: settings.heroSlideInterval ?? 5,
      });
    }
  }, [settings, form]);

  const handlePresetClick = (preset: typeof THEME_PRESETS[number]) => {
    form.setValue("primaryColor", preset.primaryColor);
    form.setValue("activeThemePreset", preset.id);
    updateMutation.mutate({ primaryColor: preset.primaryColor, activeThemePreset: preset.id });
  };

  if (isLoading) return <AdminLayout>Loading...</AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif font-bold mb-6">Settings</h1>

        <Tabs defaultValue="branding">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="ar-studio">AR Studio</TabsTrigger>
          </TabsList>

          {/* BRANDING TAB */}
          <TabsContent value="branding" className="space-y-6">
            {/* Brand Identity Card */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Identity</CardTitle>
                <CardDescription>Customize how your store looks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Store Name</Label>
                  <Input id="brandName" data-testid="input-brand-name" {...form.register("brandName")} />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {form.watch("logoUrl") && (
                      <div className="p-2 border rounded bg-muted/20">
                        <img src={form.watch("logoUrl")!} alt="Logo" className="h-8 w-auto" />
                      </div>
                    )}
                    <ImageUploader onUpload={(url) => form.setValue("logoUrl", url)}>
                      <span className="flex items-center gap-2" data-testid="button-upload-logo">
                        <ImageIcon className="w-4 h-4" /> Upload Logo
                      </span>
                    </ImageUploader>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Site Theme Picker Card */}
            <Card>
              <CardHeader>
                <CardTitle>Site Theme</CardTitle>
                <CardDescription>Select the visual style for your public website. Changes live instantly for all visitors after saving.</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Theme Presets Card */}
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
                          isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover-elevate"
                        )}
                      >
                        <div className="w-10 h-10 rounded-full border shadow-sm flex items-center justify-center" style={{ backgroundColor: preset.primaryColor }}>
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

            {/* Appearance Card */}
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Colors and typography.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Primary Color (Gold Accent)</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border shadow-sm" style={{ backgroundColor: form.watch("primaryColor") }} />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" data-testid="button-pick-color">Pick Color</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3">
                        <HexColorPicker color={form.watch("primaryColor")} onChange={(color) => { form.setValue("primaryColor", color); form.setValue("activeThemePreset", null); }} />
                      </PopoverContent>
                    </Popover>
                    <Input {...form.register("primaryColor")} className="w-32 font-mono" data-testid="input-primary-color" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family (Body)</Label>
                  <Input id="fontFamily" {...form.register("fontFamily")} placeholder="Inter, sans-serif" data-testid="input-font-family" />
                  <p className="text-xs text-muted-foreground">Standard CSS font-family string.</p>
                </div>
              </CardContent>
            </Card>

            {/* Currency Card */}
            <Card>
              <CardHeader>
                <CardTitle>Currency</CardTitle>
                <CardDescription>The symbol displayed next to prices.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Input id="currencySymbol" placeholder="$" maxLength={4} className="w-24" data-testid="input-currency-symbol" {...form.register("currencySymbol")} />
                  <p className="text-xs text-muted-foreground">E.g. $, €, £, ¥</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                disabled={updateMutation.isPending}
                data-testid="button-save-settings"
                onClick={() => updateMutation.mutate({
                  brandName: form.getValues("brandName"),
                  logoUrl: form.getValues("logoUrl"),
                  primaryColor: form.getValues("primaryColor"),
                  activeThemePreset: form.getValues("activeThemePreset"),
                  fontFamily: form.getValues("fontFamily"),
                  currencySymbol: form.getValues("currencySymbol"),
                })}
              >
                Save Branding
              </Button>
            </div>
          </TabsContent>

          {/* HOMEPAGE TAB */}
          <TabsContent value="homepage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Section Visibility</CardTitle>
                <CardDescription>Control which sections appear on your homepage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "showBanner", label: "Promo Banner", desc: "Show promotional banner bar at the top", testId: "switch-show-banner" },
                  { id: "showCollections", label: "Collections Carousel", desc: "Show Collections carousel on home", testId: "switch-show-collections" },
                  { id: "showNewArrivals", label: "New Arrivals", desc: "Show New Arrivals section", testId: "switch-show-new-arrivals" },
                  { id: "showPhilosophy", label: "Philosophy / About", desc: "Show Philosophy/About section", testId: "switch-show-philosophy" },
                  { id: "showARSection", label: "AR Feature Section", desc: "Show AR Feature section", testId: "switch-show-ar-section" },
                ].map(({ id, label, desc, testId }) => (
                  <div key={id} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={id}>{label}</Label>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      id={id}
                      data-testid={testId}
                      checked={form.watch(id as any) ?? true}
                      onCheckedChange={(checked) => form.setValue(id as any, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hero Slideshow Speed</CardTitle>
                <CardDescription>How long each hero image displays before transitioning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="w-28 shrink-0">Interval: {form.watch("heroSlideInterval") ?? 5}s</Label>
                  <Slider
                    min={3}
                    max={15}
                    step={1}
                    value={[form.watch("heroSlideInterval") ?? 5]}
                    onValueChange={([v]) => form.setValue("heroSlideInterval", v)}
                    className="flex-1 max-w-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Range: 3–15 seconds</p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({
                  showBanner: form.getValues("showBanner"),
                  showCollections: form.getValues("showCollections"),
                  showNewArrivals: form.getValues("showNewArrivals"),
                  showPhilosophy: form.getValues("showPhilosophy"),
                  showARSection: form.getValues("showARSection"),
                  heroSlideInterval: form.getValues("heroSlideInterval"),
                })}
              >
                Save Homepage
              </Button>
            </div>
          </TabsContent>

          {/* CONTACT TAB */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Social links and store contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagramUrl" className="flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram URL</Label>
                  <Input id="instagramUrl" placeholder="https://instagram.com/yourstore" data-testid="input-instagram-url" {...form.register("instagramUrl")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl" className="flex items-center gap-2"><Facebook className="w-4 h-4" /> Facebook URL</Label>
                  <Input id="facebookUrl" placeholder="https://facebook.com/yourstore" data-testid="input-facebook-url" {...form.register("facebookUrl")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="flex items-center gap-2"><Phone className="w-4 h-4" /> WhatsApp Number</Label>
                  <Input id="whatsappNumber" placeholder="+1234567890" data-testid="input-whatsapp-number" {...form.register("whatsappNumber")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Physical Address</Label>
                  <Textarea id="address" placeholder="123 Luxury Lane..." data-testid="input-address" rows={3} {...form.register("address")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mapEmbedUrl" className="flex items-center gap-2"><Map className="w-4 h-4" /> Google Maps Embed URL</Label>
                  <Input id="mapEmbedUrl" placeholder="https://www.google.com/maps/embed?..." data-testid="input-map-embed-url" {...form.register("mapEmbedUrl")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" type="email" placeholder="hello@yourstore.com" data-testid="input-contact-email" {...form.register("contactEmail")} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({
                  instagramUrl: form.getValues("instagramUrl"),
                  facebookUrl: form.getValues("facebookUrl"),
                  whatsappNumber: form.getValues("whatsappNumber"),
                  address: form.getValues("address"),
                  mapEmbedUrl: form.getValues("mapEmbedUrl"),
                  contactEmail: form.getValues("contactEmail"),
                })}
              >
                Save Contact
              </Button>
            </div>
          </TabsContent>

          {/* PAGES TAB */}
          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Page Links</CardTitle>
                <CardDescription>External URLs for legal pages and brand story.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
                  <Input id="privacyPolicyUrl" placeholder="https://yourstore.com/privacy" data-testid="input-privacy-policy-url" {...form.register("privacyPolicyUrl")} />
                  <p className="text-xs text-muted-foreground">When set, a Privacy Policy link appears in the footer.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termsUrl">Terms of Service URL</Label>
                  <Input id="termsUrl" placeholder="https://yourstore.com/terms" data-testid="input-terms-url" {...form.register("termsUrl")} />
                  <p className="text-xs text-muted-foreground">When set, a Terms link appears in the footer.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aboutUrl">About Page URL</Label>
                  <Input id="aboutUrl" placeholder="https://yourstore.com/about" data-testid="input-about-url" {...form.register("aboutUrl")} />
                  <p className="text-xs text-muted-foreground">When set, a "Read Our Story" button appears in the Philosophy section.</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({
                  privacyPolicyUrl: form.getValues("privacyPolicyUrl"),
                  termsUrl: form.getValues("termsUrl"),
                  aboutUrl: form.getValues("aboutUrl"),
                })}
              >
                Save Pages
              </Button>
            </div>
          </TabsContent>

          {/* AR STUDIO TAB */}
          <TabsContent value="ar-studio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>3D Studio Tab Labels</CardTitle>
                <CardDescription>Customise the two tab buttons in the 3D viewer sidebar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="arStudioTab1Label">Tab 1 — Label</Label>
                    <Input id="arStudioTab1Label" placeholder="Model" data-testid="input-tab1-label" {...form.register("arStudioTab1Label")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arStudioTab1Icon">Tab 1 — Icon <span className="text-muted-foreground font-normal">(emoji)</span></Label>
                    <div className="flex items-center gap-2">
                      {form.watch("arStudioTab1Icon") && <span className="text-2xl leading-none">{form.watch("arStudioTab1Icon")}</span>}
                      <Input id="arStudioTab1Icon" placeholder="🪑" maxLength={4} data-testid="input-tab1-icon" className="w-24" {...form.register("arStudioTab1Icon")} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="arStudioTab2Label">Tab 2 — Label</Label>
                    <Input id="arStudioTab2Label" placeholder="Variants" data-testid="input-tab2-label" {...form.register("arStudioTab2Label")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arStudioTab2Icon">Tab 2 — Icon <span className="text-muted-foreground font-normal">(emoji)</span></Label>
                    <div className="flex items-center gap-2">
                      {form.watch("arStudioTab2Icon") && <span className="text-2xl leading-none">{form.watch("arStudioTab2Icon")}</span>}
                      <Input id="arStudioTab2Icon" placeholder="🎨" maxLength={4} data-testid="input-tab2-icon" className="w-24" {...form.register("arStudioTab2Icon")} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3D Studio Appearance</CardTitle>
                <CardDescription>Default opacity and colour for the sidebar and bottom bar in the 3D viewer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-medium">Sidebar</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Label className="w-24 shrink-0">Opacity</Label>
                      <input type="range" min={0} max={1} step={0.01} data-testid="slider-admin-sidebar-opacity" value={form.watch("studioSidebarOpacity") ?? 0.65} onChange={(e) => form.setValue("studioSidebarOpacity", parseFloat(e.target.value))} className="flex-1 accent-primary" />
                      <span className="text-sm text-muted-foreground w-10 text-right">{Math.round((form.watch("studioSidebarOpacity") ?? 0.65) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Label className="w-24 shrink-0">Colour</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" data-testid="color-admin-sidebar" value={form.watch("studioSidebarColor") ?? "#000000"} onChange={(e) => form.setValue("studioSidebarColor", e.target.value)} className="w-9 h-9 rounded border cursor-pointer" style={{ padding: "2px" }} />
                        <Input {...form.register("studioSidebarColor")} className="w-28 font-mono" data-testid="input-admin-sidebar-color" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-medium">Bottom Bar</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Label className="w-24 shrink-0">Opacity</Label>
                      <input type="range" min={0} max={1} step={0.01} data-testid="slider-admin-bottom-bar-opacity" value={form.watch("studioBottomBarOpacity") ?? 0.65} onChange={(e) => form.setValue("studioBottomBarOpacity", parseFloat(e.target.value))} className="flex-1 accent-primary" />
                      <span className="text-sm text-muted-foreground w-10 text-right">{Math.round((form.watch("studioBottomBarOpacity") ?? 0.65) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Label className="w-24 shrink-0">Colour</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" data-testid="color-admin-bottom-bar" value={form.watch("studioBottomBarColor") ?? "#000000"} onChange={(e) => form.setValue("studioBottomBarColor", e.target.value)} className="w-9 h-9 rounded border cursor-pointer" style={{ padding: "2px" }} />
                        <Input {...form.register("studioBottomBarColor")} className="w-28 font-mono" data-testid="input-admin-bottom-bar-color" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({
                  arStudioTab1Label: form.getValues("arStudioTab1Label"),
                  arStudioTab1Icon: form.getValues("arStudioTab1Icon"),
                  arStudioTab2Label: form.getValues("arStudioTab2Label"),
                  arStudioTab2Icon: form.getValues("arStudioTab2Icon"),
                  studioSidebarOpacity: form.getValues("studioSidebarOpacity"),
                  studioSidebarColor: form.getValues("studioSidebarColor"),
                  studioBottomBarOpacity: form.getValues("studioBottomBarOpacity"),
                  studioBottomBarColor: form.getValues("studioBottomBarColor"),
                })}
              >
                Save AR Studio
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
