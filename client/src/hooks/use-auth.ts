import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithCsrf } from "@/lib/queryClient";

interface AuthUser {
  email: string;
  firstName: string;
  lastName?: string;
  role: "admin" | "supervisor";
  profileImageUrl?: string | null;
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetchWithCsrf("/api/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      window.location.href = "/login";
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
