-- Fix function search path security issues
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