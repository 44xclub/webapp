import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Paths that bypass the Whop gate entirely.
 * - /blocked  — the Access Wall page itself
 * - /api/auth — bootstrap and auth callback endpoints
 * - Static assets are already excluded by the middleware matcher
 */
const WHOP_BYPASS_PATHS = ['/blocked', '/api/auth']

/**
 * Name of the cookie set after a successful Whop bootstrap.
 * Presence means the user entered via the Whop embed.
 */
const WHOP_SESSION_COOKIE = 'whop-verified'

function shouldBypassWhopGate(pathname: string): boolean {
  return WHOP_BYPASS_PATHS.some((p) => pathname.startsWith(p))
}

function addSecurityHeaders(response: NextResponse): void {
  // Only allow embedding by Whop domains
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.whop.com https://whop.com;",
  )
  // Prevent search engine indexing
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // ── Security headers on every response ─────────────────────────
  addSecurityHeaders(response)

  // ── Whop embed gate ────────────────────────────────────────────
  const { pathname } = request.nextUrl
  if (!shouldBypassWhopGate(pathname)) {
    const hasWhopToken = !!request.headers.get('x-whop-user-token')
    const hasWhopSession = !!request.cookies.get(WHOP_SESSION_COOKIE)?.value

    if (!hasWhopToken && !hasWhopSession) {
      // No Whop context — redirect to Access Wall
      const url = request.nextUrl.clone()
      url.pathname = '/blocked'
      const redirectResponse = NextResponse.redirect(url)
      addSecurityHeaders(redirectResponse)
      return redirectResponse
    }

    // Set session cookie on first request with Whop token
    if (hasWhopToken && !hasWhopSession) {
      response.cookies.set(WHOP_SESSION_COOKIE, '1', {
        httpOnly: true,
        secure: true,
        sameSite: 'none', // required for cross-origin iframe
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      })
    }
  }

  // ── Supabase session refresh ───────────────────────────────────
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        addSecurityHeaders(response)
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        addSecurityHeaders(response)
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /app and /profile routes — need Supabase session
  if (!user && (pathname.startsWith('/app') || pathname.startsWith('/profile'))) {
    // User passed Whop gate but hasn't bootstrapped Supabase session yet.
    // Redirect to root which triggers the WhopGate bootstrap flow.
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
