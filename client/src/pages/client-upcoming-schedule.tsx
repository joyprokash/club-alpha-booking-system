import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Phone, Info, ChevronLeft, ChevronRight, AlertCircle, MapPin, CalendarDays } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval } from "date-fns";
import type { UpcomingScheduleWithDetails } from "@shared/schema";

const SLOT_DURATION = 15; // minutes
const GRID_START = 10 * 60; // 10:00 AM in minutes
const GRID_END = 23 * 60; // 11:00 PM in minutes

type ViewMode = "daily" | "weekly";

function formatTimeRange(startMin: number, endMin: number): string {
  const formatTime = (min: number) => {
    const hours = Math.floor(min / 60);
    const minutes = min % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  return `${formatTime(startMin)}-${formatTime(endMin)}`;
}

export default function ClientUpcomingSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  // Daily view query
  const { data: scheduleData = [], isLoading, error } = useQuery<UpcomingScheduleWithDetails[]>({
    queryKey: ["/api/upcoming-schedule", dateStr],
    queryFn: async () => {
      const response = await fetch(`/api/upcoming-schedule?startDate=${dateStr}&endDate=${dateStr}`);
      if (!response.ok) throw new Error("Failed to fetch schedule");
      return response.json();
    },
    enabled: viewMode === "daily",
  });

  // Weekly view query
  const { data: weeklyScheduleData = [], isLoading: isLoadingWeekly, error: errorWeekly } = useQuery<UpcomingScheduleWithDetails[]>({
    queryKey: ["/api/upcoming-schedule", "weekly", weekStartStr, weekEndStr],
    queryFn: async () => {
      const response = await fetch(`/api/upcoming-schedule?startDate=${weekStartStr}&endDate=${weekEndStr}`);
      if (!response.ok) throw new Error("Failed to fetch schedule");
      return response.json();
    },
    enabled: viewMode === "weekly",
  });

  // Filter schedule by location (daily)
  const filteredScheduleData = selectedLocation === "all" 
    ? scheduleData 
    : scheduleData.filter(s => s.hostess.locations?.includes(selectedLocation));

  // Filter schedule by location (weekly)
  const filteredWeeklyScheduleData = selectedLocation === "all" 
    ? weeklyScheduleData 
    : weeklyScheduleData.filter(s => s.hostess.locations?.includes(selectedLocation));

  // Get unique hostesses for this day (filtered by location)
  const hostesses = Array.from(
    new Set(filteredScheduleData.map(s => s.hostessId))
  ).map(id => {
    const schedule = filteredScheduleData.find(s => s.hostessId === id);
    return schedule?.hostess;
  }).filter(Boolean);

  // Get unique hostesses for the week (filtered by location)
  const weeklyHostesses = Array.from(
    new Set(filteredWeeklyScheduleData.map(s => s.hostessId))
  ).map(id => {
    const schedule = filteredWeeklyScheduleData.find(s => s.hostessId === id);
    return schedule?.hostess;
  }).filter(Boolean);

  // Get days of the week
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Create time slots
  const timeSlots: number[] = [];
  for (let time = GRID_START; time < GRID_END; time += SLOT_DURATION) {
    timeSlots.push(time);
  }

  const goToPreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const goToPreviousWeek = () => {
    setSelectedDate(prev => addWeeks(prev, -1));
  };

  const goToNextWeek = () => {
    setSelectedDate(prev => addWeeks(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get schedule for a specific hostess and time (daily)
  const getScheduleAtTime = (hostessId: string, time: number) => {
    return filteredScheduleData.find(
      s => s.hostessId === hostessId && time >= s.startTime && time < s.endTime
    );
  };

  // Get schedules for a specific hostess and day (weekly)
  const getSchedulesForDay = (hostessId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredWeeklyScheduleData.filter(
      s => s.hostessId === hostessId && s.date === dateStr
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Upcoming Schedule Preview
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Preview next week's schedule. To book, please call Club Alpha.
        </p>
      </div>

      {/* Booking Notice */}
      <Alert className="mb-6 border-primary/50 bg-primary/5">
        <Phone className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>This is a preview schedule only.</strong> You cannot book appointments through the app for these dates. 
          Please call Club Alpha to reserve your preferred time slot.
        </AlertDescription>
      </Alert>

      {/* View Mode and Location Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* View Mode Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "daily" ? "default" : "outline"}
                  onClick={() => setViewMode("daily")}
                  data-testid="button-view-daily"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Daily
                </Button>
                <Button
                  variant={viewMode === "weekly" ? "default" : "outline"}
                  onClick={() => setViewMode("weekly")}
                  data-testid="button-view-weekly"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Weekly
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div className="flex gap-2">
                <Button
                  variant={selectedLocation === "all" ? "default" : "outline"}
                  onClick={() => setSelectedLocation("all")}
                  data-testid="button-location-all"
                >
                  All Locations
                </Button>
                <Button
                  variant={selectedLocation === "DOWNTOWN" ? "default" : "outline"}
                  onClick={() => setSelectedLocation("DOWNTOWN")}
                  data-testid="button-location-downtown"
                >
                  Downtown
                </Button>
                <Button
                  variant={selectedLocation === "WEST_END" ? "default" : "outline"}
                  onClick={() => setSelectedLocation("WEST_END")}
                  data-testid="button-location-westend"
                >
                  West End
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={viewMode === "daily" ? goToPreviousDay : goToPreviousWeek}
              data-testid={viewMode === "daily" ? "button-previous-day" : "button-previous-week"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-2xl font-bold" data-testid="text-selected-date">
                  {viewMode === "daily" 
                    ? format(selectedDate, "EEEE, MMMM d, yyyy")
                    : `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
                  }
                </h2>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goToToday}
                data-testid="button-today"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={viewMode === "daily" ? goToNextDay : goToNextWeek}
                data-testid={viewMode === "daily" ? "button-next-day" : "button-next-week"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      {viewMode === "daily" ? (
        // DAILY VIEW
        error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load upcoming schedule. Please try again later or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading schedule...</p>
            </CardContent>
          </Card>
        ) : hostesses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Schedule Available</h3>
            <p className="text-muted-foreground">
              The schedule for this date hasn't been published yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-auto border rounded-lg">
          <div className="inline-flex min-w-full">
            {/* Time Column */}
            <div className="w-20 flex-shrink-0 border-r bg-card sticky left-0 z-50 shadow-sm">
              <div className="h-16 border-b bg-card sticky top-0 z-50" />
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className="h-12 border-b flex items-center justify-center text-sm text-muted-foreground font-mono"
                >
                  {formatTimeRange(slot, slot + SLOT_DURATION)}
                </div>
              ))}
            </div>

            {/* Hostess Columns */}
            {hostesses.map((hostess) => (
              <div 
                key={hostess!.id} 
                className="border-r flex-shrink-0 min-w-[200px]"
              >
                {/* Header */}
                <div className="h-16 border-b bg-card flex items-center justify-between px-3 sticky top-0 z-20">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={hostess!.photoUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {hostess!.displayName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate font-medium">
                      {hostess!.displayName}
                    </span>
                  </div>
                  {hostess!.locations && hostess!.locations.length > 0 && (
                    <div className="flex gap-0.5">
                      {hostess!.locations.includes("DOWNTOWN") && (
                        <Badge variant="outline" className="text-xs h-5 px-1">D</Badge>
                      )}
                      {hostess!.locations.includes("WEST_END") && (
                        <Badge variant="outline" className="text-xs h-5 px-1">W</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Time Slots */}
                {timeSlots.map((slot) => {
                  const schedule = getScheduleAtTime(hostess!.id, slot);
                  const isFirstSlot = schedule && slot === schedule.startTime;
                  const slotsCount = schedule 
                    ? Math.ceil((schedule.endTime - schedule.startTime) / SLOT_DURATION)
                    : 0;

                  // Only render content on the first slot
                  if (schedule && !isFirstSlot) {
                    return <div key={slot} className="h-12 border-b" />;
                  }

                  return (
                    <div key={slot} className="h-12 border-b relative">
                      {isFirstSlot && (
                        <div 
                          className="absolute inset-0 bg-blue-500/20 border-l-2 border-blue-500 p-1 overflow-hidden"
                          style={{ height: `${slotsCount * 48}px` }}
                        >
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">
                            {formatTimeRange(schedule.startTime, schedule.endTime)}
                          </div>
                          {schedule.service && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                              {schedule.service.name}
                            </div>
                          )}
                          {schedule.notes && (
                            <div className="text-xs text-muted-foreground italic">
                              {schedule.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        )
      ) : (
        // WEEKLY VIEW
        errorWeekly ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load upcoming schedule. Please try again later or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        ) : isLoadingWeekly ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading schedule...</p>
            </CardContent>
          </Card>
        ) : weeklyHostesses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Schedule Available</h3>
              <p className="text-muted-foreground">
                The schedule for this week hasn't been published yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-auto border rounded-lg">
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
                      <div className="text-xs text-muted-foreground">
                        {format(day, "MMM d")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklyHostesses.map((hostess) => (
                  <tr key={hostess!.id} className="border-b hover-elevate">
                    <td className="p-3 sticky left-0 z-10 bg-card border-r">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={hostess!.photoUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {hostess!.displayName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {hostess!.displayName}
                          </div>
                          {hostess!.locations && hostess!.locations.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {hostess!.locations.includes("DOWNTOWN") && (
                                <Badge variant="outline" className="text-xs h-4 px-1">D</Badge>
                              )}
                              {hostess!.locations.includes("WEST_END") && (
                                <Badge variant="outline" className="text-xs h-4 px-1">W</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const daySchedules = getSchedulesForDay(hostess!.id, day);
                      return (
                        <td key={day.toISOString()} className="p-2 border-r align-top">
                          {daySchedules.length > 0 ? (
                            <div className="space-y-1">
                              {daySchedules.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="bg-blue-500/20 border border-blue-500/30 rounded p-1.5 text-xs"
                                  data-testid={`schedule-${hostess!.id}-${format(day, "yyyy-MM-dd")}`}
                                >
                                  <div className="font-semibold text-blue-700 dark:text-blue-300">
                                    {formatTimeRange(schedule.startTime, schedule.endTime)}
                                  </div>
                                  {schedule.service && (
                                    <div className="text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                      {schedule.service.name}
                                    </div>
                                  )}
                                  {schedule.notes && (
                                    <div className="text-muted-foreground italic mt-0.5">
                                      {schedule.notes}
                                    </div>
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
        )
      )}

      {/* Footer Info */}
      {(viewMode === "daily" ? hostesses.length > 0 : weeklyHostesses.length > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              How to Book
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a preview of the upcoming schedule. To book any of the available time slots shown above, 
              please contact Club Alpha directly by phone. Our staff will confirm your appointment and provide 
              any additional information you may need.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
