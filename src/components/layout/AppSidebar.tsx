import { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { getUserFromToken } from "@/lib/api";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  Settings, 
  BarChart3, 
  Users, 
  Database, 
  Crown,
  LogOut
} from "lucide-react";
import { logout } from "@/lib/api";

export const AppSidebar = () => {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const { isOpen } = useSidebar();

  useEffect(() => {
    const user = getUserFromToken();
    setUser(user);
  }, []);

  const handleSignOut = async () => {
    try {
      logout();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white text-sm font-bold">DNS</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">DNS Manager</h2>
            <p className="text-xs text-muted-foreground">Domain Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem asChild>
                <NavLink to="/dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem asChild>
                <NavLink to="/domains" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Domains
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem asChild>
                <NavLink to="/dns-records" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  DNS Records
                </NavLink>
              </SidebarMenuItem>
              {user?.isAdmin && (
                <SidebarMenuItem asChild>
                  <NavLink to="/admin" className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Admin Panel
                  </NavLink>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem asChild>
                <NavLink to="/profile" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Profile
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </NavLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-6 py-4">
        <div className="space-y-4">
          {user && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.email}</p>
                {user.isAdmin && (
                  <Badge variant="secondary" className="text-xs">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};