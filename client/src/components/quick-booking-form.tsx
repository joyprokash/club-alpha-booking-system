import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { minutesToTime } from "@/lib/time-utils";
import { ChevronDown } from "lucide-react";
import type { User, Service } from "@shared/schema";

const quickBookingSchema = z.object({
  clientEmail: z.string().email("Invalid email"),
  serviceId: z.string().min(1, "Please select a service"),
  notes: z.string().optional(),
});

type QuickBookingFormData = z.infer<typeof quickBookingSchema>;

interface QuickBookingFormProps {
  hostessId: string;
  date: string;
  startTime: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuickBookingForm({ hostessId, date, startTime, onSuccess, onCancel }: QuickBookingFormProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allClients } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const sortedServices = services?.slice().sort((a, b) => a.durationMin - b.durationMin) || [];

  const filteredClients = allClients?.filter(client => 
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const createBookingMutation = useMutation({
    mutationFn: async (data: QuickBookingFormData) => {
      if (!selectedService) return;
      
      const endTime = startTime + selectedService.durationMin;

      return apiRequest("POST", "/api/bookings", {
        hostessId,
        clientEmail: data.clientEmail,
        serviceId: data.serviceId,
        date,
        startTime,
        endTime,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/range'] });
      toast({
        title: "Booking created",
        description: "Appointment scheduled successfully",
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

  const form = useForm<QuickBookingFormData>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: {
      clientEmail: "",
      serviceId: "",
      notes: "",
    },
  });

  const onSubmit = (data: QuickBookingFormData) => {
    createBookingMutation.mutate(data);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time</p>
            <p className="font-medium font-mono">{minutesToTime(startTime)}</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="clientEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Email</FormLabel>
              <FormControl>
                <div className="relative" ref={inputRef}>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="Search or enter client email..."
                      data-testid="input-client-email"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSearchQuery(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-clients"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto z-50">
                      {filteredClients.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
                          </div>
                          {filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-sm hover-elevate border-b last:border-b-0"
                              onClick={() => {
                                form.setValue("clientEmail", client.email, { shouldValidate: true });
                                setSearchQuery(client.email);
                                setDropdownOpen(false);
                              }}
                              data-testid={`button-client-${client.id}`}
                            >
                              <div className="font-medium">{client.email}</div>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                          {searchQuery ? (
                            <>
                              No clients found matching "{searchQuery}"
                              <div className="text-xs mt-1">Type a new email to create a booking</div>
                            </>
                          ) : (
                            "No clients yet"
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                      {service.name} ({service.durationMin} min) - ${(service.priceCents / 100).toFixed(2)}
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Special requests or notes..."
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
            data-testid="button-create-booking"
          >
            {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
