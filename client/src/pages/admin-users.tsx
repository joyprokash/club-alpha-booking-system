import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCog } from "lucide-react";
import type { User, Hostess } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedHostess, setSelectedHostess] = useState<string>("");

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

  const handleUpdate = () => {
    if (!editingUser || !selectedRole) return;
    
    updateUserMutation.mutate({
      id: editingUser.id,
      role: selectedRole,
      hostessId: selectedRole === "STAFF" ? selectedHostess || undefined : undefined,
    });
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
      </div>
    </div>
  );
}
