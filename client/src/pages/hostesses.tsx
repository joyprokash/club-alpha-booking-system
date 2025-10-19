import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, LayoutGrid, Calendar, LogOut, Search } from "lucide-react";
import { ClientDailyView } from "@/components/client-daily-view";
import { useAuth } from "@/lib/auth-context";
import { Footer } from "@/components/footer";
import type { Hostess } from "@shared/schema";

type ViewMode = "gallery" | "daily";

export default function Hostesses() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: hostesses, isLoading } = useQuery<Hostess[]>({
    queryKey: locationFilter === "all" 
      ? ["/api/hostesses"]
      : ["/api/hostesses?location=" + locationFilter],
  });

  // Filter and sort hostesses
  const filteredAndSortedHostesses = hostesses
    ?.filter((hostess) => 
      hostess.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => 
      (a.displayName || "").localeCompare(b.displayName || "")
    ) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto p-8 w-full">
        <div className="mb-8">
          <h1 className="text-hero font-bold mb-2">Find Your Perfect Time</h1>
          <p className="text-body-large text-muted-foreground">
            Browse our talented hostesses and book your appointment
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search hostesses by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-hostess"
            />
          </div>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-48" data-testid="select-location-filter">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="DOWNTOWN">Downtown</SelectItem>
              <SelectItem value="WEST_END">West End</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "gallery" ? "default" : "outline"}
              size="default"
              onClick={() => setViewMode("gallery")}
              className="gap-2"
              data-testid="button-view-gallery"
            >
              <LayoutGrid className="h-4 w-4" />
              Gallery
            </Button>
            <Button
              variant={viewMode === "daily" ? "default" : "outline"}
              size="default"
              onClick={() => setViewMode("daily")}
              className="gap-2"
              data-testid="button-view-daily"
            >
              <Calendar className="h-4 w-4" />
              Daily
            </Button>
          </div>

          {user && (
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                logout();
                setLocation("/login");
              }}
              className="gap-2 ml-auto"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>

        {viewMode === "daily" ? (
          <ClientDailyView locationFilter={locationFilter} />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="items-center">
                  <div className="w-32 h-32 bg-muted rounded-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedHostesses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              {searchQuery 
                ? `No hostesses found matching "${searchQuery}"`
                : "No hostesses available in this location"
              }
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredAndSortedHostesses.map((hostess) => (
              <Card 
                key={hostess.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setLocation(`/hostess/${hostess.slug}`)}
                data-testid={`card-hostess-${hostess.slug}`}
              >
                <CardHeader className="items-center pb-4">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={hostess.photoUrl || undefined} alt={hostess.displayName} />
                    <AvatarFallback className="text-2xl">
                      {hostess.displayName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </CardHeader>
                <CardContent className="text-center space-y-3">
                  <h3 className="text-hostess-name font-semibold">{hostess.displayName}</h3>
                  
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {hostess.location === "DOWNTOWN" ? "Downtown" : "West End"}
                  </Badge>

                  {hostess.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {hostess.bio}
                    </p>
                  )}

                  {hostess.specialties && hostess.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {hostess.specialties.slice(0, 3).map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button className="w-full mt-4" data-testid={`button-view-${hostess.slug}`}>
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
