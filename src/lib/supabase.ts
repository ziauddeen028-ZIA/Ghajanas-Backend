import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseServerClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { url, serviceRoleKey } = config.supabase;

  if (!url || !serviceRoleKey) {
    console.warn(
      '⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in backend environment variables. Token verification will fail until valid credentials are provided.'
    );
  }

  // Fallback to empty string for initial developer setup before .env is populated
  supabaseClient = createClient(
    url || 'https://placeholder.supabase.co',
    serviceRoleKey || 'placeholder_service_role_key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return supabaseClient;
};

