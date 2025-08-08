import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Globe, Crown } from "lucide-react";

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

interface Domain {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'domains'>('users');
  const { toast } = useToast();

  useEffect(() => {
    // For now, we'll show a placeholder since admin endpoints need to be implemented
    setLoading(false);
    toast({
      title: "Admin Panel",
      description: "Admin functionality will be implemented with backend endpoints.",
    });
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Crown className="h-8 w-8" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Manage users and domains
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Features</CardTitle>
          <CardDescription>
            Admin functionality will be implemented with backend API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>User Management</span>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <span>Domain Management</span>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};