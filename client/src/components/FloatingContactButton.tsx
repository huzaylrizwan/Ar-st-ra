import { useState, useRef, useEffect, useCallback } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Instagram } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

function sanitizeWhatsApp(number: string | null | undefined): string {
  if (!number) return "";
  const digits = number.replace(/\D/g, "");
  return digits.length >= 7 ? `https://wa.me/${digits}` : "";
}

function sanitizeInstagramUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export function FloatingContactButton() {
  const { data: settings } = useSettings();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const whatsappUrl = sanitizeWhatsApp(settings?.whatsappNumber);
  const instagramUrl = sanitizeInstagramUrl(settings?.instagramUrl);
  const hasWhatsApp = !!whatsappUrl;
  const hasInstagram = !!instagramUrl;
  const hasContact = hasWhatsApp || hasInstagram;
  const hasBoth = hasWhatsApp && hasInstagram;
  const isAdminPage = location.startsWith("/admin");
  const isProductPage = /^\/products\/\d+/.test(location);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  if (!hasContact || isAdminPage || isProductPage) return null;

  function handleClick() {
    if (hasBoth) {
      setIsOpen((prev) => !prev);
    } else if (hasWhatsApp) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } else if (hasInstagram) {
      window.open(instagramUrl, "_blank", "noopener,noreferrer");
    }
  }

  const menuId = "floating-contact-menu";

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" data-testid="floating-contact">
      <AnimatePresence>
        {isOpen && hasBoth && (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 mb-1"
          >
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-3 bg-[#25D366] text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              data-testid="floating-contact-whatsapp"
            >
              <SiWhatsapp className="w-5 h-5" />
              <span className="text-sm font-medium">WhatsApp</span>
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              data-testid="floating-contact-instagram"
            >
              <Instagram className="w-5 h-5" />
              <span className="text-sm font-medium">Instagram</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
        data-testid="floating-contact-button"
        aria-label="Contact us"
        aria-expanded={hasBoth ? isOpen : undefined}
        aria-controls={hasBoth ? menuId : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
