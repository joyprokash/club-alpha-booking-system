import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, CalendarX, User } from "lucide-react";
import { formatTimeRange, getCurrentDateToronto, getTomorrowDateToronto } from "@/lib/time-utils";
import type { BookingWithDetails, Hostess, TimeOff, WeeklySchedule } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

export default function StaffDashboard() {
  const { user } = useAuth();
  const today = getCurrentDateToronto();
  const tomorrow = getTomorrowDateToronto();

  // Get staff's linked hostess
  const { data: linkedHostess } = useQuery<Hostess>({
    queryKey: ["/api/staff/hostess"],
  });

  // Get today's bookings
  const { data: todayBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/staff/bookings/today"],
    enabled: !!linkedHostess,
  });

  // Get tomorrow's bookings
  const { data: tomorrowBookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/staff/bookings/tomorrow"],
    enabled: !!linkedHostess,
  });

  // Get today's time off
  const { data: todayTimeOff = [] } = useQuery<TimeOff[]>({
    queryKey: ["/api/staff/time-off/today"],
    enabled: !!linkedHostess,
  });

  // Get upcoming bookings
  const { data: upcomingBookings = [] } = useQuery<BookingWithDetails[]>({
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
        <div className="max-w-7xl mx-auto">
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

  const firstName = linkedHostess.displayName.split(' ')[0];
  const workingDays = weeklySchedule.filter(s => s.startTime && s.endTime).map(s => s.weekday);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome back, {firstName}!</h1>
          <p className="text-lg text-muted-foreground">Your personal Club Alpha staff dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today's Appointments */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-80" />
              <div className="text-5xl font-bold mb-2">{todayBookings.length}</div>
              <div className="text-lg font-medium">Your Appointments Today</div>
            </CardContent>
          </Card>

          {/* Tomorrow's Bookings */}
          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 border-0 text-white">
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-80" />
              <div className="text-5xl font-bold mb-2">{tomorrowBookings.length}</div>
              <div className="text-lg font-medium">Tomorrow's Bookings</div>
            </CardContent>
          </Card>

          {/* Today's Time Off */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
            <CardContent className="p-6 text-center">
              <CalendarX className="h-12 w-12 mx-auto mb-4 opacity-80" />
              <div className="text-5xl font-bold mb-2">{todayTimeOff.length}</div>
              <div className="text-lg font-medium">Today's Time Off</div>
            </CardContent>
          </Card>
        </div>

        {/* Profile and Today's Schedule Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-500" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={linkedHostess.photoUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-purple-500 text-white">
                    {linkedHostess.displayName.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{linkedHostess.displayName}</h3>
                  <p className="text-muted-foreground">
                    {linkedHostess.location === "DOWNTOWN" ? "Downtown" : "West End"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Working Days:</h4>
                <div className="flex gap-2 flex-wrap">
                  {dayNames.map((day, index) => {
                    const isWorkingDay = workingDays.includes(index);
                    return (
                      <Badge
                        key={day}
                        variant={isWorkingDay ? "default" : "outline"}
                        className={isWorkingDay ? "bg-purple-500" : ""}
                        data-testid={`badge-${day.toLowerCase()}`}
                      >
                        {day}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Schedule Today */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                Your Schedule Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayBookings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No appointments scheduled for today
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.map((booking: BookingWithDetails) => (
                    <div
                      key={booking.id}
                      className="p-4 rounded-md border bg-card hover-elevate"
                      data-testid={`booking-${booking.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{booking.client?.email || "Client"}</p>
                          <p className="text-sm text-muted-foreground">{booking.service?.name}</p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          {formatTimeRange(booking.startTime, booking.endTime)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              Your Upcoming Appointments
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">All your scheduled appointments</p>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No upcoming appointments
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking: BookingWithDetails) => (
                  <div
                    key={booking.id}
                    className="p-4 rounded-md border bg-card hover-elevate"
                    data-testid={`upcoming-booking-${booking.id}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">{booking.date}</Badge>
                          <Badge variant="outline">{formatTimeRange(booking.startTime, booking.endTime)}</Badge>
                        </div>
                        <p className="font-medium">{booking.client?.email || "Client"}</p>
                        <p className="text-sm text-muted-foreground">{booking.service?.name}</p>
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
