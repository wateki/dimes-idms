import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { config } from '@/config/env';

const supabaseUrl = config.SUPABASE_URL;
const supabaseAnonKey = config.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
  // Fallback or throw an error to prevent app from crashing
  // For now, we'll create a dummy client or throw
  throw new Error('Supabase environment variables are not set.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Optional: Add helper functions for auth if needed
export const getSupabaseSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting Supabase session:', error);
    return null;
  }
  return data.session;
};

export const getSupabaseUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting Supabase user:', error);
    return null;
  }
  return data.user;
};

