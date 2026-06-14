import { AdminLayout } from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, Users, Package, AlertTriangle } from "lucide-react";

interface AnalyticsSummary {
  todayViews: number;
  last30Days: { date: string; views: number }[];
  topProducts: { path: string; views: number }[];
  topCategories: { path: string; views: number }[];
}

interface CatalogHealth {
  productsNoArLink: number;
  productsHidden: number;
  productsNoImages: number;
  categoriesEmpty: number;
  productsOutOfStock: number;
}

export default function Analytics() {
  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    refetchInterval: 30 * 1000,
  });

  const { data: liveVisitors } = useQuery<{ count: number }>({
    queryKey: ["/api/analytics/live-visitors"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/live-visitors", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 30 * 1000,
  });

  const { data: health } = useQuery<CatalogHealth>({
    queryKey: ["/api/analytics/catalog-health"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/catalog-health", { credentials: "include" });
      return res.json();
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">Live traffic and catalog health overview.</p>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Live Visitors</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{liveVisitors?.count ?? "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">Active right now</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Today's Views</CardTitle>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary?.todayViews ?? "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">Page views today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Top Page (30 days)</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold truncate">
                {summary?.topProducts?.[0]?.path ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.topProducts?.[0]?.views ?? 0} views
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 30-day trend chart */}
        {summary?.last30Days && summary.last30Days.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Daily Sessions — Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={summary.last30Days}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Top products bar chart */}
          {summary?.topProducts && summary.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Top Products (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={summary.topProducts} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="path"
                      type="category"
                      tick={{ fontSize: 9 }}
                      width={100}
                      tickFormatter={(p) => p.replace("/products/", "#")}
                    />
                    <Tooltip />
                    <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Catalog health */}
          {health && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Catalog Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "Products without AR link", value: health.productsNoArLink },
                  { label: "Hidden products", value: health.productsHidden },
                  { label: "Products without images", value: health.productsNoImages },
                  { label: "Empty categories", value: health.categoriesEmpty },
                  { label: "Out of stock products", value: health.productsOutOfStock },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${value > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
