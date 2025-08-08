import { useState } from "react";
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

export const Domains = () => {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Domains</h1>
        <p className="text-muted-foreground">
          Manage your domains and DNS records
        </p>
      </div>
      
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
    </div>
  );
};