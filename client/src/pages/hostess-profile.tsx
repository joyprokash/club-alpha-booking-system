import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Clock, ArrowLeft, DollarSign, CheckCircle2 } from "lucide-react";
import { getCurrentDateToronto, getDayOfWeek, generateTimeSlots, minutesToTime, parseTimeToMinutes, GRID_START_TIME, GRID_END_TIME, SLOT_DURATION } from "@/lib/time-utils";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { HostessWithSchedule, Service } from "@shared/schema";

const bookingFormSchema = z.object({
  serviceId: z.string().min(1, "Please select a service"),
  startTime: z.string().min(1, "Please select a time slot"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function HostessProfile() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const { data: hostess, isLoading } = useQuery<HostessWithSchedule>({
    queryKey: [`/api/hostesses/${slug}`],
    enabled: !!slug,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const sortedServices = services?.slice().sort((a, b) => a.durationMin - b.durationMin) || [];

  // Fetch available slots for the selected date
  const { data: availability } = useQuery({
    queryKey: ["/api/bookings/availability", hostess?.id, selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""],
    queryFn: async () => {
      if (!selectedDate || !hostess) return { bookedSlots: [] };
      
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `/api/bookings/availability?hostessId=${hostess.id}&date=${format(selectedDate, "yyyy-MM-dd")}`;
      const res = await fetch(url, { headers, credentials: "include" });
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      
      return await res.json();
    },
    enabled: !!selectedDate && !!hostess,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      if (!selectedDate || !selectedService || !hostess) return;
      
      const startMinutes = parseTimeToMinutes(data.startTime);
      const endMinutes = startMinutes + selectedService.durationMin;

      return apiRequest("POST", "/api/bookings", {
        hostessId: hostess.id,
        serviceId: data.serviceId,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: startMinutes,
        endTime: endMinutes,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.refetchQueries({ queryKey: ["/api/bookings/my"] });
      toast({
        title: "Booking created",
        description: "Your appointment has been scheduled successfully",
      });
      setLocation("/bookings");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Booking failed",
        description: error.message || "Could not create booking",
      });
    },
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceId: "",
      startTime: "",
      notes: "",
    },
  });

  const onSubmit = (data: BookingFormData) => {
    createBookingMutation.mutate(data);
  };

  const availableSlots = generateTimeSlots(GRID_START_TIME, GRID_END_TIME, SLOT_DURATION);
  const bookedSlots = availability?.bookedSlots || [];

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <div className="max-w-6xl mx-auto p-8">
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

            {/* Booking Flow - Single Page */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Book an Appointment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Step 1: Select a Date */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                          1
                        </div>
                        <h3 className="text-lg font-semibold">Select a Date</h3>
                      </div>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          // Clear time selection when date changes to prevent stale/invalid slot bookings
                          form.setValue("startTime", "");
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="border rounded-md p-3"
                        data-testid="calendar-date-picker"
                      />
                    </div>

                    {/* Step 2: Choose Your Service */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                          selectedDate 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          2
                        </div>
                        <h3 className="text-lg font-semibold">Choose Your Service</h3>
                      </div>

                      {!selectedDate ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                          <p className="text-muted-foreground">
                            Please select a date first to view available services
                          </p>
                        </div>
                      ) : (
                        <RadioGroup
                          onValueChange={(value) => {
                            form.setValue("serviceId", value);
                            const service = sortedServices.find(s => s.id === value);
                            setSelectedService(service || null);
                            form.setValue("startTime", ""); // Reset time when service changes
                          }}
                          value={form.watch("serviceId")}
                          className="grid grid-cols-1 md:grid-cols-2 gap-3"
                        >
                          {sortedServices.map((service) => {
                            const isSelected = form.watch("serviceId") === service.id;
                            return (
                              <div key={service.id} className="relative">
                                <RadioGroupItem
                                  value={service.id}
                                  id={`service-${service.id}`}
                                  className="peer sr-only"
                                  data-testid={`radio-service-${service.id}`}
                                />
                                <Label
                                  htmlFor={`service-${service.id}`}
                                  className="cursor-pointer block peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 rounded-md"
                                  data-testid={`service-card-${service.id}`}
                                >
                                  <Card
                                    className={`transition-all hover-elevate active-elevate-2 ${
                                      isSelected 
                                        ? 'border-primary border-2 bg-primary/5' 
                                        : ''
                                    }`}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                                            {service.name}
                                            {isSelected && (
                                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                            )}
                                          </h4>
                                          <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Clock className="h-4 w-4 flex-shrink-0" />
                                              <span className="font-mono">{service.durationMin} minutes</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <DollarSign className="h-4 w-4 flex-shrink-0 text-primary" />
                                              <span className="text-lg font-bold text-primary">
                                                ${(service.priceCents / 100).toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      )}
                      {form.formState.errors.serviceId && (
                        <p className="text-sm text-destructive mt-2">
                          {form.formState.errors.serviceId.message}
                        </p>
                      )}
                    </div>

                    {/* Step 3: Pick Available Time */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                          selectedService 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          3
                        </div>
                        <h3 className="text-lg font-semibold">Select a Time</h3>
                        {selectedService && (
                          <Badge variant="secondary" className="ml-auto">
                            {selectedService.durationMin} min session
                          </Badge>
                        )}
                      </div>

                      {!selectedService ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                          <p className="text-muted-foreground">
                            Please select a service first to view available time slots
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                          {availableSlots.map((slot) => {
                            const timeStr = minutesToTime(slot);
                            const isBooked = bookedSlots.includes(slot);
                            const isSelected = form.watch("startTime") === timeStr;

                            return (
                              <Button
                                key={slot}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                disabled={isBooked}
                                onClick={() => form.setValue("startTime", timeStr)}
                                className="font-mono"
                                data-testid={`slot-${timeStr}`}
                              >
                                {timeStr}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      {form.formState.errors.startTime && (
                        <p className="text-sm text-destructive mt-2">
                          {form.formState.errors.startTime.message}
                        </p>
                      )}
                    </div>

                    {/* Step 4: Add Notes (Optional) */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                          form.watch("notes") 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          4
                        </div>
                        <h3 className="text-lg font-semibold">
                          Add Notes <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                        </h3>
                      </div>
                      <Textarea
                        placeholder="Any special requests or preferences..."
                        data-testid="input-notes"
                        {...form.register("notes")}
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={createBookingMutation.isPending || !selectedDate || !selectedService || !form.watch("startTime")}
                        data-testid="button-confirm-booking"
                      >
                        {createBookingMutation.isPending ? "Booking..." : "Confirm Booking"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
