import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, MapPin } from "lucide-react";
import type { Hostess } from "@shared/schema";

const hostessSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Only lowercase, numbers, and hyphens"),
  displayName: z.string().min(1),
  location: z.enum(["DOWNTOWN", "WEST_END"]),
  bio: z.string().optional(),
  specialties: z.string().optional(),
});

type HostessFormData = z.infer<typeof hostessSchema>;

export default function AdminHostesses() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: hostesses, isLoading } = useQuery<Hostess[]>({
    queryKey: ["/api/hostesses"],
  });

  const createHostessMutation = useMutation({
    mutationFn: async (data: HostessFormData) => {
      const payload = {
        ...data,
        specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : [],
      };
      return apiRequest("POST", "/api/hostesses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hostesses"] });
      toast({ title: "Hostess created successfully" });
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create hostess",
        description: error.message,
      });
    },
  });

  const form = useForm<HostessFormData>({
    resolver: zodResolver(hostessSchema),
    defaultValues: {
      slug: "",
      displayName: "",
      location: "DOWNTOWN",
      bio: "",
      specialties: "",
    },
  });

  const onSubmit = (data: HostessFormData) => {
    createHostessMutation.mutate(data);
  };

  const sortedHostesses = hostesses?.slice().sort((a, b) => 
    (a.displayName || "").localeCompare(b.displayName || "")
  ) || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-section-title font-semibold">Hostess Management</h1>
            <p className="text-muted-foreground">Manage hostess profiles and availability</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-hostess">
                <Plus className="h-4 w-4 mr-2" />
                Add Hostess
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Hostess</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" data-testid="input-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug (URL)</FormLabel>
                          <FormControl>
                            <Input placeholder="jane-doe" data-testid="input-slug" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DOWNTOWN">Downtown</SelectItem>
                            <SelectItem value="WEST_END">West End</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us about yourself..." data-testid="input-bio" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialties (Optional, comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="Massage, Aromatherapy, Meditation" data-testid="input-specialties" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={createHostessMutation.isPending}>
                    {createHostessMutation.isPending ? "Creating..." : "Create Hostess"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Hostesses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Specialties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHostesses.map((hostess) => (
                    <TableRow key={hostess.id} data-testid={`hostess-${hostess.id}`}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={hostess.photoUrl || undefined} />
                          <AvatarFallback>
                            {hostess.displayName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{hostess.displayName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {hostess.location === "DOWNTOWN" ? "Downtown" : "West End"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hostess.active ? "default" : "secondary"}>
                          {hostess.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {hostess.specialties?.slice(0, 2).map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {hostess.specialties && hostess.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{hostess.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
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
