-- Create user plan enum
CREATE TYPE public.user_plan AS ENUM ('basic', 'pro', 'max');

-- Create user role enum  
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  plan user_plan NOT NULL DEFAULT 'basic',
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update domains table to reference profiles
ALTER TABLE public.domains 
ALTER COLUMN user_id SET NOT NULL;

-- Update RLS policies for domains to work with admin access
DROP POLICY IF EXISTS "Users can view their own domains" ON public.domains;
DROP POLICY IF EXISTS "Users can create their own domains" ON public.domains;
DROP POLICY IF EXISTS "Users can update their own domains" ON public.domains;
DROP POLICY IF EXISTS "Users can delete their own domains" ON public.domains;

CREATE POLICY "Users can view their own domains"
ON public.domains
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can create their own domains"
ON public.domains
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can update their own domains"
ON public.domains
FOR UPDATE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can delete their own domains"
ON public.domains
FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update DNS records policies for admin access
DROP POLICY IF EXISTS "Users can view DNS records of their domains" ON public.dns_records;
DROP POLICY IF EXISTS "Users can create DNS records for their domains" ON public.dns_records;
DROP POLICY IF EXISTS "Users can update DNS records of their domains" ON public.dns_records;
DROP POLICY IF EXISTS "Users can delete DNS records of their domains" ON public.dns_records;

CREATE POLICY "Users can view DNS records of their domains"
ON public.dns_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.domains
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE user_id = auth.uid() AND role = 'admin'
         ))
  )
);

CREATE POLICY "Users can create DNS records for their domains"
ON public.dns_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.domains
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE user_id = auth.uid() AND role = 'admin'
         ))
  )
);

CREATE POLICY "Users can update DNS records of their domains"
ON public.dns_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.domains
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE user_id = auth.uid() AND role = 'admin'
         ))
  )
);

CREATE POLICY "Users can delete DNS records of their domains"
ON public.dns_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.domains
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE user_id = auth.uid() AND role = 'admin'
         ))
  )
);

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user stats
CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id uuid DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  check_user_id UUID;
BEGIN
  -- If no target_user_id provided, use current user
  IF target_user_id IS NULL THEN
    check_user_id := auth.uid();
  ELSE
    check_user_id := target_user_id;
  END IF;
  
  -- Check if current user can access the stats (own stats or admin)
  IF check_user_id != auth.uid() AND 
     NOT EXISTS (
       SELECT 1 FROM public.profiles 
       WHERE user_id = auth.uid() AND role = 'admin'
     ) THEN
    RETURN '{"error": "Access denied"}'::JSON;
  END IF;
  
  SELECT json_build_object(
    'total_domains', COUNT(DISTINCT d.id),
    'total_dns_records', COUNT(dr.id),
    'domains_by_status', json_object_agg(
      COALESCE(d.status, 'unknown'), 
      COUNT(DISTINCT d.id)
    ) FILTER (WHERE d.id IS NOT NULL)
  ) INTO result
  FROM domains d
  LEFT JOIN dns_records dr ON d.id = dr.domain_id
  WHERE d.user_id = check_user_id;
  
  RETURN result;
END;
$$;

-- Create function to get system stats (admin only)
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN '{"error": "Access denied"}'::JSON;
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_domains', (SELECT COUNT(*) FROM public.domains),
    'total_dns_records', (SELECT COUNT(*) FROM public.dns_records),
    'users_by_plan', (
      SELECT json_object_agg(plan, count)
      FROM (
        SELECT plan, COUNT(*) as count
        FROM public.profiles
        GROUP BY plan
      ) plan_counts
    ),
    'recent_users', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'email', email,
          'full_name', full_name,
          'plan', plan,
          'created_at', created_at
        )
      )
      FROM (
        SELECT * FROM public.profiles
        ORDER BY created_at DESC
        LIMIT 5
      ) recent
    )
  ) INTO result;
  
  RETURN result;
END;
$$;