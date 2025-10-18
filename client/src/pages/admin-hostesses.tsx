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
import { Plus, MapPin, Upload, Edit2, X } from "lucide-react";
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
  const [uploadHostessId, setUploadHostessId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editSpecialtiesHostess, setEditSpecialtiesHostess] = useState<Hostess | null>(null);
  const [specialtiesInput, setSpecialtiesInput] = useState("");
  const [currentSpecialties, setCurrentSpecialties] = useState<string[]>([]);

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

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ hostessId, file }: { hostessId: string; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/hostesses/${hostessId}/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hostesses"] });
      toast({ title: "Photo uploaded successfully" });
      setUploadHostessId(null);
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to upload photo",
        description: error.message,
      });
    },
  });

  const updateSpecialtiesMutation = useMutation({
    mutationFn: async ({ hostessId, specialties }: { hostessId: string; specialties: string[] }) => {
      return apiRequest("PATCH", `/api/hostesses/${hostessId}`, { specialties });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hostesses"] });
      toast({ title: "Specialties updated successfully" });
      setEditSpecialtiesHostess(null);
      setCurrentSpecialties([]);
      setSpecialtiesInput("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update specialties",
        description: error.message,
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (uploadHostessId && selectedFile) {
      uploadPhotoMutation.mutate({ hostessId: uploadHostessId, file: selectedFile });
    }
  };

  const handleOpenEditSpecialties = (hostess: Hostess) => {
    setEditSpecialtiesHostess(hostess);
    setCurrentSpecialties(hostess.specialties || []);
    setSpecialtiesInput("");
  };

  const handleAddSpecialty = () => {
    const trimmed = specialtiesInput.trim();
    if (trimmed && !currentSpecialties.includes(trimmed)) {
      setCurrentSpecialties([...currentSpecialties, trimmed]);
      setSpecialtiesInput("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setCurrentSpecialties(currentSpecialties.filter(s => s !== specialty));
  };

  const handleSaveSpecialties = () => {
    if (editSpecialtiesHostess) {
      updateSpecialtiesMutation.mutate({
        hostessId: editSpecialtiesHostess.id,
        specialties: currentSpecialties,
      });
    }
  };

  const handleSpecialtiesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSpecialty();
    }
  };

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
                    <TableHead>Actions</TableHead>
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
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUploadHostessId(hostess.id)}
                            data-testid={`button-upload-photo-${hostess.id}`}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Photo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditSpecialties(hostess)}
                            data-testid={`button-edit-specialties-${hostess.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Specialties
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Photo Upload Dialog */}
        <Dialog open={!!uploadHostessId} onOpenChange={(open) => !open && setUploadHostessId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Hostess Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {previewUrl ? (
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={previewUrl} />
                  </Avatar>
                ) : (
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  data-testid="input-photo-file"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum file size: 5MB. Supported formats: JPEG, PNG, WebP, GIF
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setUploadHostessId(null);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadPhotoMutation.isPending}
                  data-testid="button-confirm-upload"
                >
                  {uploadPhotoMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Specialties Dialog */}
        <Dialog open={!!editSpecialtiesHostess} onOpenChange={(open) => !open && setEditSpecialtiesHostess(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Specialties - {editSpecialtiesHostess?.displayName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Specialty</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a specialty (e.g., Massage, Aromatherapy)"
                    value={specialtiesInput}
                    onChange={(e) => setSpecialtiesInput(e.target.value)}
                    onKeyDown={handleSpecialtiesKeyDown}
                    data-testid="input-specialty"
                  />
                  <Button
                    onClick={handleAddSpecialty}
                    disabled={!specialtiesInput.trim()}
                    data-testid="button-add-specialty"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Specialties</label>
                <div className="min-h-[100px] p-4 border rounded-md bg-muted/50">
                  {currentSpecialties.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No specialties yet. Add some above!
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {currentSpecialties.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant="secondary"
                          className="gap-1 pr-1"
                          data-testid={`badge-specialty-${specialty}`}
                        >
                          {specialty}
                          <button
                            onClick={() => handleRemoveSpecialty(specialty)}
                            className="ml-1 rounded-full hover-elevate p-0.5"
                            data-testid={`button-remove-specialty-${specialty}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setEditSpecialtiesHostess(null);
                    setCurrentSpecialties([]);
                    setSpecialtiesInput("");
                  }}
                  data-testid="button-cancel-specialties"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveSpecialties}
                  disabled={updateSpecialtiesMutation.isPending}
                  data-testid="button-save-specialties"
                >
                  {updateSpecialtiesMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
