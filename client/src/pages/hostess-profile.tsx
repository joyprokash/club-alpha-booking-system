import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, Clock, ArrowLeft } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { getCurrentDateToronto, getDayOfWeek } from "@/lib/time-utils";
import type { HostessWithSchedule, Service } from "@shared/schema";

export default function HostessProfile() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showBooking, setShowBooking] = useState(false);

  const { data: hostess, isLoading } = useQuery<HostessWithSchedule>({
    queryKey: [`/api/hostesses/${slug}`],
    enabled: !!slug,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const sortedServices = services?.slice().sort((a, b) => a.durationMin - b.durationMin) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto">
          <Card className="animate-pulse">
            <CardContent className="p-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-40 h-40 bg-muted rounded-full" />
                <div className="h-8 bg-muted rounded w-48" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hostess) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Hostess not found</p>
              <Button onClick={() => setLocation("/hostesses")} className="mt-4">
                Back to Hostesses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/hostesses")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hostesses
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="items-center pb-4">
                <Avatar className="w-40 h-40">
                  <AvatarImage src={hostess.photoUrl || undefined} alt={hostess.displayName} />
                  <AvatarFallback className="text-3xl">
                    {hostess.displayName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <h1 className="text-hostess-name font-semibold mb-2">
                    {hostess.displayName}
                  </h1>
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {hostess.location === "DOWNTOWN" ? "Downtown" : "West End"}
                  </Badge>
                </div>

                {hostess.bio && (
                  <div>
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-sm text-muted-foreground">{hostess.bio}</p>
                  </div>
                )}

                {hostess.specialties && hostess.specialties.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {hostess.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly Schedule */}
                {hostess.weeklySchedule && hostess.weeklySchedule.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Weekly Schedule</h3>
                    <div className="space-y-1 text-sm">
                      {hostess.weeklySchedule.map((schedule) => {
                        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                        return (
                          <div key={schedule.id} className="flex items-center gap-2">
                            <span className="font-medium w-12">{days[schedule.weekday]}:</span>
                            <span className="text-muted-foreground font-mono text-xs">
                              {schedule.startTime && schedule.endTime
                                ? `${Math.floor(schedule.startTime / 60)}:${(schedule.startTime % 60).toString().padStart(2, '0')}–${Math.floor(schedule.endTime / 60)}:${(schedule.endTime % 60).toString().padStart(2, '0')}`
                                : "Closed"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Section */}
          <div className="lg:col-span-2">
            {!showBooking ? (
              <Card>
                <CardHeader>
                  <CardTitle>Book an Appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Select a Date</h3>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="border rounded-md p-3"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Available Services</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sortedServices.map((service) => (
                        <Card key={service.id} className="hover-elevate">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {service.durationMin} minutes
                                </p>
                              </div>
                              <p className="font-semibold">
                                ${(service.priceCents / 100).toFixed(2)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setShowBooking(true)}
                    disabled={!selectedDate}
                    data-testid="button-continue-booking"
                  >
                    Continue to Booking
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <BookingForm
                hostessId={hostess.id}
                selectedDate={selectedDate}
                onCancel={() => setShowBooking(false)}
                onSuccess={() => {
                  setShowBooking(false);
                  setLocation("/bookings");
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
