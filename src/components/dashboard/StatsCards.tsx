import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Settings, BarChart3, Users } from "lucide-react";

interface UserStats {
  total_domains: number;
  total_dns_records: number;
  domains_by_status: Record<string, number>;
}

interface SystemStats {
  total_users: number;
  total_domains: number;
  total_dns_records: number;
  users_by_plan: Record<string, number>;
}

export const StatsCards = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch user stats
      const { data: userStatsData } = await supabase.rpc('get_user_stats');
      if (userStatsData && typeof userStatsData === 'object' && !Array.isArray(userStatsData)) {
        setUserStats(userStatsData as unknown as UserStats);
      }

      // Check if user is admin and fetch system stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
        const { data: systemStatsData } = await supabase.rpc('get_system_stats');
        if (systemStatsData && typeof systemStatsData === 'object' && !Array.isArray(systemStatsData)) {
          setSystemStats(systemStatsData as unknown as SystemStats);
        }
      }
    };

    fetchStats();
  }, []);

  const userStatsCards = [
    {
      title: "Total Domains",
      value: userStats?.total_domains || 0,
      icon: Globe,
      description: "Domains you manage"
    },
    {
      title: "DNS Records",
      value: userStats?.total_dns_records || 0,
      icon: Settings,
      description: "Total DNS records"
    },
    {
      title: "Active Domains",
      value: userStats?.domains_by_status?.active || 0,
      icon: BarChart3,
      description: "Currently active"
    }
  ];

  const systemStatsCards = [
    {
      title: "Total Users",
      value: systemStats?.total_users || 0,
      icon: Users,
      description: "Registered users"
    },
    {
      title: "All Domains",
      value: systemStats?.total_domains || 0,
      icon: Globe,
      description: "System-wide domains"
    },
    {
      title: "All DNS Records",
      value: systemStats?.total_dns_records || 0,
      icon: Settings,
      description: "System-wide records"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userStatsCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && systemStats && (
        <div>
          <h3 className="text-lg font-semibold mb-4">System Statistics</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemStatsCards.map((card, index) => (
              <Card key={index} className="border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <card.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {systemStats.users_by_plan && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Users by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(systemStats.users_by_plan).map(([plan, count]) => (
                    <div key={plan} className="flex justify-between">
                      <span className="capitalize">{plan}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};