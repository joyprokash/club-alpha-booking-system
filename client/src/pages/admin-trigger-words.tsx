import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Shield } from "lucide-react";
import { format } from "date-fns";
import type { TriggerWordWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminTriggerWords() {
  const { toast } = useToast();
  const [newWord, setNewWord] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch trigger words
  const { data: triggerWords = [], isLoading } = useQuery<TriggerWordWithDetails[]>({
    queryKey: ["/api/admin/trigger-words"],
  });

  // Add trigger word mutation
  const addWordMutation = useMutation({
    mutationFn: async (word: string) => {
      return apiRequest("POST", "/api/admin/trigger-words", { word });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trigger-words"] });
      setNewWord("");
      toast({
        title: "Success",
        description: "Trigger word added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add trigger word.",
        variant: "destructive",
      });
    },
  });

  // Delete trigger word mutation
  const deleteWordMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/trigger-words/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trigger-words"] });
      setDeleteId(null);
      toast({
        title: "Success",
        description: "Trigger word deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trigger word.",
        variant: "destructive",
      });
    },
  });

  const handleAddWord = () => {
    if (!newWord.trim()) return;
    addWordMutation.mutate(newWord.trim());
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Trigger Words Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor conversations for specific words and phrases
          </p>
        </div>
      </div>

      {/* Add New Trigger Word */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Trigger Word</h2>
        <div className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddWord();
              }
            }}
            placeholder="Enter word or phrase to monitor..."
            disabled={addWordMutation.isPending}
            data-testid="input-trigger-word"
          />
          <Button
            onClick={handleAddWord}
            disabled={!newWord.trim() || addWordMutation.isPending}
            data-testid="button-add-trigger-word"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Words are case-insensitive. Conversations containing these words will be flagged for review.
        </p>
      </Card>

      {/* Trigger Words List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Trigger Words</h2>
            <Badge variant="outline">{triggerWords.length} total</Badge>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading trigger words...
            </div>
          ) : triggerWords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trigger words configured. Add your first trigger word above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Word/Phrase</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggerWords.map((tw) => (
                  <TableRow key={tw.id} data-testid={`trigger-word-${tw.id}`}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {tw.word}
                      </Badge>
                    </TableCell>
                    <TableCell>{tw.addedByUser.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tw.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(tw.id)}
                        data-testid={`button-delete-${tw.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trigger Word?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the trigger word from monitoring. Existing flagged conversations will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteWordMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
