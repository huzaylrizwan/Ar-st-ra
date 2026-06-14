import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithCsrf } from "@/lib/queryClient";
import type { Inquiry } from "@shared/schema";

export function useInquiries() {
  return useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
    queryFn: async () => {
      const res = await fetchWithCsrf("/api/inquiries");
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      return res.json();
    },
  });
}

export function useUnreadInquiryCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/inquiries/unread-count"],
    queryFn: async () => {
      const res = await fetchWithCsrf("/api/inquiries/unread-count");
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json();
    },
    refetchInterval: 60 * 1000,
  });
}

export function useMarkInquiryRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetchWithCsrf(`/api/inquiries/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inquiries"] });
      qc.invalidateQueries({ queryKey: ["/api/inquiries/unread-count"] });
    },
  });
}

export function useDeleteInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetchWithCsrf(`/api/inquiries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete inquiry");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inquiries"] });
      qc.invalidateQueries({ queryKey: ["/api/inquiries/unread-count"] });
    },
  });
}
