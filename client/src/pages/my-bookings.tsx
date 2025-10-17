import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock } from "lucide-react";
import { formatDate, formatTimeRange } from "@/lib/time-utils";
import type { BookingWithDetails } from "@shared/schema";

export default function MyBookings() {
  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/my"],
  });

  const upcomingBookings = bookings?.filter(b => 
    b.status !== "CANCELED" && b.status !== "COMPLETED"
  ) || [];

  const pastBookings = bookings?.filter(b => 
    b.status === "COMPLETED" || b.status === "CANCELED"
  ) || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-hero font-bold mb-2">My Bookings</h1>
          <p className="text-body-large text-muted-foreground">
            View and manage your appointments
          </p>
        </div>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No upcoming appointments</p>
                <Button className="mt-4" onClick={() => window.location.href = "/hostesses"}>
                  Book Now
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border rounded-lg hover-elevate"
                    data-testid={`booking-${booking.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{booking.hostess.displayName}</h3>
                          <Badge
                            variant={booking.status === "CONFIRMED" ? "default" : "secondary"}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(booking.date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-mono">
                              {formatTimeRange(booking.startTime, booking.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {booking.hostess.location === "DOWNTOWN" ? "Downtown" : "West End"}
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">{booking.service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.service.durationMin} minutes - ${(booking.service.priceCents / 100).toFixed(2)}
                          </p>
                        </div>

                        {booking.notes && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Notes:</span> {booking.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Past Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {pastBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No past appointments</div>
            ) : (
              <div className="space-y-3">
                {pastBookings.slice(0, 10).map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border rounded-lg opacity-60"
                    data-testid={`past-booking-${booking.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{booking.hostess.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(booking.date)} • {formatTimeRange(booking.startTime, booking.endTime)}
                        </p>
                      </div>
                      <Badge variant="outline">{booking.status}</Badge>
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
