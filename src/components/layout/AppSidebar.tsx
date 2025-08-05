import { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Globe, 
  Settings, 
  Shield, 
  User,
  BarChart3
} from "lucide-react";

interface Profile {
  plan: string;
  role: string;
  full_name: string;
  email: string;
}

const navigation = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Domains", url: "/domains", icon: Globe },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminNavigation = [
  { title: "Admin Panel", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('plan, role, full_name, email')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setProfile(data);
        }
      }
    };

    fetchProfile();
  }, []);

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'max': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-sm">DNS Manager</h2>
              {profile && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={`text-xs ${getPlanColor(profile.plan)}`}>
                    {profile.plan.toUpperCase()}
                  </Badge>
                  {profile.role === 'admin' && (
                    <Badge variant="destructive" className="text-xs">
                      ADMIN
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {profile?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigation.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!collapsed && profile && (
          <div className="space-y-1">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}