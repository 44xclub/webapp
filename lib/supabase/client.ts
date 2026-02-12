import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance for browser client to prevent recreating on every call
let browserClient: SupabaseClient | null = null

// ── Safe cookie helpers ──────────────────────────────────────────
// The default cookie adapter in @supabase/ssr v0.1 crashes with
// "Cannot read properties of undefined (reading 'get')" when
// document.cookie is inaccessible (e.g. cross-origin iframe with
// third-party cookies blocked). These helpers never throw.

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  try {
    const pairs = document.cookie.split(';')
    for (const pair of pairs) {
      const idx = pair.indexOf('=')
      if (idx === -1) continue
      const key = pair.slice(0, idx).trim()
      if (key === name) {
        return decodeURIComponent(pair.slice(idx + 1).trim())
      }
    }
  } catch {
    // cookie access denied in third-party context — return undefined
  }
  return undefined
}

function setCookie(
  name: string,
  value: string,
  options?: { path?: string; maxAge?: number; domain?: string; sameSite?: string; secure?: boolean },
): void {
  if (typeof document === 'undefined') return
  try {
    let cookie = `${name}=${encodeURIComponent(value)}`
    if (options?.maxAge != null) cookie += `; Max-Age=${options.maxAge}`
    if (options?.path) cookie += `; Path=${options.path}`
    if (options?.domain) cookie += `; Domain=${options.domain}`
    if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`
    if (options?.secure) cookie += '; Secure'
    document.cookie = cookie
  } catch {
    // cookie write denied in third-party context
  }
}

function removeCookie(
  name: string,
  options?: { path?: string; domain?: string },
): void {
  if (typeof document === 'undefined') return
  try {
    let cookie = `${name}=; Max-Age=0`
    if (options?.path) cookie += `; Path=${options.path}`
    if (options?.domain) cookie += `; Domain=${options.domain}`
    document.cookie = cookie
  } catch {
    // ignored
  }
}

// ── Client factory ───────────────────────────────────────────────

const CROSS_ORIGIN_COOKIE = { sameSite: 'none' as const, secure: true, path: '/' }

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
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  // Create and cache the browser client with a safe cookie adapter.
  // Cookie options: sameSite 'none' + secure required because the app may run
  // inside a cross-origin Whop iframe (app.44club.uk inside whop.com).
  // Without this, browsers block the cookies as third-party.
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: CROSS_ORIGIN_COOKIE,
    cookies: {
      get(name: string) {
        return getCookie(name)
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set(name: string, value: string, options: any) {
        setCookie(name, value, { ...CROSS_ORIGIN_COOKIE, ...options })
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      remove(name: string, options: any) {
        removeCookie(name, { ...CROSS_ORIGIN_COOKIE, ...options })
      },
    },
  })
  return browserClient
}
