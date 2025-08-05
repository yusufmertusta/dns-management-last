-- Drop triggers first, then function, then recreate with secure search path
DROP TRIGGER IF EXISTS update_domains_updated_at ON public.domains;
DROP TRIGGER IF EXISTS update_dns_records_updated_at ON public.dns_records;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.get_domain_stats(UUID);

-- Create function to update timestamps with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create a function to get domain statistics with secure search path
CREATE OR REPLACE FUNCTION public.get_domain_stats(domain_uuid UUID)
RETURNS JSON 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
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
  FROM dns_records
  WHERE domain_id = domain_uuid;
  
  RETURN result;
END;
$$;

-- Recreate triggers for automatic timestamp updates
CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dns_records_updated_at
  BEFORE UPDATE ON public.dns_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();