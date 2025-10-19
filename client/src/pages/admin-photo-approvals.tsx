import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, XCircle, ImageIcon, AlertCircle } from "lucide-react";
import type { PhotoUploadWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function AdminPhotoApprovals() {
  const { toast } = useToast();

  const { data: uploads, isLoading } = useQuery<PhotoUploadWithDetails[]>({
    queryKey: ["/api/admin/photo-uploads/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/photo-uploads/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photo-uploads/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hostesses"] });
      toast({ title: "Photo approved successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to approve photo",
        description: error.message,
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/photo-uploads/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photo-uploads/pending"] });
      toast({ title: "Photo rejected successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reject photo",
        description: error.message,
      });
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Photo Approvals</CardTitle>
            <CardDescription>Loading pending photo uploads...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Photo Approvals
              </CardTitle>
              <CardDescription>Review and approve pending hostess photo uploads</CardDescription>
            </div>
            {uploads && uploads.length > 0 && (
              <Badge variant="secondary" data-testid="badge-pending-count">
                {uploads.length} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!uploads || uploads.length === 0 ? (
            <Alert data-testid="alert-no-uploads">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No pending photo uploads at this time.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6">
              {uploads.map((upload) => (
                <Card key={upload.id} data-testid={`card-upload-${upload.id}`}>
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-48 h-48 bg-muted rounded-lg overflow-hidden">
                          <img
                            src={upload.photoUrl}
                            alt={`Photo for ${upload.hostess.displayName}`}
                            className="w-full h-full object-cover"
                            data-testid={`img-preview-${upload.id}`}
                          />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1" data-testid={`text-hostess-${upload.id}`}>
                            {upload.hostess.displayName}
                          </h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p data-testid={`text-location-${upload.id}`}>
                              Location: <span className="text-foreground">{upload.hostess.location}</span>
                            </p>
                            <p data-testid={`text-uploaded-${upload.id}`}>
                              Uploaded: <span className="text-foreground">
                                {formatDistanceToNow(new Date(upload.uploadedAt), { addSuffix: true })}
                              </span>
                            </p>
                            <p>
                              Status: <Badge variant="secondary" data-testid={`badge-status-${upload.id}`}>
                                {upload.status}
                              </Badge>
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => handleApprove(upload.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            variant="default"
                            data-testid={`button-approve-${upload.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(upload.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            variant="destructive"
                            data-testid={`button-reject-${upload.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
