import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserFromToken } from "@/lib/api";
import { AuthForm } from "@/components/auth/AuthForm";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import dnsHero from "@/assets/dns-hero.jpg";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      const user = getUserFromToken();
      setUser(user);
      if (user) {
        navigate('/dashboard');
      }
      setLoading(false);
    };
    checkSession();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // If user is logged in but somehow still on index, redirect to dashboard
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Redirecting to dashboard...</h2>
      </div>
    </div>
  );
};

export default Index;
