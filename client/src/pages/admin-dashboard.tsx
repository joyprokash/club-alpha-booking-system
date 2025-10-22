import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, FileUp, FileDown, Clock, Settings, MapPin, QrCode } from "lucide-react";
import { formatTimeRange, formatDate, getCurrentDateToronto } from "@/lib/time-utils";
import type { BookingWithDetails } from "@shared/schema";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const today = getCurrentDateToronto();

  const { data: todaysBookings } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/day", today],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/bookings/day?date=${today}`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  const { data: upcomingBookings } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/upcoming"],
  });

  const downtownCount = todaysBookings?.filter(b => b.hostess.locations?.includes("DOWNTOWN") && b.status !== "CANCELED").length || 0;
  const westEndCount = todaysBookings?.filter(b => b.hostess.locations?.includes("WEST_END") && b.status !== "CANCELED").length || 0;

  const quickActions = [
    { title: "Calendar View", icon: Calendar, href: "/admin/calendar" },
    { title: "Import Schedule", icon: FileUp, href: "/admin/import" },
    { title: "Export Schedule", icon: FileDown, href: "/admin/export" },
    { title: "Manage Users", icon: Users, href: "/admin/users" },
    { title: "Block Time Off", icon: Clock, href: "/admin/timeoff" },
    { title: "Services", icon: Settings, href: "/admin/services" },
  ];

  const handleDownloadQR = () => {
    const clientPortalUrl = `${window.location.origin}/hostesses`;
    const qrUrl = `/api/qr?url=${encodeURIComponent(clientPortalUrl)}`;
    
    // Open in new tab to download
    window.open(qrUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-dashboard-metric font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage bookings, staff, and schedules</p>
        </div>

        {/* Today's Appointments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Downtown Appointments Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-dashboard-metric font-bold text-primary">{downtownCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                West End Appointments Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-dashboard-metric font-bold text-primary">{westEndCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Quick Actions</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadQR}
              className="gap-2"
              data-testid="button-download-qr"
            >
              <QrCode className="h-4 w-4" />
              QR for Client Portal
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.href}
                  variant="outline"
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => setLocation(action.href)}
                  data-testid={`action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{action.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {!upcomingBookings || upcomingBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.slice(0, 10).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`booking-${booking.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{booking.hostess.displayName}</p>
                        {booking.hostess.locations && booking.hostess.locations.length > 0 && (
                          <div className="flex gap-1">
                            {booking.hostess.locations.map((loc, idx) => (
                              <Badge key={idx} variant="outline">
                                {loc === "DOWNTOWN" ? "Downtown" : "West End"}
                              </Badge>
                            ))}
                          </div>
                        )}
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
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatDate(booking.date)}</span>
                        <span className="font-mono">
                          {formatTimeRange(booking.startTime, booking.endTime)}
                        </span>
                        <span>{booking.client.email}</span>
                      </div>
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
