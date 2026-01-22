import { AdminLayout } from "@/components/AdminLayout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { InsertThemeSettings } from "@shared/schema";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Image as ImageIcon } from "lucide-react";

export default function AdminSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  
  const form = useForm<InsertThemeSettings>();

  useEffect(() => {
    if (settings) {
      form.reset({
        brandName: settings.brandName,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        fontFamily: settings.fontFamily
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
                <Input id="brandName" {...form.register("brandName")} />
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
                    <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Upload Logo</span>
                  </ObjectUploader>
                </div>
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
                      <Button variant="outline">Pick Color</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <HexColorPicker 
                        color={form.watch("primaryColor")} 
                        onChange={(color) => form.setValue("primaryColor", color)} 
                      />
                    </PopoverContent>
                  </Popover>
                  <Input {...form.register("primaryColor")} className="w-32 font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family (Body)</Label>
                <Input id="fontFamily" {...form.register("fontFamily")} placeholder="Inter, sans-serif" />
                <p className="text-xs text-muted-foreground">Standard CSS font-family string.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
