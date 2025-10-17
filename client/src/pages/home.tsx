import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, Lock } from "lucide-react";
import logoUrl from "@assets/club-alpha-badge (1)_1760718368973.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

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
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      
      if (result?.requiresPasswordReset) {
        setLocation("/reset-password");
      } else {
        const userRole = result?.user?.role || result?.role;
        switch (userRole) {
          case "ADMIN":
            setLocation("/admin/dashboard");
            break;
          case "RECEPTION":
            setLocation("/admin/calendar");
            break;
          case "STAFF":
            setLocation("/staff/schedule");
            break;
          case "CLIENT":
          default:
            setLocation("/hostesses");
            break;
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logoUrl} alt="Club Alpha" className="h-24 w-24 mb-6" />
          <h1 className="text-4xl font-bold mb-3">Welcome to Club Alpha</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Multi-location hostess booking platform with role-based access control
          </p>
        </div>

        <div className="max-w-md mx-auto mb-12">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <span>Don't have an account? </span>
                <button
                  onClick={() => setLocation("/register")}
                  className="text-primary hover:underline"
                  data-testid="link-register"
                >
                  Register
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 bg-card/50">
          <CardHeader>
            <CardTitle className="text-2xl">Demo Login Credentials</CardTitle>
            <CardDescription>
              Use any of the credentials below to explore the platform with different access levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="flex justify-center mb-8">
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => setLocation("/hostesses")}
            data-testid="button-browse-hostesses"
          >
            Browse Hostesses Without Login
          </Button>
        </div>
      </div>
    </div>
  );
}
