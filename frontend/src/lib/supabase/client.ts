import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client (safe to use in components and hooks)
// Fallback placeholders prevent build-time throws when env vars aren't set yet.
// At runtime they will always be replaced by real values from .env.local
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
  );
}
