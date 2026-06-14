import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { MessageCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-mobile";
import type { Product } from "@shared/schema";

interface FormValues {
  customerName: string;
  contact: string;
  message: string;
}

interface ProductInquirySheetProps {
  product: Product;
  selectedColor: string | null;
  selectedSize: string | null;
}

function InquiryForm({
  product,
  selectedColor,
  selectedSize,
  onSuccess,
}: ProductInquirySheetProps & { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();
  const { toast } = useToast();
  const { data: settings } = useSettings();

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          customerName: values.customerName,
          contact: values.contact,
          message: values.message || null,
          selectedColor: selectedColor || null,
          selectedSize: selectedSize || null,
        }),
      });
      if (!res.ok) throw new Error("Inquiry submission failed");

      const text = encodeURIComponent(
        `Inquiry for: ${product.name}\nFinish: ${selectedColor || "N/A"}\nSize: ${selectedSize || "N/A"}\nName: ${values.customerName}\nContact: ${values.contact}\nMessage: ${values.message || ""}`
      );
      if (settings?.whatsappNumber) {
        window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${text}`, "_blank");
      } else if (settings?.contactEmail) {
        window.open(`mailto:${settings.contactEmail}?subject=Furniture+Inquiry&body=${text}`, "_blank");
      }

      toast({ title: "Inquiry sent!", description: "We'll be in touch soon." });
      reset();
      onSuccess();
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="p-3 bg-muted/50 rounded-sm space-y-1">
        <p className="font-serif font-semibold">{product.name}</p>
        {selectedColor && <p className="text-xs text-muted-foreground">Finish: {selectedColor}</p>}
        {selectedSize && <p className="text-xs text-muted-foreground">Size: {selectedSize}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="customerName">Your Name *</Label>
        <Input id="customerName" {...register("customerName", { required: true })} placeholder="Jane Smith" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact">Phone or Email *</Label>
        <Input id="contact" {...register("contact", { required: true })} placeholder="+1 555 000 0000" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea id="message" {...register("message")} placeholder="Any specific requirements?" rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send Inquiry"}
      </Button>
    </form>
  );
}

export function ProductInquirySheet({ product, selectedColor, selectedSize }: ProductInquirySheetProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const trigger = (
    <Button
      variant="outline"
      size="lg"
      className="w-full h-12 sm:h-14 tracking-widest uppercase text-xs sm:text-sm font-bold rounded-full sm:rounded-none gap-2"
    >
      <MessageCircle className="w-4 h-4" /> Request Information
    </Button>
  );

  const content = (
    <InquiryForm
      product={product}
      selectedColor={selectedColor}
      selectedSize={selectedSize}
      onSuccess={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-serif text-xl">Request Information</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Request Information</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
