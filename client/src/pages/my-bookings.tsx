import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Clock, MessageSquare, XCircle } from "lucide-react";
import { formatDate, formatTimeRange } from "@/lib/time-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/footer";
import type { BookingWithDetails } from "@shared/schema";

export default function MyBookings() {
  const { toast } = useToast();
  const [notesBookingId, setNotesBookingId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/my"],
  });

  const upcomingBookings = bookings?.filter(b => 
    b.status !== "CANCELED" && b.status !== "COMPLETED"
  ) || [];

  const pastBookings = bookings?.filter(b => 
    b.status === "COMPLETED" || b.status === "CANCELED"
  ) || [];

  const addNotesMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes: string }) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/notes`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
      toast({ title: "Notes updated successfully" });
      setNotesBookingId(null);
      setNotesText("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update notes",
        description: error.message,
      });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("POST", `/api/bookings/${bookingId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
      toast({ title: "Booking cancelled successfully" });
      setCancelBookingId(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to cancel booking",
        description: error.message,
      });
    },
  });

  const handleAddNotes = (booking: BookingWithDetails) => {
    setNotesBookingId(booking.id);
    setNotesText(booking.notes || "");
  };

  const handleCancelBooking = (bookingId: string) => {
    setCancelBookingId(bookingId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-8">
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

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddNotes(booking)}
                          data-testid={`button-add-notes-${booking.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {booking.notes ? "Edit Notes" : "Add Notes"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelBooking(booking.id)}
                          data-testid={`button-cancel-${booking.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
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

        {/* Add Notes Dialog */}
        <Dialog open={!!notesBookingId} onOpenChange={(open) => !open && setNotesBookingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Notes to Booking</DialogTitle>
              <DialogDescription>
                Add or update notes for your appointment. These will be visible to the hostess.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any special requests or preferences..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={4}
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNotesBookingId(null)}
                data-testid="button-cancel-notes"
              >
                Cancel
              </Button>
              <Button
                onClick={() => notesBookingId && addNotesMutation.mutate({ bookingId: notesBookingId, notes: notesText })}
                disabled={addNotesMutation.isPending}
                data-testid="button-save-notes"
              >
                {addNotesMutation.isPending ? "Saving..." : "Save Notes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Booking Dialog */}
        <Dialog open={!!cancelBookingId} onOpenChange={(open) => !open && setCancelBookingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Booking</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelBookingId(null)}
                data-testid="button-cancel-dialog"
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelBookingId && cancelBookingMutation.mutate(cancelBookingId)}
                disabled={cancelBookingMutation.isPending}
                data-testid="button-confirm-cancel"
              >
                {cancelBookingMutation.isPending ? "Cancelling..." : "Yes, Cancel Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
      
      <Footer />
    </div>
  );
}
