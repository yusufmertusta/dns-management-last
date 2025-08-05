import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Crown } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  plan: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setProfile(data);
          setFullName(data.full_name || "");
        }
        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load profile",
          });
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [toast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setUpdating(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('user_id', profile.user_id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setProfile(prev => prev ? { ...prev, full_name: fullName } : null);
    }
    
    setUpdating(false);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'max': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    className="pl-10"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <Button type="submit" disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              Your current plan and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Plan:</span>
              <Badge className={getPlanColor(profile.plan)}>
                {profile.plan.toUpperCase()}
              </Badge>
            </div>

            {profile.role === 'admin' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Role:</span>
                <Badge variant="destructive">
                  ADMIN
                </Badge>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};