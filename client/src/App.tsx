import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useSupervisor } from "@/hooks/use-supervisor";
import { useEffect, useRef } from "react";
import { useSettings } from "@/hooks/use-settings";
import { nanoid } from "nanoid";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);
  return null;
}

// Generate a stable session ID for this browser session
function getSessionId(): string {
  let sessionId = sessionStorage.getItem("_sv_sid");
  if (!sessionId) {
    sessionId = nanoid();
    sessionStorage.setItem("_sv_sid", sessionId);
  }
  return sessionId;
}

// Track page views on route change
function PageViewTracker() {
  const [location] = useLocation();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (location === lastTracked.current) return;
    lastTracked.current = location;
    const sessionId = getSessionId();
    fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId, path: location }),
    }).catch(() => {});
  }, [location]);

  return null;
}

// Pages
import Home from "@/pages/Home";
import CategoryPage from "@/pages/CategoryPage";
import ProductDetails from "@/pages/ProductDetails";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import Dashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminProductEditor from "@/pages/admin/AdminProductEditor";
import AdminCategories from "@/pages/admin/Categories";
import AdminSettings from "@/pages/admin/Settings";
import AdminBanners from "@/pages/admin/Banners";
import AdminFAQ from "@/pages/admin/FAQ";
import AdminSupervisors from "@/pages/admin/Supervisors";
import Analytics from "@/pages/admin/Analytics";
import Inquiries from "@/pages/admin/Inquiries";
import SupervisorDashboard from "@/pages/supervisor/SupervisorDashboard";
import SupervisorContact from "@/pages/supervisor/SupervisorContact";
import SupervisorProducts from "@/pages/supervisor/SupervisorProducts";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

// Redirect component for auth protection
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = "/login";
    }
  }, [user, isLoading]);

  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4 max-w-md p-8">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">This area is for administrators only.</p>
          <a href="/supervisor" className="text-primary hover:underline text-sm">Go to Supervisor Portal →</a>
        </div>
      </div>
    );
  }

  return <Component />;
}

// Supervisor route guard
function SupervisorRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isSupervisor, isLoading: supLoading } = useSupervisor();

  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem("supervisor_redirect", currentPath);
      window.location.href = "/login";
    }
  }, [user, authLoading]);

  const isLoading = authLoading || supLoading;

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isSupervisor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4 max-w-md p-8">
          <h1 className="text-2xl font-bold text-destructive" data-testid="heading-access-denied">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have supervisor access. Please contact the administrator to be added as a supervisor.
          </p>
          <a href="/" className="text-primary hover:underline text-sm" data-testid="link-return-home">Return to homepage</a>
        </div>
      </div>
    );
  }

  return <Component />;
}

// Helper to apply theme settings globally
function ThemeApplicator() {
  useSettings(); // Hook internally applies side-effects to DOM
  return null;
}

// After login redirect handler: restores stored supervisor path from localStorage
function AuthRedirectHandler() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      const stored = localStorage.getItem("supervisor_redirect");
      if (stored && stored.startsWith("/supervisor")) {
        const currentPath = window.location.pathname;
        if (currentPath !== stored) {
          localStorage.removeItem("supervisor_redirect");
          navigate(stored);
        }
      }
    }
  }, [user, isLoading, navigate]);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/categories" component={CategoryPage} />
      <Route path="/products/:id" component={ProductDetails} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/admin/products">
        <ProtectedRoute component={AdminProducts} />
      </Route>
      <Route path="/admin/products/new">
        <ProtectedRoute component={AdminProductEditor} />
      </Route>
      <Route path="/admin/products/:id">
        <ProtectedRoute component={AdminProductEditor} />
      </Route>
      <Route path="/admin/categories">
        <ProtectedRoute component={AdminCategories} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettings} />
      </Route>
      <Route path="/admin/banners">
        <ProtectedRoute component={AdminBanners} />
      </Route>
      <Route path="/admin/faq-manage">
        <ProtectedRoute component={AdminFAQ} />
      </Route>
      <Route path="/admin/supervisors">
        <ProtectedRoute component={AdminSupervisors} />
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute component={Analytics} />
      </Route>
      <Route path="/admin/inquiries">
        <ProtectedRoute component={Inquiries} />
      </Route>

      {/* Supervisor Routes */}
      <Route path="/supervisor">
        <SupervisorRoute component={SupervisorDashboard} />
      </Route>
      <Route path="/supervisor/contact">
        <SupervisorRoute component={SupervisorContact} />
      </Route>
      <Route path="/supervisor/products">
        <SupervisorRoute component={SupervisorProducts} />
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
        <ScrollToTop />
        <PageViewTracker />
        <AuthRedirectHandler />
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
