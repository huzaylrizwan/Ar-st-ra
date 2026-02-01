import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle } from "lucide-react";
import type { FaqItem } from "@shared/schema";

export default function FAQ() {
  const { data: faqItems, isLoading, error } = useQuery<FaqItem[]>({
    queryKey: ["/api/faq/visible"],
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4" data-testid="text-faq-title">
              Frequently Asked Questions
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Find answers to common questions about our products, delivery, and services.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b pb-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-destructive">Failed to load FAQ items. Please try again later.</p>
            </div>
          )}

          {/* FAQ Accordion */}
          {!isLoading && !error && faqItems && faqItems.length > 0 && (
            <Accordion type="single" collapsible className="w-full" data-testid="accordion-faq">
              {faqItems
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => (
                  <AccordionItem key={item.id} value={`faq-${item.id}`} data-testid={`accordion-item-${item.id}`}>
                    <AccordionTrigger 
                      className="text-left font-medium hover:no-underline"
                      data-testid={`accordion-trigger-${item.id}`}
                    >
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent 
                      className="text-muted-foreground leading-relaxed"
                      data-testid={`accordion-content-${item.id}`}
                    >
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!faqItems || faqItems.length === 0) && (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-medium mb-2">No FAQs Available</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're working on adding frequently asked questions. Check back soon!
              </p>
            </div>
          )}

          {/* Contact CTA */}
          <div className="mt-12 text-center pt-8 border-t border-border">
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for?
            </p>
            <a 
              href="/contact" 
              className="text-primary hover:underline font-medium"
              data-testid="link-faq-contact"
            >
              Contact our support team
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
