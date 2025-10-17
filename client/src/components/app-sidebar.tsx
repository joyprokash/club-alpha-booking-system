import { Calendar, Users, Settings, LayoutDashboard, UserCog, Clock, FileUp, FileDown, LogOut } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

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
      title: "Users",
      url: "/admin/users",
      icon: UserCog,
    },
    {
      title: "Hostesses",
      url: "/admin/hostesses",
      icon: Users,
    },
    {
      title: "Services",
      url: "/admin/services",
      icon: Settings,
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
      url: "/reception/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Calendar",
      url: "/reception/calendar",
      icon: Calendar,
    },
    {
      title: "Time Off",
      url: "/reception/timeoff",
      icon: Clock,
    },
    {
      title: "Export Schedule",
      url: "/reception/export",
      icon: FileDown,
    },
  ];

  const staffItems = [
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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Base44 Booking</SidebarGroupLabel>
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
                <button onClick={() => logout()} data-testid="button-logout">
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
