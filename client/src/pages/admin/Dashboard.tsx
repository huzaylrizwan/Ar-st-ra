import { AdminLayout } from "@/components/AdminLayout";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FolderTree, TrendingUp, DollarSign } from "lucide-react";

export default function Dashboard() {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();

  const stats = [
    {
      title: "Total Products",
      value: products?.length || 0,
      icon: Package,
      description: "Active items in catalog"
    },
    {
      title: "Categories",
      value: categories?.length || 0,
      icon: FolderTree,
      description: "Product collections"
    },
    {
      title: "Total Value",
      value: `$${products?.reduce((acc, p) => acc + p.price, 0).toLocaleString() || 0}`,
      icon: DollarSign,
      description: "Inventory value (cents)"
    },
    {
      title: "AR Enabled",
      value: products?.filter(p => p.arLink).length || 0,
      icon: TrendingUp,
      description: "Products with AR view"
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of your catalog and inventory.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
