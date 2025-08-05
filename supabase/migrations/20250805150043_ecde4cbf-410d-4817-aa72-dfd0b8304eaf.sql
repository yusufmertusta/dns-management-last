-- Create domains table
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT domains_name_check CHECK (name ~ '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$')
);

-- Create DNS records table
CREATE TABLE public.dns_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV', 'SOA')),
  value TEXT NOT NULL,
  ttl INTEGER DEFAULT 300 CHECK (ttl >= 60 AND ttl <= 86400),
  priority INTEGER DEFAULT NULL CHECK (priority IS NULL OR (priority >= 0 AND priority <= 65535)),
  weight INTEGER DEFAULT NULL CHECK (weight IS NULL OR (weight >= 0 AND weight <= 65535)),
  port INTEGER DEFAULT NULL CHECK (port IS NULL OR (port >= 1 AND port <= 65535)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_domains_user_id ON public.domains(user_id);
CREATE INDEX idx_domains_name ON public.domains(name);
CREATE INDEX idx_dns_records_domain_id ON public.dns_records(domain_id);
CREATE INDEX idx_dns_records_type ON public.dns_records(type);
CREATE INDEX idx_dns_records_name ON public.dns_records(name);

-- Enable Row Level Security
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dns_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for domains
CREATE POLICY "Users can view their own domains" 
ON public.domains 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own domains" 
ON public.domains 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains" 
ON public.domains 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains" 
ON public.domains 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for DNS records
CREATE POLICY "Users can view DNS records of their domains" 
ON public.dns_records 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.domains 
  WHERE id = dns_records.domain_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can create DNS records for their domains" 
ON public.dns_records 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.domains 
  WHERE id = dns_records.domain_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can update DNS records of their domains" 
ON public.dns_records 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.domains 
  WHERE id = dns_records.domain_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can delete DNS records of their domains" 
ON public.dns_records 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.domains 
  WHERE id = dns_records.domain_id 
  AND user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dns_records_updated_at
  BEFORE UPDATE ON public.dns_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to get domain statistics
CREATE OR REPLACE FUNCTION public.get_domain_stats(domain_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_records', COUNT(*),
    'a_records', COUNT(*) FILTER (WHERE type = 'A'),
    'aaaa_records', COUNT(*) FILTER (WHERE type = 'AAAA'),
    'cname_records', COUNT(*) FILTER (WHERE type = 'CNAME'),
    'mx_records', COUNT(*) FILTER (WHERE type = 'MX'),
    'txt_records', COUNT(*) FILTER (WHERE type = 'TXT'),
    'ns_records', COUNT(*) FILTER (WHERE type = 'NS'),
    'other_records', COUNT(*) FILTER (WHERE type NOT IN ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'))
  ) INTO result
  FROM public.dns_records
  WHERE domain_id = domain_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;