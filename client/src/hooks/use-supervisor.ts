import { useQuery } from "@tanstack/react-query";

async function fetchSupervisorStatus(): Promise<{ isSupervisor: boolean }> {
  const response = await fetch("/api/supervisor/me", { credentials: "include" });
  if (!response.ok) return { isSupervisor: false };
  return response.json();
}

export function useSupervisor() {
  const { data, isLoading } = useQuery<{ isSupervisor: boolean }>({
    queryKey: ["/api/supervisor/me"],
    queryFn: fetchSupervisorStatus,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    isSupervisor: data?.isSupervisor ?? false,
    isLoading,
  };
}
