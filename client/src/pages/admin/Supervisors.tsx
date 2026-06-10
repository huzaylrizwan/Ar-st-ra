import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, UserPlus, Users } from "lucide-react";
import type { Supervisor } from "@shared/schema";

export default function AdminSupervisors() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const { data: supervisors, isLoading } = useQuery<Supervisor[]>({
    queryKey: ["/api/supervisors"],
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/supervisors", { email, name: name || null, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
      setEmail("");
      setName("");
      setPassword("");
      toast({ title: "Supervisor added", description: `${email} can now access the supervisor portal.` });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add supervisor.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/supervisors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
      toast({ title: "Supervisor removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove supervisor.", variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!email.trim()) return;
    addMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supervisors</h1>
          <p className="text-muted-foreground">
            Whitelist email addresses to grant supervisor portal access
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Supervisor
            </CardTitle>
            <CardDescription>
              Add users who can log in with their email and password to access the /supervisor portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                data-testid="input-supervisor-email"
                className="flex-1"
              />
              <Input
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                data-testid="input-supervisor-name"
                className="flex-1"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                data-testid="input-supervisor-password"
                className="flex-1"
              />
              <Button
                onClick={handleAdd}
                disabled={!email.trim() || addMutation.isPending}
                data-testid="button-add-supervisor"
              >
                {addMutation.isPending ? "Adding..." : "Add Supervisor"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Current Supervisors
              {supervisors && (
                <Badge variant="secondary" className="ml-1">{supervisors.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !supervisors?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No supervisors yet. Add one above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisors.map((supervisor) => (
                    <TableRow key={supervisor.id} data-testid={`row-supervisor-${supervisor.id}`}>
                      <TableCell className="font-medium" data-testid={`text-supervisor-email-${supervisor.id}`}>
                        {supervisor.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supervisor.name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(supervisor.addedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(supervisor.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-remove-supervisor-${supervisor.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
