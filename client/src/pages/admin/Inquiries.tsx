import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useInquiries, useMarkInquiryRead, useDeleteInquiry } from "@/hooks/use-inquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import type { Inquiry } from "@shared/schema";

function formatDate(date: string | Date) {
  return format(new Date(date), "MMM d, h:mm a");
}

function InquiryRow({ inquiry }: { inquiry: Inquiry }) {
  const [expanded, setExpanded] = useState(false);
  const markRead = useMarkInquiryRead();
  const deleteInquiry = useDeleteInquiry();

  const handleExpand = () => {
    setExpanded(v => !v);
    if (!inquiry.isRead) markRead.mutate(inquiry.id);
  };

  return (
    <div className={`border-b border-border last:border-0 ${!inquiry.isRead ? "bg-primary/5" : ""}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={handleExpand}
      >
        {/* Unread dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!inquiry.isRead ? "bg-primary" : ""}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{inquiry.customerName}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-sm text-primary font-medium truncate">{inquiry.productName}</span>
            {inquiry.selectedColor && (
              <span
                className="w-3 h-3 rounded-full border border-border flex-shrink-0 inline-block"
                style={{ backgroundColor: inquiry.selectedColor }}
                title={inquiry.selectedColor}
              />
            )}
            {inquiry.selectedSize && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-4">{inquiry.selectedSize}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{inquiry.contact}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {formatDate(inquiry.createdAt)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this inquiry?")) deleteInquiry.mutate(inquiry.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-9 pb-4 space-y-2">
          {inquiry.message && (
            <p className="text-sm text-muted-foreground">{inquiry.message}</p>
          )}
          <a
            href={`mailto:${inquiry.contact}?subject=Re: ${encodeURIComponent(inquiry.productName)}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3 h-3" /> Reply via email
          </a>
        </div>
      )}
    </div>
  );
}

export default function Inquiries() {
  const { data: inquiries, isLoading } = useInquiries();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Inquiries</h1>
          <p className="text-muted-foreground mt-2">Customer product inquiries. Click a row to expand and mark as read.</p>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          {isLoading && (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          )}
          {!isLoading && (!inquiries || inquiries.length === 0) && (
            <div className="p-8 text-center text-muted-foreground text-sm">No inquiries yet.</div>
          )}
          {inquiries?.map(inq => <InquiryRow key={inq.id} inquiry={inq} />)}
        </div>
      </div>
    </AdminLayout>
  );
}
