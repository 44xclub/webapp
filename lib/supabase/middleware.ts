import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME, verifySessionValue } from '@/lib/whop/session'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Paths that bypass the Whop gate.
 * Exact-prefix matches — keep this list minimal.
 */
const WHOP_BYPASS_PATHS = [
  '/blocked',            // Access Wall page (no-membership)
  '/login',              // Login page (standalone sign-in with Whop)
  '/api/auth/bootstrap', // Iframe bootstrap endpoint (does its own token check)
  '/api/auth/whop',      // OAuth authorize + callback routes
  '/auth/session',       // Session setter (post-OAuth, sets Supabase session)
  '/auth/callback',      // Supabase auth callback (legacy)
]

function shouldBypassWhopGate(pathname: string): boolean {
  return WHOP_BYPASS_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function addSecurityHeaders(response: NextResponse): void {
  // CSP wildcard *.whop.com only matches one subdomain level.
  // Whop's embed proxy uses multi-level subdomains (e.g. webapp.apps.whop.com)
  // so we need explicit patterns for those.
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.whop.com https://whop.com https://*.apps.whop.com;",
  )
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  // X-Frame-Options intentionally omitted — CSP frame-ancestors handles
  // iframe policy and takes precedence in all modern browsers. Setting
  // X-Frame-Options: DENY here would conflict and block the Whop embed.
}

/**
 * Return a 403 JSON response for API routes, or redirect to /login for page routes.
 */
function denyAccess(request: NextRequest): NextResponse {
  if (isApiRoute(request.nextUrl.pathname)) {
    const res = NextResponse.json(
      { error: 'Whop authentication required', access: false },
      { status: 403 },
    )
    addSecurityHeaders(res)
    return res
  }

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  const res = NextResponse.redirect(url)
  addSecurityHeaders(res)
  return res
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  addSecurityHeaders(response)

  // ── Whop auth gate ───────────────────────────────────────────
  const { pathname } = request.nextUrl

  // Check for a valid HMAC-signed session cookie (set by bootstrap or OAuth callback).
  // Hoisted so it's available for both the gate check and the
  // Supabase auth fallback below.
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value
  let whopUserId: string | null = null
  if (sessionCookie) {
    whopUserId = await verifySessionValue(sessionCookie)
  }

  if (!shouldBypassWhopGate(pathname) && !whopUserId) {
    // No valid signed session cookie.
    // Two paths exist:
    //  a) Whop iframe/proxy: allow root `/` through so WhopGate can call bootstrap
    //  b) Standalone: redirect to /login so the user can sign in via OAuth
    if (pathname === '/') {
      // Whop embeds the app via a server-side proxy (webapp.apps.whop.com)
      // which injects x-whop-user-token on every request. Since the proxy
      // makes server-to-server requests, sec-fetch-dest is absent — so we
      // detect the Whop context by the presence of the token header instead.
      const whopToken = request.headers.get('x-whop-user-token')
      const fetchDest = request.headers.get('sec-fetch-dest')
      if (whopToken || fetchDest === 'iframe') {
        // Whop proxy request (has token) or direct iframe — allow through
        // for WhopGate bootstrap which will verify the token server-side
      } else {
        // Direct browser visit — redirect to login for OAuth sign-in
        return denyAccess(request)
      }
    } else {
      return denyAccess(request)
    }
  }

  // ── Supabase session refresh ───────────────────────────────────
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return response
  }

  // Cross-origin cookie defaults (app may run in Whop iframe)
  const crossOriginCookie = { sameSite: 'none' as const, secure: true, path: '/' }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: crossOriginCookie,
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        const merged = { ...options, ...crossOriginCookie }
        request.cookies.set({ name, value, ...merged })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        addSecurityHeaders(response)
        response.cookies.set({ name, value, ...merged })
      },
      remove(name: string, options: CookieOptions) {
        const merged = { ...options, ...crossOriginCookie }
        request.cookies.set({ name, value: '', ...merged })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        addSecurityHeaders(response)
        response.cookies.set({ name, value: '', ...merged })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /app and /profile routes — need Supabase session.
  // However, if the Whop session cookie is valid, skip this redirect.
  // On the first load the Supabase cookies may not have arrived yet
  // (bootstrap sets them client-side after the initial page load).
  // Redirecting would create an infinite loop: /app → / → /app → …
  if (!user && !whopUserId && (pathname.startsWith('/app') || pathname.startsWith('/profile'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
