import { supabase } from "@/integrations/supabase/client";

export const createUserProfile = async (user: any) => {
  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile;
  }

  // Create new profile if it doesn't exist
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      plan: 'basic',
      role: 'user'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    // Don't throw error if profile already exists
    if (error.code !== '23505') {
      throw error;
    }
  }

  return data;
};