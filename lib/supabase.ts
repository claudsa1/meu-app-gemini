import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper to get the supabase client safely
export const getSupabase = (): SupabaseClient | null => {
  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
    return null;
  }
  
  // Use service key if available for backend operations (bypasses RLS)
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable.');
    return null;
  }
  
  try {
    return createClient(supabaseUrl, key);
  } catch (err: any) {
    console.error('Error creating Supabase client:', err.message);
    return null;
  }
};

// Export a singleton instance that might be null if not configured
export const supabase = getSupabase();
