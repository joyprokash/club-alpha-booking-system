import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCog, FileUp, AlertCircle, CheckCircle2, XCircle, KeyRound, ShieldOff, ShieldCheck } from "lucide-react";
import type { User, Hostess } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedHostess, setSelectedHostess] = useState<string>("");
  const [csvData, setCsvData] = useState("");
  const [importResults, setImportResults] = useState<any>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: hostesses } = useQuery<Hostess[]>({
    queryKey: ["/api/hostesses"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, hostessId }: { id: string; role: string; hostessId?: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}`, { role, hostessId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hostesses"] });
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update user",
        description: error.message,
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: string) => {
      const response = await apiRequest("POST", "/api/admin/users/bulk-import", { csvData: data });
      return response.json();
    },
    onSuccess: (data: any) => {
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;
      
      toast({
        title: "Import completed",
        description: `${successCount} users created, ${failCount} failed`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return apiRequest("POST", `/api/admin/users/${id}/reset-password`, { password });
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setResetPasswordUser(null);
      setNewPassword("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: error.message,
      });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      return apiRequest("POST", `/api/admin/users/${id}/ban`, { banned });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ 
        title: variables.banned ? "User banned successfully" : "User unbanned successfully",
        description: variables.banned ? "User will no longer be able to log in" : "User can now log in again"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update user status",
        description: error.message,
      });
    },
  });

  const handleUpdate = () => {
    if (!editingUser || !selectedRole) return;
    
    updateUserMutation.mutate({
      id: editingUser.id,
      role: selectedRole,
      hostessId: selectedRole === "STAFF" ? selectedHostess || undefined : undefined,
    });
  };

  const handleBulkImport = () => {
    if (!csvData.trim()) {
      toast({
        variant: "destructive",
        title: "No CSV data",
        description: "Please paste CSV data to import",
      });
      return;
    }
    setImportResults(null);
    bulkImportMutation.mutate(csvData);
  };

  const handleResetPassword = () => {
    if (!resetPasswordUser || !newPassword) return;
    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters",
      });
      return;
    }
    resetPasswordMutation.mutate({
      id: resetPasswordUser.id,
      password: newPassword,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "default";
      case "STAFF": return "secondary";
      case "RECEPTION": return "outline";
      default: return "outline";
    }
  };

  const sortedUsers = users?.slice().sort((a, b) => a.email.localeCompare(b.email)) || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-section-title font-semibold">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Import Users</CardTitle>
            <CardDescription>Upload a CSV file to create multiple users at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>CSV Format:</strong> email,role,password (password is optional)
                <br />
                <strong>Example:</strong> user@example.com,CLIENT,mypassword123
                <br />
                <strong>Roles:</strong> ADMIN, STAFF, RECEPTION, CLIENT
              </AlertDescription>
            </Alert>

            <div>
              <label className="block text-sm font-medium mb-2">Upload CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                data-testid="input-csv-file"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Or Paste CSV Data</label>
              <Textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="email,role,password&#10;user1@example.com,CLIENT&#10;user2@example.com,STAFF,password123"
                rows={6}
                className="font-mono text-xs"
                data-testid="textarea-csv"
              />
            </div>

            <Button
              onClick={handleBulkImport}
              disabled={bulkImportMutation.isPending || !csvData.trim()}
              className="w-full"
              data-testid="button-import-users"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {bulkImportMutation.isPending ? "Importing..." : "Import Users"}
            </Button>

            {importResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Results</CardTitle>
                  <CardDescription>
                    {importResults.imported} of {importResults.total} users imported successfully
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importResults.results.map((result: any, idx: number) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 p-3 rounded-md ${
                          result.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                        }`}
                        data-testid={`result-${idx}`}
                      >
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 text-sm">
                          <div className="font-medium">{result.row.email}</div>
                          {result.success ? (
                            <>
                              <div className="text-muted-foreground">
                                Role: {result.row.role || "CLIENT"}
                              </div>
                              {result.generatedPassword && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                  Generated password: <code className="bg-background px-1 rounded">{result.generatedPassword}</code>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-red-600 dark:text-red-400">{result.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked Hostess</TableHead>
                    <TableHead>Force Reset</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map((user) => {
                    const linkedHostess = hostesses?.find(h => h.userId === user.id);
                    
                    return (
                      <TableRow key={user.id} data-testid={`user-${user.id}`}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.banned ? (
                            <Badge variant="destructive" data-testid={`status-banned-${user.id}`}>Banned</Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`status-active-${user.id}`}>Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {linkedHostess ? linkedHostess.displayName : "-"}
                        </TableCell>
                        <TableCell>
                          {user.forcePasswordReset ? (
                            <Badge variant="destructive">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setSelectedRole(user.role);
                                setSelectedHostess(linkedHostess?.id || "");
                              }}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetPasswordUser(user);
                                setNewPassword("");
                              }}
                              data-testid={`button-reset-password-${user.id}`}
                            >
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </Button>
                            {user.role === "CLIENT" && (
                              <Button
                                variant={user.banned ? "default" : "destructive"}
                                size="sm"
                                onClick={() => {
                                  if (confirm(user.banned ? `Unban ${user.email}?` : `Ban ${user.email}? They will not be able to log in.`)) {
                                    banUserMutation.mutate({ id: user.id, banned: !user.banned });
                                  }
                                }}
                                disabled={banUserMutation.isPending}
                                data-testid={`button-ban-${user.id}`}
                              >
                                {user.banned ? (
                                  <>
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                    Unban
                                  </>
                                ) : (
                                  <>
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    Ban
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="RECEPTION">Reception</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === "STAFF" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Link to Hostess</label>
                  <Select value={selectedHostess} onValueChange={setSelectedHostess}>
                    <SelectTrigger data-testid="select-hostess">
                      <SelectValue placeholder="Select hostess..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {hostesses
                        ?.filter(h => !h.userId || h.userId === editingUser?.id)
                        .map(h => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.displayName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only unlinked hostesses or current assignment shown
                  </p>
                </div>
              )}

              <Button
                onClick={handleUpdate}
                className="w-full"
                disabled={updateUserMutation.isPending}
                data-testid="button-update-user"
              >
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && (setResetPasswordUser(null), setNewPassword(""))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetPasswordUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  data-testid="input-new-password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Password must be at least 8 characters long
                </p>
              </div>

              <Button
                onClick={handleResetPassword}
                className="w-full"
                disabled={resetPasswordMutation.isPending || newPassword.length < 8}
                data-testid="button-confirm-reset-password"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
