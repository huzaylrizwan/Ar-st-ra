import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";

// Pages
import Home from "@/pages/Home";
import CategoryPage from "@/pages/CategoryPage";
import ProductDetails from "@/pages/ProductDetails";
import Dashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminCategories from "@/pages/admin/Categories";
import AdminSettings from "@/pages/admin/Settings";
import NotFound from "@/pages/not-found";

// Redirect component for auth protection
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      // Use window.location for server-side auth routes
      window.location.href = "/api/login";
    }
  }, [user, isLoading]);

  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return <Component />;
}

// Helper to apply theme settings globally
function ThemeApplicator() {
  useSettings(); // Hook internally applies side-effects to DOM
  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/categories" component={CategoryPage} />
      <Route path="/products/:id" component={ProductDetails} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/admin/products">
        <ProtectedRoute component={AdminProducts} />
      </Route>
      <Route path="/admin/categories">
        <ProtectedRoute component={AdminCategories} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettings} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeApplicator />
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
