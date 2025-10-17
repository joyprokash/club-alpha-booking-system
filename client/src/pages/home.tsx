import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { User, Calendar, Users, Lock } from "lucide-react";
import logoUrl from "@assets/club-alpha-badge (1)_1760718368973.png";

const loginCredentials = [
  {
    role: "ADMIN",
    icon: Lock,
    email: "admin@base44.com",
    password: "admin123",
    description: "Full platform access, analytics, user management",
    color: "text-red-500",
  },
  {
    role: "RECEPTION",
    icon: Calendar,
    email: "reception@base44.com",
    password: "reception123",
    description: "Calendar view, create bookings, manage schedules",
    color: "text-blue-500",
  },
  {
    role: "CLIENT",
    icon: User,
    email: "client1@example.com",
    password: "client123",
    description: "Browse hostesses, book appointments, view bookings",
    color: "text-purple-500",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col items-center text-center mb-12">
          <img src={logoUrl} alt="Club Alpha" className="h-24 w-24 mb-6" />
          <h1 className="text-4xl font-bold mb-3">Welcome to Club Alpha</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Multi-location hostess booking platform with role-based access control
          </p>
        </div>

        <Card className="mb-8 bg-card/50">
          <CardHeader>
            <CardTitle className="text-2xl">Demo Login Credentials</CardTitle>
            <CardDescription>
              Use any of the credentials below to explore the platform with different access levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loginCredentials.map((cred) => (
                <Card key={cred.role} className="hover-elevate">
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                    <div className={`p-2 rounded-lg bg-muted ${cred.color}`}>
                      <cred.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{cred.role}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {cred.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded" data-testid={`text-email-${cred.role.toLowerCase()}`}>
                        {cred.email}
                      </code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Password</span>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded" data-testid={`text-password-${cred.role.toLowerCase()}`}>
                        {cred.password}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => setLocation("/login")}
            data-testid="button-go-to-login"
          >
            Go to Login
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => setLocation("/hostesses")}
            data-testid="button-browse-hostesses"
          >
            Browse Hostesses
          </Button>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-6">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-sm text-muted-foreground">
                Real-time availability, double-booking prevention, 15-minute slots
              </p>
            </div>
            <div className="p-6">
              <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Multi-Location</h3>
              <p className="text-sm text-muted-foreground">
                Manage bookings across Downtown and West End locations
              </p>
            </div>
            <div className="p-6">
              <Lock className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Role-Based Access</h3>
              <p className="text-sm text-muted-foreground">
                Admin, Reception, Staff, and Client roles with tailored permissions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
