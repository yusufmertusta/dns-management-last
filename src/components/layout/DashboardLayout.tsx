import { useState, useEffect } from "react";
import { getUserFromToken, logout } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Settings } from "lucide-react";
import { DomainList } from "@/components/domains/DomainList";
import { DNSRecordsList } from "@/components/dns/DNSRecordsList";

interface Domain {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const DashboardLayout = () => {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card shadow-elegant border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                DNS Manager
              </h1>
              {selectedDomain && (
                <span className="ml-4 text-muted-foreground">
                  / {selectedDomain.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {user?.email}
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Domains Sidebar */}
          <div className="lg:col-span-1">
            <DomainList
              onSelectDomain={setSelectedDomain}
              selectedDomain={selectedDomain}
            />
          </div>

          {/* DNS Records Main Content */}
          <div className="lg:col-span-2">
            {selectedDomain ? (
              <DNSRecordsList domain={selectedDomain} />
            ) : (
              <div className="bg-card rounded-lg shadow-elegant p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Select a Domain</h2>
                <p className="text-muted-foreground">
                  Choose a domain from the sidebar to manage its DNS records
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};