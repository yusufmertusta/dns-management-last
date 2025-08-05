-- Fix security warnings for functions
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';