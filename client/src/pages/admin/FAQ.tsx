import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFaqItemSchema, type InsertFaqItem, type FaqItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminFAQ() {
  const { data: faqItems, isLoading } = useQuery<FaqItem[]>({
    queryKey: ["/api/faq"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertFaqItem) => apiRequest("POST", "/api/faq", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faq"] });
      toast({ title: "Success", description: "FAQ item created successfully." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: InsertFaqItem & { id: number }) =>
      apiRequest("PUT", `/api/faq/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faq"] });
      toast({ title: "Success", description: "FAQ item updated successfully." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/faq/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faq"] });
      toast({ title: "Success", description: "FAQ item deleted successfully." });
    },
  });

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const form = useForm<InsertFaqItem>({
    resolver: zodResolver(insertFaqItemSchema),
    defaultValues: {
      question: "",
      answer: "",
      isVisible: true,
      sortOrder: 0,
    },
  });

  const onSubmit = async (data: InsertFaqItem) => {
    try {
      if (editingFaq) {
        await updateMutation.mutateAsync({ id: editingFaq.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingFaq(null);
    form.reset({
      question: "",
      answer: "",
      isVisible: true,
      sortOrder: 0,
    });
  };

  const handleEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    form.reset({
      question: faq.question,
      answer: faq.answer,
      isVisible: faq.isVisible,
      sortOrder: faq.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this FAQ item?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">FAQ Management</h1>
          <p className="text-muted-foreground mt-1">Manage frequently asked questions</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-faq">
              <Plus className="w-4 h-4" /> Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingFaq ? "Edit FAQ" : "New FAQ"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  {...form.register("question")}
                  placeholder="Enter the question..."
                  data-testid="input-faq-question"
                />
                {form.formState.errors.question && (
                  <p className="text-sm text-destructive">{form.formState.errors.question.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  {...form.register("answer")}
                  placeholder="Enter the answer..."
                  rows={4}
                  data-testid="input-faq-answer"
                />
                {form.formState.errors.answer && (
                  <p className="text-sm text-destructive">{form.formState.errors.answer.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  {...form.register("sortOrder", { valueAsNumber: true })}
                  placeholder="0"
                  data-testid="input-faq-sort-order"
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="isVisible">Visible</Label>
                <Switch
                  id="isVisible"
                  checked={form.watch("isVisible")}
                  onCheckedChange={(checked) => form.setValue("isVisible", checked)}
                  data-testid="switch-faq-visible"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-faq"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-faq"
                >
                  {editingFaq ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Answer Preview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : faqItems?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No FAQ items found.
                </TableCell>
              </TableRow>
            ) : (
              faqItems?.map((faq) => (
                <TableRow key={faq.id} data-testid={`row-faq-${faq.id}`}>
                  <TableCell className="font-medium max-w-xs">{truncateText(faq.question, 50)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">{truncateText(faq.answer, 60)}</TableCell>
                  <TableCell>
                    {faq.isVisible ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Visible
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Hidden
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{faq.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(faq)}
                      data-testid={`button-edit-faq-${faq.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(faq.id)}
                      data-testid={`button-delete-faq-${faq.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
