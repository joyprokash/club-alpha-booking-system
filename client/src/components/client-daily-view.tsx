import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";
import type { Hostess, Booking } from "@shared/schema";

const SLOT_DURATION = 15;
const START_TIME = 10 * 60; // 10:00 in minutes
const END_TIME = 23 * 60; // 23:00 in minutes

interface ClientDailyViewProps {
  locationFilter: string;
}

export function ClientDailyView({ locationFilter }: ClientDailyViewProps) {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: hostesses } = useQuery<Hostess[]>({
    queryKey: locationFilter === "all" 
      ? ["/api/hostesses"]
      : ["/api/hostesses?location=" + locationFilter],
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: locationFilter === "all"
      ? [`/api/bookings/day?date=${dateStr}`]
      : [`/api/bookings/day?date=${dateStr}&location=${locationFilter}`],
  });

  const sortedHostesses = useMemo(() => 
    hostesses?.slice().sort((a, b) => 
      (a.displayName || "").localeCompare(b.displayName || "")
    ) || [],
    [hostesses]
  );

  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let time = START_TIME; time < END_TIME; time += SLOT_DURATION) {
      slots.push(time);
    }
    return slots;
  }, []);

  const formatTimeRange = (startMin: number, endMin: number): string => {
    const formatTime = (min: number) => {
      const hours = Math.floor(min / 60);
      const minutes = min % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    return `${formatTime(startMin)}-${formatTime(endMin)}`;
  };

  const isSlotBooked = (hostessId: string, slot: number): boolean => {
    if (!bookings) return false;
    return bookings.some(
      (b) =>
        b.hostessId === hostessId &&
        b.date === dateStr &&
        slot >= b.startTime &&
        slot < b.endTime
    );
  };

  const handleSlotClick = (hostessSlug: string, slot: number) => {
    // Navigate to hostess profile with pre-selected date and time
    const timeStr = formatTimeRange(slot, slot + SLOT_DURATION).split('-')[0];
    setLocation(`/hostess/${hostessSlug}?date=${dateStr}&time=${timeStr}`);
  };

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="flex items-center gap-4">
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-64 justify-start gap-2"
              data-testid="button-date-picker"
            >
              <CalendarIcon className="h-4 w-4" />
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setDatePickerOpen(false);
                }
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Calendar Grid */}
      {sortedHostesses.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-muted-foreground">
            No hostesses available in this location
          </div>
        </Card>
      ) : bookingsLoading ? (
        <Card>
          <div className="p-12 text-center text-muted-foreground">
            Loading availability...
          </div>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="flex overflow-x-auto">
            {/* Time Column */}
            <div className="w-20 flex-shrink-0 border-r bg-muted/30 sticky left-0 z-10">
              <div className="h-16 border-b bg-card" />
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className="h-12 border-b flex items-center justify-center text-xs text-muted-foreground font-mono"
                >
                  {formatTimeRange(slot, slot + SLOT_DURATION)}
                </div>
              ))}
            </div>

            {/* Hostess Columns */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex min-w-max">
                {sortedHostesses.map((hostess) => (
                  <div 
                    key={hostess.id} 
                    className="border-r flex-shrink-0"
                    style={{ width: '200px' }}
                  >
                    {/* Header */}
                    <div className="h-16 border-b bg-card flex items-center justify-between px-2 sticky top-0 z-10">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={hostess.photoUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {hostess.displayName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate font-medium">
                          {hostess.displayName}
                        </span>
                      </div>
                      {hostess.locations && hostess.locations.length > 0 && (
                        <div className="flex gap-0.5">
                          {hostess.locations.includes("DOWNTOWN") && (
                            <Badge variant="outline" className="text-xs h-5 px-1">D</Badge>
                          )}
                          {hostess.locations.includes("WEST_END") && (
                            <Badge variant="outline" className="text-xs h-5 px-1">W</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Slots */}
                    {timeSlots.map((slot) => {
                      const isBooked = isSlotBooked(hostess.id, slot);
                      
                      return (
                        <div
                          key={slot}
                          className={`h-12 border-b flex items-center justify-center text-xs cursor-pointer transition-colors
                            ${isBooked 
                              ? 'bg-primary/20 text-primary-foreground/70 cursor-not-allowed' 
                              : 'hover-elevate active-elevate-2'
                            }`}
                          onClick={() => !isBooked && handleSlotClick(hostess.slug, slot)}
                          data-testid={`slot-${hostess.slug}-${slot}`}
                        >
                          {isBooked ? (
                            <span className="font-medium">Booked</span>
                          ) : (
                            <span className="text-muted-foreground">Available</span>
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
      )}

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-card border" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/20" />
          <span className="text-muted-foreground">Booked</span>
        </div>
      </div>
    </div>
  );
}
