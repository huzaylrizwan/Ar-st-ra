import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Settings,
  LogOut,
  Menu,
  Flag,
  HelpCircle,
  Users,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { data: settings } = useSettings();
  const [location] = useLocation();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-muted/20">Loading...</div>;

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = href === "/admin" ? location === href : location.startsWith(href);
    return (
      <Link href={href} className={`
        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"}
      `}>
        <Icon className="w-4 h-4" />
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight flex items-center gap-2">
          {settings?.logoUrl && <img src={settings.logoUrl} className="h-6 w-auto" />}
          <span>{settings?.brandName || "Admin"}</span>
        </Link>
      </div>
      <div className="flex-1 px-4 py-4 space-y-1">
        <NavItem href="/admin" icon={LayoutDashboard} label="Dashboard" />
        <NavItem href="/admin/analytics" icon={TrendingUp} label="Analytics" />
        <NavItem href="/admin/products" icon={Package} label="Products" />
        <NavItem href="/admin/categories" icon={FolderTree} label="Categories" />
        <NavItem href="/admin/banners" icon={Flag} label="Banners" />
        <NavItem href="/admin/faq-manage" icon={HelpCircle} label="FAQ" />
        <NavItem href="/admin/supervisors" icon={Users} label="Supervisors" />
        <NavItem href="/admin/settings" icon={Settings} label="Settings" />
      </div>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || ""} />
            <AvatarFallback>{user?.firstName?.[0] || "A"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => logout()}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/10">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center px-4 justify-between sticky top-0 z-40">
          <Link href="/" className="font-serif text-lg font-bold">
            {settings?.brandName || "Admin"}
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
