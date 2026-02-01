import { Layout } from "@/components/Layout";
import { useSettings } from "@/hooks/use-settings";
import { Instagram, Facebook, MessageCircle, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Contact() {
  const { data: settings, isLoading } = useSettings();

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4" data-testid="text-contact-title">Contact Us</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              We'd love to hear from you. Reach out through any of the channels below or visit our showroom.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Methods */}
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-semibold mb-4">Get in Touch</h2>

              {/* Social Media Cards */}
              <div className="space-y-4">
                {settings?.whatsappNumber && (
                  <Card className="hover-elevate">
                    <CardContent className="p-4">
                      <a 
                        href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4"
                        data-testid="link-contact-whatsapp"
                      >
                        <div className="p-3 bg-green-500/10 rounded-full">
                          <MessageCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">WhatsApp</p>
                          <p className="text-sm text-muted-foreground">{settings.whatsappNumber}</p>
                        </div>
                      </a>
                    </CardContent>
                  </Card>
                )}

                {settings?.instagramUrl && (
                  <Card className="hover-elevate">
                    <CardContent className="p-4">
                      <a 
                        href={settings.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4"
                        data-testid="link-contact-instagram"
                      >
                        <div className="p-3 bg-pink-500/10 rounded-full">
                          <Instagram className="w-6 h-6 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium">Instagram</p>
                          <p className="text-sm text-muted-foreground">Follow us for the latest designs</p>
                        </div>
                      </a>
                    </CardContent>
                  </Card>
                )}

                {settings?.facebookUrl && (
                  <Card className="hover-elevate">
                    <CardContent className="p-4">
                      <a 
                        href={settings.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4"
                        data-testid="link-contact-facebook"
                      >
                        <div className="p-3 bg-blue-500/10 rounded-full">
                          <Facebook className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Facebook</p>
                          <p className="text-sm text-muted-foreground">Like our page for updates</p>
                        </div>
                      </a>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Address */}
              {settings?.address && (
                <div className="pt-4">
                  <h3 className="text-lg font-medium mb-3">Our Location</h3>
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed">{settings.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Map Embed */}
            <div>
              {settings?.mapEmbedUrl ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-serif font-semibold">Find Us</h2>
                  <div className="aspect-square md:aspect-[4/3] rounded-lg overflow-hidden border border-border">
                    <iframe
                      src={settings.mapEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Store Location"
                      data-testid="iframe-map"
                    />
                  </div>
                  <a 
                    href={settings.mapEmbedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button variant="outline" size="sm" data-testid="button-view-map">
                      Open in Google Maps
                    </Button>
                  </a>
                </div>
              ) : (
                <Card className="h-full flex items-center justify-center bg-muted/30">
                  <CardContent className="text-center py-12">
                    <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      Visit our showroom to experience our collection in person.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* No contact info fallback */}
          {!settings?.whatsappNumber && !settings?.instagramUrl && !settings?.facebookUrl && !settings?.address && (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-medium mb-2">Contact Information Coming Soon</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Our contact details are being updated. Please check back soon for ways to reach us.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
