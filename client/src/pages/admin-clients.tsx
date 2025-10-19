import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminClients() {
  const [searchTerm, setSearchTerm] = useState("");

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
                onChange={(e) => setSearchTerm(e.target.value)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Force Reset</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map((client) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
