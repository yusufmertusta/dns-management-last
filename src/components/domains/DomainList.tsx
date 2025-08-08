import { useState, useEffect } from "react";
import { getDomains, deleteDomain as apiDeleteDomain } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Globe, Settings, Trash2, BarChart3 } from "lucide-react";
import { AddDomainDialog } from "./AddDomainDialog";

interface Domain {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DomainListProps {
  onSelectDomain: (domain: Domain) => void;
  selectedDomain: Domain | null;
}

export const DomainList = ({ onSelectDomain, selectedDomain }: DomainListProps) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const fetchDomains = async () => {
    try {
      const data = await getDomains();
      setDomains(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch domains: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to delete this domain? This will also delete all DNS records.")) {
      return;
    }
    try {
      await apiDeleteDomain(domainId);
      toast({
        title: "Success",
        description: "Domain deleted successfully",
      });
      fetchDomains();
      if (selectedDomain?.id === domainId) {
        onSelectDomain(null as any);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete domain: " + error.message,
      });
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleDomainAdded = () => {
    fetchDomains();
    setShowAddDialog(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Domains</h2>
        <Button onClick={() => setShowAddDialog(true)} variant="dns">
          <Plus className="h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {domains.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No domains yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first domain
            </p>
            <Button onClick={() => setShowAddDialog(true)} variant="dns">
              <Plus className="h-4 w-4" />
              Add Your First Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <Card
              key={domain.id}
              className={`cursor-pointer transition-all hover:shadow-hover ${
                selectedDomain?.id === domain.id
                  ? "ring-2 ring-primary shadow-hover"
                  : ""
              }`}
              onClick={() => onSelectDomain(domain)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      {domain.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {domain.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={domain.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {domain.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(domain.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDomain(domain);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDomain(domain.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddDomainDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onDomainAdded={handleDomainAdded}
      />
    </div>
  );
};