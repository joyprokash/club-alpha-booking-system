import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

// Auth pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";

// Client pages
import Hostesses from "@/pages/hostesses";
import HostessProfile from "@/pages/hostess-profile";
import MyBookings from "@/pages/my-bookings";

// Admin pages
import AdminDashboard from "@/pages/admin-dashboard";
import AdminCalendar from "@/pages/admin-calendar";
import AdminServices from "@/pages/admin-services";

// Shared
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.forcePasswordReset) {
    return <Redirect to="/reset-password" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!user) return "/hostesses";
    
    switch (user.role) {
      case "ADMIN":
        return "/admin/dashboard";
      case "RECEPTION":
        return "/reception/calendar";
      case "STAFF":
        return "/staff/schedule";
      default:
        return "/hostesses";
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  const needsSidebar = user && ["/admin", "/reception", "/staff"].some(path => 
    window.location.pathname.startsWith(path)
  );

  if (needsSidebar) {
    return (
      <SidebarProvider style={sidebarStyle}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-3 border-b bg-card">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto">
              <Switch>
                <Route path="/">
                  <Redirect to={getDefaultRoute()} />
                </Route>
                
                {/* Admin routes */}
                <Route path="/admin/dashboard">
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                </Route>
                <Route path="/admin/calendar">
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AdminCalendar />
                  </ProtectedRoute>
                </Route>
                <Route path="/admin/services">
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AdminServices />
                  </ProtectedRoute>
                </Route>

                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password">
        <ProtectedRoute>
          <ResetPassword />
        </ProtectedRoute>
      </Route>

      {/* Client routes */}
      <Route path="/hostesses" component={Hostesses} />
      <Route path="/hostess/:slug" component={HostessProfile} />
      <Route path="/bookings">
        <ProtectedRoute>
          <MyBookings />
        </ProtectedRoute>
      </Route>

      {/* Default redirect */}
      <Route path="/">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <Redirect to={getDefaultRoute()} />
        )}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AuthProvider>
            <AppRouter />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
