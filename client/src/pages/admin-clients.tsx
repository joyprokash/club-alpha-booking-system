import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Key, ChevronLeft, ChevronRight } from "lucide-react";
import type { User } from "@shared/schema";

const CLIENTS_PER_PAGE = 100;

export default function AdminClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Filter for only CLIENT role users
  const clients = users?.filter(user => user.role === "CLIENT") || [];

  // Filter clients based on search term
  const filteredClients = clients.filter(client => {
    const search = searchTerm.toLowerCase();
    return (
      client.username.toLowerCase().includes(search) ||
      client.email.toLowerCase().includes(search)
    );
  });

  // Sort by username
  const sortedClients = filteredClients.slice().sort((a, b) => 
    a.username.localeCompare(b.username)
  );

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(sortedClients.length / CLIENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
  const endIndex = startIndex + CLIENTS_PER_PAGE;
  const paginatedClients = sortedClients.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return apiRequest("POST", `/api/admin/users/${id}/reset-password`, { password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setResetPasswordUser(null);
      setNewPassword("");
      toast({
        title: "Password reset successfully",
        description: "The client can now use their new password",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: error.message || "An error occurred",
      });
    },
  });

  const handleResetPassword = () => {
    if (!resetPasswordUser || !newPassword) return;
    
    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Invalid password",
        description: "Password must be at least 8 characters",
      });
      return;
    }

    resetPasswordMutation.mutate({
      id: resetPasswordUser.id,
      password: newPassword,
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-section-title font-semibold">Clients</h1>
          <p className="text-muted-foreground">View and search all client accounts</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Clients ({sortedClients.length})</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                data-testid="input-search-clients"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : sortedClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No clients found matching your search" : "No clients found"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Force Reset</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client) => (
                      <TableRow key={client.id} data-testid={`client-${client.id}`}>
                        <TableCell className="font-medium">{client.username}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>
                          {client.banned ? (
                            <Badge variant="destructive" data-testid={`status-banned-${client.id}`}>
                              Banned
                            </Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`status-active-${client.id}`}>
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.forcePasswordReset ? (
                            <Badge variant="destructive">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetPasswordUser(client);
                              setNewPassword("");
                            }}
                            className="gap-1"
                            data-testid={`button-reset-password-${client.id}`}
                          >
                            <Key className="h-3 w-3" />
                            Reset Password
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, sortedClients.length)} of {sortedClients.length} clients
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        data-testid="button-previous-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Reset Password Dialog */}
        <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && (setResetPasswordUser(null), setNewPassword(""))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetPasswordUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                  data-testid="input-new-password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => (setResetPasswordUser(null), setNewPassword(""))}
                data-testid="button-cancel-reset"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending || newPassword.length < 8}
                data-testid="button-confirm-reset-password"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
