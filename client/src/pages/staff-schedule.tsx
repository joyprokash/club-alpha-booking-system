import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, parse, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { formatTimeRange, getCurrentDateToronto } from "@/lib/time-utils";
import type { BookingWithDetails, Hostess, WeeklySchedule } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

const APP_TIMEZONE = "America/Toronto";

export default function StaffScheduleWeekly() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => {
    const now = toZonedTime(new Date(), APP_TIMEZONE);
    return startOfWeek(now, { weekStartsOn: 0 }); // Sunday
  });

  const today = getCurrentDateToronto();
  const todayDate = parse(today, "yyyy-MM-dd", new Date());

  // Get staff's linked hostess
  const { data: linkedHostess } = useQuery<Hostess>({
    queryKey: ["/api/staff/hostess"],
  });

  // Get all upcoming bookings
  const { data: allBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/staff/bookings/upcoming"],
    enabled: !!linkedHostess,
  });

  // Get weekly schedule
  const { data: weeklySchedule = [] } = useQuery<WeeklySchedule[]>({
    queryKey: ["/api/staff/weekly-schedule"],
    enabled: !!linkedHostess,
  });

  if (!linkedHostess) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
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

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));

  const getDaySchedule = (weekday: number) => {
    return weeklySchedule.find(s => s.weekday === weekday);
  };

  const getDayBookings = (date: string) => {
    return allBookings.filter((b: BookingWithDetails) => b.date === date);
  };

  const getDayColor = (date: Date) => {
    const isToday = isSameDay(date, todayDate);
    if (isToday) return "purple";
    
    const weekday = date.getDay();
    const schedule = getDaySchedule(weekday);
    if (schedule && schedule.startTime && schedule.endTime) {
      return "green";
    }
    return "gray";
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">My Schedule</h1>
          <p className="text-lg text-muted-foreground">Your weekly appointment schedule</p>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousWeek}
                className="gap-2"
                data-testid="button-prev-week"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Week
              </Button>

              <div className="text-center">
                <p className="text-2xl font-bold">
                  {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={goToNextWeek}
                className="gap-2"
                data-testid="button-next-week"
              >
                Next Week
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily Breakdown */}
        <div className="space-y-4">
          {weekDays.map((date, index) => {
            const weekday = date.getDay();
            const dateStr = format(date, "yyyy-MM-dd");
            const daySchedule = getDaySchedule(weekday);
            const dayBookings = getDayBookings(dateStr);
            const isToday = isSameDay(date, todayDate);
            const color = getDayColor(date);
            const hasWorkingHours = daySchedule && daySchedule.startTime && daySchedule.endTime;

            const borderColorClass = {
              purple: "border-purple-500",
              green: "border-green-500",
              gray: "border-gray-300 dark:border-gray-700"
            }[color];

            const dotColorClass = {
              purple: "bg-purple-500",
              green: "bg-green-500",
              gray: "bg-gray-400"
            }[color];

            return (
              <Card
                key={index}
                className={`${borderColorClass} ${isToday ? "border-2" : ""}`}
                data-testid={`day-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${dotColorClass}`} />
                      <div>
                        <h3 className="text-xl font-bold">
                          {format(date, "EEEE, MMMM d")}
                        </h3>
                      </div>
                      {isToday && (
                        <Badge
                          className="bg-purple-500 text-white"
                          data-testid="badge-today"
                        >
                          Today
                        </Badge>
                      )}
                    </div>

                    {hasWorkingHours && (
                      <Badge variant="outline" className="text-sm">
                        {formatTimeRange(daySchedule.startTime, daySchedule.endTime)}
                      </Badge>
                    )}
                  </div>

                  {!hasWorkingHours ? (
                    <div className="py-12 text-center text-muted-foreground">
                      Day Off
                    </div>
                  ) : dayBookings.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      No appointments or time off scheduled
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayBookings.map((booking: BookingWithDetails) => (
                        <div
                          key={booking.id}
                          className="p-4 rounded-md border bg-card hover-elevate"
                          data-testid={`booking-${booking.id}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline">
                                  {formatTimeRange(booking.startTime, booking.endTime)}
                                </Badge>
                                <Badge variant="default" className="bg-purple-500">
                                  {booking.service?.name}
                                </Badge>
                              </div>
                              <p className="font-medium">{booking.client?.email || "Client"}</p>
                              {booking.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{booking.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
