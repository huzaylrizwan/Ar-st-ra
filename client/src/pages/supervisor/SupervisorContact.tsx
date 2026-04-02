import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { SupervisorLayout } from "./SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ThemeSettings } from "@shared/schema";

const contactSchema = z.object({
  whatsappNumber: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable(),
  facebookUrl: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  mapEmbedUrl: z.string().optional().nullable(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function SupervisorContact() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<ThemeSettings>({
    queryKey: ["/api/supervisor/contact"],
  });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      whatsappNumber: "",
      instagramUrl: "",
      facebookUrl: "",
      address: "",
      mapEmbedUrl: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        whatsappNumber: settings.whatsappNumber || "",
        instagramUrl: settings.instagramUrl || "",
        facebookUrl: settings.facebookUrl || "",
        address: settings.address || "",
        mapEmbedUrl: settings.mapEmbedUrl || "",
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (data: ContactFormValues) =>
      apiRequest("PUT", "/api/supervisor/contact", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/contact"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Contact info updated", description: "Changes are now live on the site." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update contact info.", variant: "destructive" });
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <SupervisorLayout>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Info</h1>
          <p className="text-muted-foreground">Update the contact details shown on the public site</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
            <CardDescription>These fields appear on the Contact page and in social links</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 234 567 8900"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-whatsapp"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://instagram.com/yourbrand"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-instagram"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://facebook.com/yourbrand"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-facebook"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Luxury Ave, New York, NY 10001"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mapEmbedUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Maps Embed URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://maps.google.com/maps?..."
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-map-embed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  data-testid="button-save-contact"
                >
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
