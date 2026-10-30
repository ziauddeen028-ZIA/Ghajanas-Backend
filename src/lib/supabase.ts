import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseServerClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { url, serviceRoleKey } = config.supabase;

  // DIAGNOSTIC — remove after confirming admin auth works
  console.log('[SUPABASE] URL configured:', url ? url.substring(0, 35) + '...' : 'MISSING');
  console.log('[SUPABASE] Service key defined:', !!serviceRoleKey, '| length:', serviceRoleKey?.length, '| prefix:', serviceRoleKey?.substring(0, 10));

  if (!url || !serviceRoleKey) {
    console.warn(
      '⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in backend environment variables. Token verification will fail until valid credentials are provided.'
    );
  } else if (!serviceRoleKey.startsWith('eyJ')) {
    console.warn(
      '⚠️ [SUPABASE] SUPABASE_SERVICE_ROLE_KEY does not look like a valid JWT (expected prefix "eyJ"). ' +
      'Please go to Supabase Dashboard → Project Settings → API and copy the service_role key.'
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

