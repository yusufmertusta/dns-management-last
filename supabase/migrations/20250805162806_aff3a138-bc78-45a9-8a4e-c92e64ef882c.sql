-- Fix infinite recursion in RLS policies by creating security definer functions
-- First, create a function to get current user role without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create new policies using the security definer function
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR public.get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (
  auth.uid() = user_id OR public.get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR public.get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (
  public.get_current_user_role() = 'admin'::user_role
);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, plan, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'basic'::user_plan,
    'user'::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also update domains and dns_records policies to use the function
DROP POLICY IF EXISTS "Users can view their own domains" ON public.domains;
DROP POLICY IF EXISTS "Users can create their own domains" ON public.domains;
DROP POLICY IF EXISTS "Users can update their own domains" ON public.domains;
DROP POLICY IF EXISTS "Users can delete their own domains" ON public.domains;

CREATE POLICY "Users can view their own domains" ON public.domains
FOR SELECT USING (
  auth.uid() = user_id OR public.get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "Users can create their own domains" ON public.domains
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR public.get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "Users can update their own domains" ON public.domains
FOR UPDATE USING (
  auth.uid() = user_id OR public.get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "Users can delete their own domains" ON public.domains
FOR DELETE USING (
  auth.uid() = user_id OR public.get_current_user_role() = 'admin'::user_role
);

-- Update DNS records policies
DROP POLICY IF EXISTS "Users can view DNS records of their domains" ON public.dns_records;
DROP POLICY IF EXISTS "Users can create DNS records for their domains" ON public.dns_records;
DROP POLICY IF EXISTS "Users can update DNS records of their domains" ON public.dns_records;
DROP POLICY IF EXISTS "Users can delete DNS records of their domains" ON public.dns_records;

CREATE POLICY "Users can view DNS records of their domains" ON public.dns_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.domains 
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR public.get_current_user_role() = 'admin'::user_role)
  )
);

CREATE POLICY "Users can create DNS records for their domains" ON public.dns_records
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.domains 
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR public.get_current_user_role() = 'admin'::user_role)
  )
);

CREATE POLICY "Users can update DNS records of their domains" ON public.dns_records
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.domains 
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR public.get_current_user_role() = 'admin'::user_role)
  )
);

CREATE POLICY "Users can delete DNS records of their domains" ON public.dns_records
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.domains 
    WHERE domains.id = dns_records.domain_id 
    AND (domains.user_id = auth.uid() OR public.get_current_user_role() = 'admin'::user_role)
  )
);