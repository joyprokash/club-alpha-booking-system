import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ZoomIn, ZoomOut, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QuickBookingForm } from "@/components/quick-booking-form";
import { generateTimeSlots, formatTimeRange, GRID_START_TIME, GRID_END_TIME, SLOT_DURATION } from "@/lib/time-utils";
import type { Hostess, BookingWithDetails } from "@shared/schema";

type ZoomLevel = "compact" | "normal" | "comfortable";

export default function ReceptionWeekly() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("compact");
  const [selectedSlot, setSelectedSlot] = useState<{
    hostessId: string;
    date: string;
    startTime: number;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: hostesses } = useQuery<Hostess[]>({
    queryKey: locationFilter === "all"
      ? ["/api/hostesses"]
      : ["/api/hostesses?location=" + locationFilter],
  });

  // Fetch bookings for the entire week
  const startDateStr = format(weekStart, "yyyy-MM-dd");
  const endDateStr = format(weekEnd, "yyyy-MM-dd");

  const { data: bookings } = useQuery<BookingWithDetails[]>({
    queryKey: locationFilter === "all"
      ? [`/api/bookings/range?startDate=${startDateStr}&endDate=${endDateStr}`]
      : [`/api/bookings/range?startDate=${startDateStr}&endDate=${endDateStr}&location=${locationFilter}`],
  });

  const sortedHostesses = hostesses?.slice().sort((a, b) =>
    (a.displayName || "").localeCompare(b.displayName || "")
  ) || [];

  const timeSlots = generateTimeSlots(GRID_START_TIME, GRID_END_TIME, SLOT_DURATION);

  // Zoom level configurations
  const zoomConfig = {
    compact: {
      rowHeight: "h-4",
      headerHeight: "h-10",
      cellWidth: "w-16",
      avatarSize: "h-5 w-5",
      textSize: "text-xs",
      badgeHeight: "h-4",
    },
    normal: {
      rowHeight: "h-6",
      headerHeight: "h-12",
      cellWidth: "w-20",
      avatarSize: "h-6 w-6",
      textSize: "text-xs",
      badgeHeight: "h-5",
    },
    comfortable: {
      rowHeight: "h-8",
      headerHeight: "h-14",
      cellWidth: "w-24",
      avatarSize: "h-7 w-7",
      textSize: "text-sm",
      badgeHeight: "h-6",
    },
  };

  const currentZoom = zoomConfig[zoomLevel];

  const getBookingAtSlot = (hostessId: string, date: string, startTime: number) => {
    return bookings?.find(
      (b) => b.hostessId === hostessId && b.date === date && b.startTime <= startTime && b.endTime > startTime
    );
  };

  const { toast } = useToast();

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/cancel`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/range`] });
      toast({ title: "Booking canceled successfully" });
      setEditBookingOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to cancel booking",
        description: error.message,
      });
    },
  });

  const handleCellClick = (hostessId: string, date: string, startTime: number) => {
    const booking = getBookingAtSlot(hostessId, date, startTime);
    if (!booking) {
      setSelectedSlot({ hostessId, date, startTime });
      setQuickBookingOpen(true);
    } else {
      setSelectedBooking(booking);
      setEditBookingOpen(true);
    }
  };

  const goToPreviousWeek = () => {
    setSelectedDate(addDays(selectedDate, -7));
  };

  const goToNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-section-title font-semibold">Weekly Calendar</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousWeek}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={goToToday}
              data-testid="button-today"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextWeek}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground ml-2">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Daily View Button */}
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/calendar")}
            className="gap-2"
            data-testid="button-daily-view"
          >
            <LayoutGrid className="h-4 w-4" />
            Daily View
          </Button>

          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-48" data-testid="select-location-filter">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="DOWNTOWN">Downtown</SelectItem>
              <SelectItem value="WEST_END">West End</SelectItem>
            </SelectContent>
          </Select>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel("compact")}
              className={zoomLevel === "compact" ? "bg-muted" : ""}
              data-testid="button-zoom-compact"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel("normal")}
              className={zoomLevel === "normal" ? "bg-muted" : ""}
              data-testid="button-zoom-normal"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel("comfortable")}
              className={zoomLevel === "comfortable" ? "bg-muted" : ""}
              data-testid="button-zoom-comfortable"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-max">
          {/* Hostess/Time Column */}
          <div className="sticky left-0 z-20 bg-muted/30 border-r">
            {/* Top-left corner header */}
            <div className={`${currentZoom.headerHeight} border-b bg-card flex items-center px-2`}>
              <span className={`${currentZoom.textSize} font-medium text-muted-foreground`}>
                Hostess / Time
              </span>
            </div>

            {/* Hostess rows */}
            {sortedHostesses.map((hostess) => (
              <div
                key={hostess.id}
                className="border-b"
              >
                {timeSlots.map((slot) => (
                  <div
                    key={slot}
                    className={`${currentZoom.rowHeight} border-b flex items-center px-2 bg-card`}
                  >
                    {slot === GRID_START_TIME && (
                      <div className="flex items-center gap-2">
                        <Avatar className={currentZoom.avatarSize}>
                          <AvatarImage src={hostess.photoUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {hostess.displayName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`${currentZoom.textSize} truncate max-w-[120px]`}>
                          {hostess.displayName}
                        </span>
                        <Badge variant="outline" className={currentZoom.badgeHeight}>
                          {hostess.location === "DOWNTOWN" ? "D" : "W"}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;

            return (
              <div key={dayStr} className="border-r">
                {/* Day header */}
                <div className={`${currentZoom.headerHeight} border-b bg-card flex flex-col items-center justify-center ${isToday ? 'bg-primary/10' : ''}`}>
                  <span className={`${currentZoom.textSize} font-medium`}>
                    {format(day, "EEE")}
                  </span>
                  <span className={`${currentZoom.textSize} ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {format(day, "MMM d")}
                  </span>
                </div>

                {/* Hostess rows for this day */}
                {sortedHostesses.map((hostess) => (
                  <div key={hostess.id} className="border-b">
                    {timeSlots.map((slot) => {
                      const booking = getBookingAtSlot(hostess.id, dayStr, slot);
                      const isAvailable = !booking;

                      let bgColor = "bg-card";
                      if (booking) {
                        if (booking.status === "CANCELED") {
                          bgColor = "bg-destructive/20";
                        } else if (booking.notes) {
                          bgColor = "bg-blue-500/30";
                        } else {
                          bgColor = "bg-primary/20";
                        }
                      }

                      return (
                        <div
                          key={slot}
                          className={`${currentZoom.rowHeight} ${currentZoom.cellWidth} border-b cursor-pointer hover-elevate active-elevate-2 ${bgColor}`}
                          onClick={() => handleCellClick(hostess.id, dayStr, slot)}
                          data-testid={`slot-${hostess.id}-${dayStr}-${slot}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t p-3 bg-card">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-card border" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/20" />
            <span className="text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/30" />
            <span className="text-muted-foreground">With Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/20" />
            <span className="text-muted-foreground">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Quick Booking Modal */}
      <Dialog open={quickBookingOpen} onOpenChange={setQuickBookingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick Booking</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <QuickBookingForm
              hostessId={selectedSlot.hostessId}
              date={selectedSlot.date}
              startTime={selectedSlot.startTime}
              onSuccess={() => setQuickBookingOpen(false)}
              onCancel={() => setQuickBookingOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Booking Modal */}
      <Dialog open={editBookingOpen} onOpenChange={setEditBookingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>View and manage this booking</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="font-medium">{selectedBooking.client.email}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Hostess</div>
                  <div className="font-medium">{selectedBooking.hostess.displayName}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div className="font-medium">{format(new Date(selectedBooking.date), "MMM d, yyyy")}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Time</div>
                  <div className="font-medium">
                    {formatTimeRange(selectedBooking.startTime, selectedBooking.endTime)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Service</div>
                  <div className="font-medium">{selectedBooking.service.name}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={selectedBooking.status === "CANCELED" ? "destructive" : "default"}>
                    {selectedBooking.status}
                  </Badge>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="p-3 bg-muted rounded-md text-sm">{selectedBooking.notes}</div>
                </div>
              )}

              {selectedBooking.status !== "CANCELED" && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditBookingOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => cancelBookingMutation.mutate(selectedBooking.id)}
                    disabled={cancelBookingMutation.isPending}
                    data-testid="button-cancel-booking"
                  >
                    Cancel Booking
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
