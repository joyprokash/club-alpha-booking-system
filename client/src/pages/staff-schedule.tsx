import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Upload } from "lucide-react";
import { formatTimeRange, formatDate, getCurrentDateToronto } from "@/lib/time-utils";
import type { BookingWithDetails } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useRef } from "react";

export default function StaffSchedule() {
  const { user } = useAuth();
  const today = getCurrentDateToronto();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Get staff's linked hostess
  const { data: linkedHostess } = useQuery<any>({
    queryKey: ["/api/staff/hostess"],
  });

  // Get staff's bookings (filtered on backend to their linked hostess)
  const { data: myTodaysBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/staff/bookings/today"],
    enabled: !!linkedHostess,
  });

  const { data: myUpcomingBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/staff/bookings/upcoming"],
    enabled: !!linkedHostess,
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !linkedHostess) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/staff/profile-photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/staff/hostess"] });
      toast({ title: "Profile photo updated successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to upload photo" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!linkedHostess) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Your account is not yet linked to a hostess profile. Please contact an administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={linkedHostess.photoUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {linkedHostess.displayName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-dashboard-metric font-bold mb-2">{linkedHostess.displayName}</h1>
                <p className="text-muted-foreground mb-3">
                  {linkedHostess.location === "DOWNTOWN" ? "Downtown" : "West End"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  data-testid="input-profile-photo"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="button-upload-photo"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Update Profile Photo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Your Schedule Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTodaysBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No appointments today</p>
            ) : (
              <div className="space-y-3">
                {myTodaysBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`booking-${booking.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">
                          {formatTimeRange(booking.startTime, booking.endTime)}
                        </span>
                        <Badge variant="outline">{booking.service.name}</Badge>
                        <Badge
                          variant={
                            booking.status === "CONFIRMED" ? "default" :
                            booking.status === "PENDING" ? "secondary" :
                            "outline"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Client: {booking.client.email}
                      </div>
                      {booking.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Notes:</span> {booking.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {myUpcomingBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {myUpcomingBookings.slice(0, 10).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`booking-${booking.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatDate(booking.date)}</span>
                        <span className="font-mono">
                          {formatTimeRange(booking.startTime, booking.endTime)}
                        </span>
                        <Badge variant="outline">{booking.service.name}</Badge>
                        <Badge
                          variant={
                            booking.status === "CONFIRMED" ? "default" :
                            booking.status === "PENDING" ? "secondary" :
                            "outline"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Client: {booking.client.email}
                      </div>
                      {booking.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Notes:</span> {booking.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
