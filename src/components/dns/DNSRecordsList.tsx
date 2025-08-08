import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Globe, Database } from "lucide-react";
import { AddDNSRecordDialog } from "./AddDNSRecordDialog";
import { EditDNSRecordDialog } from "./EditDNSRecordDialog";
import { getDNSRecords, deleteDNSRecord } from "@/lib/api";

interface DNSRecord {
  id: string;
  name: string;
  type: string;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
  created_at: string;
  updated_at: string;
}

interface Domain {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface DNSRecordsListProps {
  domain: Domain;
}

export const DNSRecordsList = ({ domain }: DNSRecordsListProps) => {
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null);
  const { toast } = useToast();

  const fetchRecords = async () => {
    try {
      const data = await getDNSRecords(domain.id);
      setRecords(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch DNS records: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this DNS record?")) {
      return;
    }
    try {
      await deleteDNSRecord(recordId);
      toast({
        title: "Success",
        description: "DNS record deleted successfully",
      });
      fetchRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete DNS record: " + error.message,
      });
    }
  };

  const handleEditRecord = (record: DNSRecord) => {
    setEditingRecord(record);
    setShowEditDialog(true);
  };

  const handleRecordUpdated = () => {
    fetchRecords();
    setShowEditDialog(false);
    setEditingRecord(null);
  };

  const handleRecordAdded = () => {
    fetchRecords();
    setShowAddDialog(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [domain.id]);

  const getRecordTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      A: "bg-blue-500",
      AAAA: "bg-blue-600",
      CNAME: "bg-green-500",
      MX: "bg-purple-500",
      TXT: "bg-orange-500",
      NS: "bg-red-500",
      PTR: "bg-pink-500",
      SRV: "bg-indigo-500",
      SOA: "bg-gray-500",
    };
    return colors[type] || "bg-gray-400";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            DNS Records for {domain.name}
          </h2>
          <p className="text-muted-foreground">
            Manage DNS records for your domain
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} variant="dns">
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>

      {records.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No DNS records yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first DNS record to get started
            </p>
            <Button onClick={() => setShowAddDialog(true)} variant="dns">
              <Plus className="h-4 w-4" />
              Add Your First Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <Card key={record.id} className="hover:shadow-hover transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge
                        className={`${getRecordTypeColor(record.type)} text-white`}
                      >
                        {record.type}
                      </Badge>
                      {record.name}
                    </CardTitle>
                    <CardDescription className="text-base font-mono bg-muted p-2 rounded mt-2">
                      {record.value}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRecord(record)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecord(record.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>TTL: {record.ttl}s</span>
                    {record.priority && <span>Priority: {record.priority}</span>}
                    {record.weight && <span>Weight: {record.weight}</span>}
                    {record.port && <span>Port: {record.port}</span>}
                  </div>
                  <div>
                    Updated: {new Date(record.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddDNSRecordDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        domain={domain}
        onRecordAdded={handleRecordAdded}
      />

      {editingRecord && (
        <EditDNSRecordDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          domain={domain}
          record={editingRecord}
          onRecordUpdated={handleRecordUpdated}
        />
      )}
    </div>
  );
};