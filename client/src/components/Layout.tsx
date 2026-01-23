import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Menu, X, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`
        text-sm uppercase tracking-widest font-medium transition-colors hover:text-primary
        ${isActive ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}
        py-2
      `}>
        {children}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
      {/* Promo Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-center text-xs tracking-widest uppercase font-bold">
        Complimentary White Glove Delivery on Orders Over $5,000
      </div>

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col gap-8 mt-10">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-serif font-bold">
                      {settings?.brandName || "LUXE"}
                    </Link>
                    <nav className="flex flex-col gap-4">
                      <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium">Home</Link>
                      <Link href="/categories" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium">Collections</Link>
                      {user && (
                        <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-primary">
                          Admin Dashboard
                        </Link>
                      )}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <div className="flex-shrink-0 flex items-center justify-center md:justify-start w-full md:w-auto">
              <Link href="/" className="group flex items-center gap-2">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />}
                <span className="font-serif text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                  {settings?.brandName || "LUXE"}
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex gap-8 items-center">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/categories">Collections</NavLink>
              {user && <NavLink href="/admin">Admin</NavLink>}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
                  Logout
                </Button>
              ) : (
                <Link href="/api/login" className="hidden md:block">
                  <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider">
                    Sign In
                  </Button>
                </Link>
              )}
              {user && (
                <Link href="/admin" className="md:hidden">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-muted/30 pt-16 pb-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="font-serif text-xl font-bold mb-4">{settings?.brandName || "LUXE"}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                Crafting exceptional living spaces with timeless furniture pieces designed for the modern connoisseur.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Collections</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/categories" className="hover:text-primary transition-colors">Living Room</Link></li>
                <li><Link href="/categories" className="hover:text-primary transition-colors">Dining</Link></li>
                <li><Link href="/categories" className="hover:text-primary transition-colors">Bedroom</Link></li>
                <li><Link href="/categories" className="hover:text-primary transition-colors">Office</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-contact">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-care-guide">Care Guide</a></li>
                <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Newsletter</h4>
              <p className="text-xs text-muted-foreground mb-4">Subscribe to receive exclusive offers and design inspiration.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="bg-background border border-input rounded-sm px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button variant="default" size="sm" className="rounded-sm">Join</Button>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {settings?.brandName || "Luxury Furniture"}. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
              <a href="#" className="hover:text-foreground">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
