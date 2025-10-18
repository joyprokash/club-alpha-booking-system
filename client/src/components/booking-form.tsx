import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateTimeSlots, minutesToTime, parseTimeToMinutes, GRID_START_TIME, GRID_END_TIME, SLOT_DURATION } from "@/lib/time-utils";
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      const service = sortedServices.find(s => s.id === value);
                      setSelectedService(service || null);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-service">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.durationMin} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Slot</FormLabel>
                  <div className="grid grid-cols-5 gap-2">
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
                          className="font-mono text-time-slot"
                          data-testid={`slot-${timeStr}`}
                        >
                          {timeStr}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
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

            <div className="flex gap-3">
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
