import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateTimeSlots, minutesToTime, parseTimeToMinutes, GRID_START_TIME, GRID_END_TIME, SLOT_DURATION } from "@/lib/time-utils";
import { Clock, DollarSign, CheckCircle2 } from "lucide-react";
import type { Service } from "@shared/schema";

const bookingFormSchema = z.object({
  serviceId: z.string().min(1, "Please select a service"),
  startTime: z.string().min(1, "Please select a time slot"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  hostessId: string;
  selectedDate: Date | undefined;
  onCancel: () => void;
  onSuccess: () => void;
}

export function BookingForm({ hostessId, selectedDate, onCancel, onSuccess }: BookingFormProps) {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const sortedServices = services?.slice().sort((a, b) => a.durationMin - b.durationMin) || [];

  // Fetch available slots for the selected date
  const { data: availability } = useQuery({
    queryKey: ["/api/bookings/availability", hostessId, selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""],
    queryFn: async () => {
      if (!selectedDate) return { bookedSlots: [] };
      
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `/api/bookings/availability?hostessId=${hostessId}&date=${format(selectedDate, "yyyy-MM-dd")}`;
      const res = await fetch(url, { headers, credentials: "include" });
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      
      return await res.json();
    },
    enabled: !!selectedDate,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      if (!selectedDate || !selectedService) return;
      
      const startMinutes = parseTimeToMinutes(data.startTime);
      const endMinutes = startMinutes + selectedService.durationMin;

      return apiRequest("POST", "/api/bookings", {
        hostessId,
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
      onSuccess();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Booking</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Step 1: Service Selection */}
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      1
                    </div>
                    <FormLabel className="text-lg font-semibold m-0">Choose Your Service</FormLabel>
                  </div>
                  
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        const service = sortedServices.find(s => s.id === value);
                        setSelectedService(service || null);
                      }}
                      value={field.value}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      {sortedServices.map((service) => {
                        const isSelected = field.value === service.id;
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Step 2: Time Slot Selection */}
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                      selectedService 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      2
                    </div>
                    <FormLabel className="text-lg font-semibold m-0">Select a Time</FormLabel>
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
                        const isSelected = field.value === timeStr;

                        return (
                          <Button
                            key={slot}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            disabled={isBooked}
                            onClick={() => field.onChange(timeStr)}
                            className="font-mono"
                            data-testid={`slot-${timeStr}`}
                          >
                            {timeStr}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Step 3: Notes (Optional) */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                      field.value 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      3
                    </div>
                    <FormLabel className="text-lg font-semibold m-0">
                      Add Notes <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requests or preferences..."
                      data-testid="input-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createBookingMutation.isPending}
                data-testid="button-confirm-booking"
              >
                {createBookingMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
