import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { QuickBookingForm } from "@/components/quick-booking-form";
import { generateTimeSlots, minutesToTime, formatTimeRange, GRID_START_TIME, GRID_END_TIME, SLOT_DURATION, getCurrentDateToronto } from "@/lib/time-utils";
import type { Hostess, BookingWithDetails } from "@shared/schema";

export default function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    hostessId: string;
    date: string;
    startTime: number;
  } | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: hostesses } = useQuery<Hostess[]>({
    queryKey: locationFilter === "all"
      ? ["/api/hostesses"]
      : ["/api/hostesses?location=" + locationFilter],
  });

  const { data: bookings } = useQuery<BookingWithDetails[]>({
    queryKey: locationFilter === "all"
      ? [`/api/bookings/day?date=${dateStr}`]
      : [`/api/bookings/day?date=${dateStr}&location=${locationFilter}`],
  });

  const sortedHostesses = hostesses?.slice().sort((a, b) => 
    (a.displayName || "").localeCompare(b.displayName || "")
  ) || [];

  const timeSlots = generateTimeSlots(GRID_START_TIME, GRID_END_TIME, SLOT_DURATION);

  const getBookingAtSlot = (hostessId: string, startTime: number) => {
    return bookings?.find(
      (b) => b.hostessId === hostessId && b.startTime <= startTime && b.endTime > startTime
    );
  };

  const handleCellClick = (hostessId: string, startTime: number) => {
    const booking = getBookingAtSlot(hostessId, startTime);
    if (!booking) {
      setSelectedSlot({ hostessId, date: dateStr, startTime });
      setQuickBookingOpen(true);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-section-title font-semibold">Daily Calendar</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
              }}
              data-testid="button-calendar-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-32 text-center">
              {format(selectedDate, "MMM d, yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}
              data-testid="button-calendar-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="hidden"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Time Column */}
          <div className="w-20 flex-shrink-0 border-r bg-muted/30 sticky left-0 z-30">
            <div className="h-14 border-b bg-card" />
            {timeSlots.map((slot) => (
              <div
                key={slot}
                className="h-12 border-b flex items-center justify-center text-time-label text-muted-foreground"
              >
                {formatTimeRange(slot, slot + SLOT_DURATION)}
              </div>
            ))}
          </div>

          {/* Hostess Columns */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max">
              {sortedHostesses.map((hostess) => (
                <div key={hostess.id} className="w-52 border-r flex-shrink-0">
                  {/* Header */}
                  <div className="h-14 border-b bg-card flex items-center justify-between px-3 sticky top-0 z-20">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={hostess.photoUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {hostess.displayName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-grid-header truncate">
                        {hostess.displayName}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {hostess.location === "DOWNTOWN" ? "D" : "W"}
                    </Badge>
                  </div>

                  {/* Slots */}
                  {timeSlots.map((slot) => {
                    const booking = getBookingAtSlot(hostess.id, slot);
                    const isAvailable = !booking;

                    return (
                      <div
                        key={slot}
                        className={`h-12 border-b cursor-pointer transition-colors ${
                          isAvailable
                            ? "bg-card hover:bg-muted/30"
                            : booking.status === "CONFIRMED" || booking.status === "PENDING"
                            ? "bg-booked"
                            : "bg-muted"
                        }`}
                        onClick={() => handleCellClick(hostess.id, slot)}
                        data-testid={`cell-${hostess.id}-${slot}`}
                      >
                        {booking && (
                          <div className="p-1 text-xs truncate text-white font-medium">
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
    </div>
  );
}
