import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance for browser client to prevent recreating on every call
let browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  // Return existing client if already created (singleton pattern)
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During SSR/build, env vars might not be available - throw only in browser
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      throw new Error(
        'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.'
      )
    }
    // During SSR/build, create a placeholder that will be replaced on client hydration
    // This allows the build to succeed while still failing fast in actual runtime
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  // Create and cache the browser client
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
