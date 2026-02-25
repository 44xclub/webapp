import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ResolvedUser {
  id: string
  email?: string
}

/**
 * Resolve the authenticated user from a voice API request.
 *
 * Tries two methods in order:
 * 1. Authorization: Bearer <token> header — the client sends the Supabase
 *    access token from localStorage. This works inside the Whop iframe where
 *    third-party cookies are blocked and cookie-based server auth fails.
 * 2. Cookie-based session — standard Supabase SSR auth via middleware cookies.
 *    Works when the app is accessed directly (not in an iframe).
 *
 * Returns the user object or null if both methods fail.
 */
export async function resolveUser(request: NextRequest): Promise<ResolvedUser | null> {
  // 1. Try Authorization header (token-based auth)
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) {
      return { id: user.id, email: user.email }
    }
  }

  // 2. Fall back to cookie-based session
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) {
      return { id: user.id, email: user.email }
    }
  } catch {
    // Cookie access may fail in some contexts
  }

  return null
}
