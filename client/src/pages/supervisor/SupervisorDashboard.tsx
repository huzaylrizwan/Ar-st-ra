import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SupervisorLayout } from "./SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, Package, RefreshCw } from "lucide-react";

function LiveVisitorCard() {
  const { data, isLoading, refetch } = useQuery<{ count: number }>({
    queryKey: ["/api/analytics/live-visitors"],
    refetchInterval: 15000,
  });

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Live Visitors</CardTitle>
        <Users className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-16 flex items-center">
            <div className="w-16 h-8 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <div className="text-5xl font-bold" data-testid="text-live-visitors">
            {data?.count ?? 0}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">visitors in last 10 minutes</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 gap-1 text-xs"
          onClick={() => refetch()}
          data-testid="button-refresh-visitors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SupervisorDashboard() {
  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your supervisor portal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LiveVisitorCard />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
              <Phone className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Manage WhatsApp, Instagram, Facebook and more</p>
              <Button asChild size="sm" data-testid="link-contact-info">
                <Link href="/supervisor/contact">Edit Contact Info</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Add and edit products in the catalog</p>
              <Button asChild size="sm" data-testid="link-products">
                <Link href="/supervisor/products">Manage Products</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SupervisorLayout>
  );
}
