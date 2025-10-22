import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, MessageSquare, CheckCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import type { FlaggedConversationWithDetails, MessageWithSender } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminFlaggedConversations() {
  const { toast } = useToast();
  const [selectedFlagged, setSelectedFlagged] = useState<FlaggedConversationWithDetails | null>(null);
  const [viewTab, setViewTab] = useState<"unreviewed" | "reviewed">("unreviewed");

  // Fetch flagged conversations
  const { data: unreviewedFlags = [], isLoading: isLoadingUnreviewed } = useQuery<FlaggedConversationWithDetails[]>({
    queryKey: ["/api/admin/flagged-conversations", "unreviewed"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flagged-conversations?reviewed=false", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch flagged conversations");
      return res.json();
    },
  });

  const { data: reviewedFlags = [], isLoading: isLoadingReviewed } = useQuery<FlaggedConversationWithDetails[]>({
    queryKey: ["/api/admin/flagged-conversations", "reviewed"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flagged-conversations?reviewed=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch flagged conversations");
      return res.json();
    },
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", selectedFlagged?.conversationId, "messages"],
    enabled: !!selectedFlagged,
  });

  // Mark as reviewed mutation
  const markAsReviewedMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/flagged-conversations/${id}/review`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-conversations", "unreviewed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-conversations", "reviewed"] });
      setSelectedFlagged(null);
      toast({
        title: "Success",
        description: "Conversation marked as reviewed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark conversation as reviewed.",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsReviewed = (id: string) => {
    markAsReviewedMutation.mutate(id);
  };

  const FlaggedTable = ({ flags, isLoading }: { flags: FlaggedConversationWithDetails[]; isLoading: boolean }) => {
    if (isLoading) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Loading flagged conversations...
        </div>
      );
    }

    if (flags.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No flagged conversations.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Triggered Word</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Hostess</TableHead>
            <TableHead>Flagged Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((flag) => (
            <TableRow key={flag.id} data-testid={`flagged-${flag.id}`}>
              <TableCell>
                <Badge variant="destructive" className="font-mono">
                  {flag.triggeredWord}
                </Badge>
              </TableCell>
              <TableCell>{flag.conversation.client.email.split('@')[0]}</TableCell>
              <TableCell>{flag.conversation.hostess.displayName}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(flag.flaggedAt), "MMM d, yyyy h:mm a")}
              </TableCell>
              <TableCell>
                {flag.reviewed ? (
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Reviewed
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFlagged(flag)}
                  data-testid={`button-view-${flag.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {!flag.reviewed && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleMarkAsReviewed(flag.id)}
                    disabled={markAsReviewedMutation.isPending}
                    data-testid={`button-mark-reviewed-${flag.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Reviewed
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold">Flagged Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Review conversations that contain trigger words
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <h3 className="text-3xl font-bold mt-1">{unreviewedFlags.length}</h3>
            </div>
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Reviewed</p>
              <h3 className="text-3xl font-bold mt-1">{reviewedFlags.length}</h3>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Flagged Conversations List */}
      <Card>
        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "unreviewed" | "reviewed")}>
          <div className="border-b p-4">
            <TabsList>
              <TabsTrigger value="unreviewed" data-testid="tab-unreviewed">
                Pending Review ({unreviewedFlags.length})
              </TabsTrigger>
              <TabsTrigger value="reviewed" data-testid="tab-reviewed">
                Reviewed ({reviewedFlags.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="unreviewed" className="mt-0">
              <FlaggedTable flags={unreviewedFlags} isLoading={isLoadingUnreviewed} />
            </TabsContent>

            <TabsContent value="reviewed" className="mt-0">
              <FlaggedTable flags={reviewedFlags} isLoading={isLoadingReviewed} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Conversation View Dialog */}
      <Dialog open={!!selectedFlagged} onOpenChange={(open) => !open && setSelectedFlagged(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Details
            </DialogTitle>
            <DialogDescription>
              {selectedFlagged && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Triggered Word:</span>
                    <Badge variant="destructive" className="font-mono">
                      {selectedFlagged.triggeredWord}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Between:</span>
                    <span>{selectedFlagged.conversation.client.email.split('@')[0]}</span>
                    <span className="text-muted-foreground">and</span>
                    <span>{selectedFlagged.conversation.hostess.displayName}</span>
                  </div>
                  <div>
                    <span className="font-medium">Flagged:</span>{" "}
                    {format(new Date(selectedFlagged.flaggedAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages in this conversation.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isClient = message.sender?.id === selectedFlagged?.conversation.clientId;
                  const isFlaggedMessage = message.id === selectedFlagged?.messageId;
                  
                  return (
                    <div
                      key={message.id}
                      className={`${isFlaggedMessage ? "border-2 border-destructive rounded-lg p-2" : ""}`}
                      data-testid={`conversation-message-${message.id}`}
                    >
                      <div className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isClient ? "bg-muted" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold">
                              {isClient 
                                ? selectedFlagged?.conversation.client.email.split('@')[0] 
                                : selectedFlagged?.conversation.hostess.displayName}
                            </span>
                            {isFlaggedMessage && (
                              <Badge variant="destructive" className="text-xs">Flagged</Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${isClient ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                            {format(new Date(message.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          {selectedFlagged && !selectedFlagged.reviewed && (
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => handleMarkAsReviewed(selectedFlagged.id)}
                disabled={markAsReviewedMutation.isPending}
                data-testid="button-mark-reviewed-dialog"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Reviewed
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
