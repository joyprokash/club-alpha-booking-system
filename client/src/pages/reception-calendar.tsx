import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { formatTimeRange, formatDate, getCurrentDateToronto } from "@/lib/time-utils";
import type { BookingWithDetails } from "@shared/schema";

export default function ReceptionCalendar() {
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
    { title: "View Calendar", icon: Calendar, href: "/admin/calendar" },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-dashboard-metric font-bold mb-2">Reception Dashboard</h1>
          <p className="text-muted-foreground">View and manage today's appointments</p>
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
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full h-auto py-6 flex-col gap-2"
              onClick={() => setLocation("/admin/calendar")}
              data-testid="action-view-calendar"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm font-medium">View Calendar</span>
            </Button>
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
