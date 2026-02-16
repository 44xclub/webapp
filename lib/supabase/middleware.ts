import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.whop.com https://whop.com https://*.apps.whop.com;",
  )
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  addSecurityHeaders(response)

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

  await supabase.auth.getUser()

  return response
}
