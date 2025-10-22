import { Calendar, Users, Settings, LayoutDashboard, UserCog, Clock, FileUp, FileDown, LogOut, BarChart3, ImageIcon, UserCircle, CalendarClock } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/club-alpha-badge (1)_1760718368973.png";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const adminItems = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Calendar",
      url: "/admin/calendar",
      icon: Calendar,
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: BarChart3,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: UserCog,
    },
    {
      title: "Clients",
      url: "/admin/clients",
      icon: UserCircle,
    },
    {
      title: "Hostesses",
      url: "/admin/hostesses",
      icon: Users,
    },
    {
      title: "Import Hostesses",
      url: "/admin/hostess-import",
      icon: FileUp,
    },
    {
      title: "Import Clients",
      url: "/admin/client-import",
      icon: FileUp,
    },
    {
      title: "Services",
      url: "/admin/services",
      icon: Settings,
    },
    {
      title: "Photo Approvals",
      url: "/admin/photo-approvals",
      icon: ImageIcon,
    },
    {
      title: "Upcoming Schedule",
      url: "/admin/upcoming-schedule",
      icon: CalendarClock,
    },
    {
      title: "Import Schedule",
      url: "/admin/import",
      icon: FileUp,
    },
    {
      title: "Export Schedule",
      url: "/admin/export",
      icon: FileDown,
    },
  ];

  const receptionItems = [
    {
      title: "Dashboard",
      url: "/reception/calendar",
      icon: LayoutDashboard,
    },
    {
      title: "Daily Calendar",
      url: "/admin/calendar",
      icon: Calendar,
    },
    {
      title: "Browse Hostesses",
      url: "/hostesses",
      icon: Users,
    },
    {
      title: "Manage Hostesses",
      url: "/admin/hostesses",
      icon: Settings,
    },
    {
      title: "Clients",
      url: "/admin/clients",
      icon: UserCircle,
    },
    {
      title: "Photo Approvals",
      url: "/admin/photo-approvals",
      icon: ImageIcon,
    },
    {
      title: "Upcoming Schedule",
      url: "/admin/upcoming-schedule",
      icon: CalendarClock,
    },
    {
      title: "Import Schedule",
      url: "/admin/import",
      icon: FileUp,
    },
    {
      title: "Export Schedule",
      url: "/admin/export",
      icon: FileDown,
    },
  ];

  const staffItems = [
    {
      title: "Dashboard",
      url: "/staff/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "My Schedule",
      url: "/staff/schedule",
      icon: Calendar,
    },
  ];

  const clientItems = [
    {
      title: "Find Hostess",
      url: "/hostesses",
      icon: Users,
    },
    {
      title: "My Bookings",
      url: "/bookings",
      icon: Calendar,
    },
    {
      title: "Upcoming Schedule",
      url: "/upcoming-schedule",
      icon: CalendarClock,
    },
  ];

  const getMenuItems = () => {
    if (!user) return clientItems;
    switch (user.role) {
      case "ADMIN":
        return adminItems;
      case "RECEPTION":
        return receptionItems;
      case "STAFF":
        return staffItems;
      default:
        return clientItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Club Alpha" className="h-10 w-10" />
          <div>
            <h2 className="font-semibold text-lg">Club Alpha</h2>
            <p className="text-xs text-muted-foreground">Booking Platform</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <button onClick={() => setLocation(item.url)}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {user && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button 
                  onClick={async () => {
                    await logout();
                    window.location.href = "/";
                  }} 
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
