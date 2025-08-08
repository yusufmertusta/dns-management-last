import { useState } from "react";
import { updateDNSRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Domain {
  id: string;
  name: string;
}

interface DNSRecord {
  id: string;
  name: string;
  type: string;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
}

interface EditDNSRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: Domain;
  record: DNSRecord;
  onRecordUpdated: () => void;
}

const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'];

export const EditDNSRecordDialog = ({ open, onOpenChange, domain, record, onRecordUpdated }: EditDNSRecordDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: record.name,
    type: record.type,
    value: record.value,
    ttl: record.ttl,
    priority: record.priority?.toString() || '',
    weight: record.weight?.toString() || '',
    port: record.port?.toString() || '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const recordData: any = {
        name: formData.name.trim(),
        type: formData.type,
        value: formData.value.trim(),
        ttl: formData.ttl,
      };

      // Add optional fields for MX and SRV records
      if (formData.type === 'MX' && formData.priority) {
        recordData.priority = parseInt(formData.priority);
      }
      
      if (formData.type === 'SRV') {
        if (formData.priority) recordData.priority = parseInt(formData.priority);
        if (formData.weight) recordData.weight = parseInt(formData.weight);
        if (formData.port) recordData.port = parseInt(formData.port);
      }

      await updateDNSRecord(record.id, recordData);

      toast({
        title: "Success",
        description: "DNS record updated successfully",
      });

      onRecordUpdated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const showPriority = formData.type === 'MX' || formData.type === 'SRV';
  const showWeight = formData.type === 'SRV';
  const showPort = formData.type === 'SRV';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit DNS Record</DialogTitle>
          <DialogDescription>
            Update DNS record for {domain.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="www, @, mail, etc."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DNS_RECORD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                placeholder="Enter the record value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ttl">TTL (seconds)</Label>
                <Input
                  id="ttl"
                  type="number"
                  min="60"
                  max="86400"
                  value={formData.ttl}
                  onChange={(e) => setFormData(prev => ({ ...prev, ttl: parseInt(e.target.value) || 300 }))}
                />
              </div>
              {showPriority && (
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="65535"
                    placeholder="10"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {showWeight && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    max="65535"
                    placeholder="5"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
                {showPort && (
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      min="1"
                      max="65535"
                      placeholder="80"
                      value={formData.port}
                      onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name || !formData.type || !formData.value}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};