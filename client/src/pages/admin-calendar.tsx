import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, addDays } from "date-fns";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, MapPin, Clock, User, Mail, FileText, Calendar as CalendarIcon, ZoomIn, ZoomOut, LayoutGrid, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QuickBookingForm } from "@/components/quick-booking-form";
import { generateTimeSlots, minutesToTime, formatTimeRange, GRID_START_TIME, GRID_END_TIME, SLOT_DURATION, getCurrentDateToronto } from "@/lib/time-utils";
import type { Hostess, BookingWithDetails } from "@shared/schema";

type ZoomLevel = "compact" | "normal" | "comfortable";
type ViewMode = "daily" | "weekly";

export default function AdminCalendar() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("compact");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ hostessId: string; startX: number; startWidth: number } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    hostessId: string;
    date: string;
    startTime: number;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: hostesses } = useQuery<Hostess[]>({
    queryKey: locationFilter === "all"
      ? ["/api/hostesses"]
      : ["/api/hostesses?location=" + locationFilter],
  });

  // Daily bookings query
  const { data: bookings, isLoading: isLoadingDaily } = useQuery<BookingWithDetails[]>({
    queryKey: locationFilter === "all"
      ? [`/api/bookings/day?date=${dateStr}`]
      : [`/api/bookings/day?date=${dateStr}&location=${locationFilter}`],
    enabled: viewMode === "daily",
  });

  // Weekly bookings query
  const { data: weeklyBookings, isLoading: isLoadingWeekly } = useQuery<BookingWithDetails[]>({
    queryKey: ['/api/bookings/range', weekStartStr, weekEndStr, locationFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: weekStartStr,
        endDate: weekEndStr,
      });
      if (locationFilter !== "all") {
        params.append("location", locationFilter);
      }
      
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/bookings/range?${params}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch bookings");
      return response.json();
    },
    enabled: viewMode === "weekly",
  });

  const sortedHostesses = hostesses?.slice().sort((a, b) => 
    (a.displayName || "").localeCompare(b.displayName || "")
  ) || [];

  const timeSlots = generateTimeSlots(GRID_START_TIME, GRID_END_TIME, SLOT_DURATION);

  // Zoom level configurations
  const zoomConfig = {
    compact: {
      rowHeight: "h-6",
      headerHeight: "h-10",
      columnWidth: "w-32",
      avatarSize: "h-6 w-6",
      textSize: "text-xs",
      badgeHeight: "h-5",
    },
    normal: {
      rowHeight: "h-10",
      headerHeight: "h-14",
      columnWidth: "w-44",
      avatarSize: "h-8 w-8",
      textSize: "text-sm",
      badgeHeight: "h-6",
    },
    comfortable: {
      rowHeight: "h-14",
      headerHeight: "h-16",
      columnWidth: "w-56",
      avatarSize: "h-10 w-10",
      textSize: "text-base",
      badgeHeight: "h-7",
    },
  };

  const currentZoom = zoomConfig[zoomLevel];

  const getBookingAtSlot = (hostessId: string, startTime: number) => {
    return bookings?.find(
      (b) => b.hostessId === hostessId && b.startTime <= startTime && b.endTime > startTime
    );
  };

  // Get bookings for a specific hostess and day (weekly view)
  const getBookingsForDay = (hostessId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return weeklyBookings?.filter(
      b => b.hostessId === hostessId && b.date === dateStr
    ) || [];
  };

  const goToPreviousWeek = () => {
    setSelectedDate(prev => addWeeks(prev, -1));
  };

  const goToNextWeek = () => {
    setSelectedDate(prev => addWeeks(prev, 1));
  };

  const goToPreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const { toast } = useToast();

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/cancel`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/bookings');
        }
      });
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

  const handleCellClick = (hostessId: string, startTime: number) => {
    const booking = getBookingAtSlot(hostessId, startTime);
    if (!booking) {
      setSelectedSlot({ hostessId, date: dateStr, startTime });
      setQuickBookingOpen(true);
    } else {
      setSelectedBooking(booking);
      setEditBookingOpen(true);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, hostessId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[hostessId] || getDefaultColumnWidth();
    setResizing({ hostessId, startX: e.clientX, startWidth: currentWidth });
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizing) return;
    const delta = e.clientX - resizing.startX;
    const newWidth = Math.max(100, resizing.startWidth + delta);
    setColumnWidths(prev => ({ ...prev, [resizing.hostessId]: newWidth }));
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  const getDefaultColumnWidth = () => {
    const widthMap = { compact: 128, normal: 176, comfortable: 224 };
    return widthMap[zoomLevel];
  };

  const getColumnWidth = (hostessId: string) => {
    return columnWidths[hostessId] || getDefaultColumnWidth();
  };

  // Add mouse event listeners for resizing
  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-section-title font-semibold">
            {viewMode === "daily" ? "Daily Calendar" : "Weekly Calendar"}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={viewMode === "daily" ? goToPreviousDay : goToPreviousWeek}
              data-testid="button-calendar-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-32 text-center">
              {viewMode === "daily" 
                ? format(selectedDate, "MMM d, yyyy")
                : `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
              }
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={viewMode === "daily" ? goToNextDay : goToNextWeek}
              data-testid="button-calendar-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-40" data-testid="select-calendar-location">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="DOWNTOWN">Downtown</SelectItem>
              <SelectItem value="WEST_END">West End</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-booked" data-testid="legend-booked" />
              <span className="text-muted-foreground">Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-notes" data-testid="legend-notes" />
              <span className="text-muted-foreground">Notes Added</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-time-off" data-testid="legend-timeoff" />
              <span className="text-muted-foreground">Time Off</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "daily" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("daily")}
              data-testid="button-view-daily"
              className="h-7"
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              Daily
            </Button>
            <Button
              variant={viewMode === "weekly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("weekly")}
              data-testid="button-view-weekly"
              className="h-7"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              Weekly
            </Button>
          </div>

          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (zoomLevel === "normal") setZoomLevel("compact");
                if (zoomLevel === "comfortable") setZoomLevel("normal");
              }}
              disabled={zoomLevel === "compact"}
              data-testid="button-zoom-out"
              className="h-7 w-7"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 min-w-20 text-center" data-testid="text-zoom-level">
              {zoomLevel === "compact" && "Compact"}
              {zoomLevel === "normal" && "Normal"}
              {zoomLevel === "comfortable" && "Comfortable"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (zoomLevel === "compact") setZoomLevel("normal");
                if (zoomLevel === "normal") setZoomLevel("comfortable");
              }}
              disabled={zoomLevel === "comfortable"}
              data-testid="button-zoom-in"
              className="h-7 w-7"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="hidden"
          />
        </div>
      </div>

      {/* Grid */}
      {viewMode === "daily" ? (
        <div className="flex-1 overflow-auto relative">
          <div className="inline-flex">
            {/* Time Column */}
            <div className="w-20 flex-shrink-0 border-r bg-card sticky left-0 z-50 shadow-sm">
              <div className={`${currentZoom.headerHeight} border-b bg-card sticky top-0 z-50`} />
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className={`${currentZoom.rowHeight} border-b flex items-center justify-center text-time-label text-muted-foreground ${currentZoom.textSize}`}
                >
                  {formatTimeRange(slot, slot + SLOT_DURATION)}
                </div>
              ))}
            </div>

            {/* Hostess Columns */}
            {sortedHostesses.map((hostess) => (
                <div 
                  key={hostess.id} 
                  className="border-r flex-shrink-0 relative"
                  style={{ width: `${getColumnWidth(hostess.id)}px` }}
                >
                  {/* Header */}
                  <div className={`${currentZoom.headerHeight} border-b bg-card flex items-center justify-between px-2 sticky top-0 z-20 relative`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className={currentZoom.avatarSize}>
                        <AvatarImage src={hostess.photoUrl || undefined} />
                        <AvatarFallback className={currentZoom.textSize}>
                          {hostess.displayName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`${currentZoom.textSize} truncate font-medium`}>
                        {hostess.displayName}
                      </span>
                    </div>
                    {hostess.locations && hostess.locations.length > 0 && (
                      <div className="flex gap-0.5">
                        {hostess.locations.includes("DOWNTOWN") && (
                          <Badge variant="outline" className={`${currentZoom.textSize} ${currentZoom.badgeHeight} px-1`}>D</Badge>
                        )}
                        {hostess.locations.includes("WEST_END") && (
                          <Badge variant="outline" className={`${currentZoom.textSize} ${currentZoom.badgeHeight} px-1`}>W</Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Resize Handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-30"
                      onMouseDown={(e) => handleResizeStart(e, hostess.id)}
                      data-testid={`resize-handle-${hostess.id}`}
                    />
                  </div>

                  {/* Slots */}
                  {timeSlots.map((slot) => {
                    const booking = getBookingAtSlot(hostess.id, slot);
                    const isAvailable = !booking;
                    
                    // Determine cell color
                    let cellColor = "bg-card hover:bg-muted/30";
                    if (!isAvailable) {
                      if (booking.status === "CANCELED") {
                        cellColor = "bg-muted";
                      } else if (booking.notes && booking.notes.trim()) {
                        cellColor = "bg-notes"; // Green for bookings with notes
                      } else {
                        cellColor = "bg-booked"; // Blue for regular bookings
                      }
                    }

                    return (
                      <div
                        key={slot}
                        className={`${currentZoom.rowHeight} border-b cursor-pointer transition-colors ${cellColor}`}
                        onClick={() => handleCellClick(hostess.id, slot)}
                        data-testid={`cell-${hostess.id}-${slot}`}
                      >
                        {booking && (
                          <div className={`px-1 ${currentZoom.textSize} truncate text-white font-medium flex items-center h-full`}>
                            {booking.client.email.split('@')[0]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      ) : (
        // WEEKLY VIEW
        <div className="flex-1 overflow-auto p-4">
          {isLoadingWeekly ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading weekly schedule...</p>
            </div>
          ) : sortedHostesses.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No hostesses available</p>
            </div>
          ) : (
            <div className="overflow-auto border rounded-lg bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-card">
                    <th className="p-3 text-left font-semibold min-w-[150px] sticky left-0 z-20 bg-card border-r">
                      Hostess
                    </th>
                    {weekDays.map((day) => (
                      <th key={day.toISOString()} className="p-3 text-center font-semibold min-w-[140px] border-r">
                        <div className="text-sm">
                          {format(day, "EEE")}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {format(day, "MMM d")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedHostesses.map((hostess) => (
                    <tr key={hostess.id} className="border-b hover-elevate">
                      <td className="p-3 sticky left-0 z-10 bg-card border-r">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={hostess.photoUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {hostess.displayName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {hostess.displayName}
                            </div>
                            {hostess.locations && hostess.locations.length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {hostess.locations.includes("DOWNTOWN") && (
                                  <Badge variant="outline" className="text-xs h-4 px-1">D</Badge>
                                )}
                                {hostess.locations.includes("WEST_END") && (
                                  <Badge variant="outline" className="text-xs h-4 px-1">W</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const dayBookings = getBookingsForDay(hostess.id, day);
                        return (
                          <td key={day.toISOString()} className="p-2 border-r align-top">
                            {dayBookings.length > 0 ? (
                              <div className="space-y-1">
                                {dayBookings.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className={`rounded p-1.5 text-xs cursor-pointer transition-colors ${
                                      booking.status === "CANCELED" 
                                        ? "bg-muted border border-muted-foreground/20" 
                                        : booking.notes && booking.notes.trim()
                                        ? "bg-notes/20 border border-notes/30"
                                        : "bg-booked/20 border border-booked/30"
                                    }`}
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setEditBookingOpen(true);
                                    }}
                                    data-testid={`booking-${hostess.id}-${format(day, "yyyy-MM-dd")}-${booking.id}`}
                                  >
                                    <div className="font-semibold">
                                      {formatTimeRange(booking.startTime, booking.endTime)}
                                    </div>
                                    {booking.client && (
                                      <div className="text-muted-foreground mt-0.5 truncate">
                                        {booking.client.email.split('@')[0]}
                                      </div>
                                    )}
                                    {booking.service && (
                                      <div className="font-medium mt-0.5 truncate">
                                        {booking.service.name}
                                      </div>
                                    )}
                                    {booking.status === "CANCELED" && (
                                      <Badge variant="outline" className="text-xs mt-0.5">Canceled</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground text-center py-2">
                                -
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Client</span>
                  </div>
                  <div className="font-medium">{selectedBooking.client.email}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Hostess</span>
                  </div>
                  <div className="font-medium">{selectedBooking.hostess.displayName}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Date</span>
                  </div>
                  <div className="font-medium">{format(new Date(selectedBooking.date), "MMM d, yyyy")}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Time</span>
                  </div>
                  <div className="font-medium">
                    {formatTimeRange(selectedBooking.startTime, selectedBooking.endTime)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Service</span>
                  </div>
                  <div className="font-medium">{selectedBooking.service.name}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Location</span>
                  </div>
                  {selectedBooking.hostess.locations && selectedBooking.hostess.locations.length > 0 && (
                    <div className="font-medium">
                      {selectedBooking.hostess.locations.map((loc, idx) => (
                        <span key={idx}>
                          {loc === "DOWNTOWN" ? "Downtown" : "West End"}
                          {idx < selectedBooking.hostess.locations.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="p-3 bg-muted rounded-md text-sm">{selectedBooking.notes}</div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge variant={
                  selectedBooking.status === "CONFIRMED" ? "default" :
                  selectedBooking.status === "PENDING" ? "secondary" :
                  selectedBooking.status === "CANCELED" ? "destructive" :
                  "outline"
                }>
                  {selectedBooking.status}
                </Badge>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditBookingOpen(false)}
                  data-testid="button-close-booking"
                >
                  Close
                </Button>
                {selectedBooking.status !== "CANCELED" && (
                  <Button
                    variant="destructive"
                    onClick={() => cancelBookingMutation.mutate(selectedBooking.id)}
                    disabled={cancelBookingMutation.isPending}
                    data-testid="button-cancel-booking"
                  >
                    {cancelBookingMutation.isPending ? "Canceling..." : "Cancel Booking"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
