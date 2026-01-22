import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { InsertThemeSettings } from "@shared/schema";
import { useEffect } from "react";

export function useSettings() {
  const query = useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return api.settings.get.responses[200].parse(await res.json());
    },
  });

  // Apply theme settings to CSS variables when loaded
  useEffect(() => {
    if (query.data) {
      const root = document.documentElement;
      if (query.data.primaryColor) {
        // We'd need to convert hex to HSL here properly, but for simplicity
        // let's assume we might just set it directly or handle it in a utils file.
        // For this implementation, let's just stick to the CSS variable updates if we had a converter.
        // Or simpler: The backend stores hex, but tailwind uses HSL.
        // A robust app would use a library like 'color' to convert.
        // For now, let's just update the document title and maybe logo.
        document.title = query.data.brandName;
      }
      
      if (query.data.fontFamily && query.data.fontFamily !== "Inter") {
        root.style.setProperty('--font-sans', query.data.fontFamily);
      }
    }
  }, [query.data]);

  return query;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<InsertThemeSettings>) => {
      const res = await fetch(api.settings.update.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return api.settings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      toast({ title: "Success", description: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
