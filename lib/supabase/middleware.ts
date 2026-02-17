import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return response
  }

  // Check if this request comes from the Whop iframe proxy
  const whopUserToken = request.headers.get('x-whop-user-token')
  const isWhopRequest = !!whopUserToken

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        const cookieOpts = { ...options, sameSite: 'none' as const, secure: true }
        request.cookies.set({ name, value, ...cookieOpts })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value, ...cookieOpts })
      },
      remove(name: string, options: CookieOptions) {
        const cookieOpts = { ...options, sameSite: 'none' as const, secure: true }
        request.cookies.set({ name, value: '', ...cookieOpts })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value: '', ...cookieOpts })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // If this is a Whop iframe request and the user has no Supabase session,
  // redirect to the Whop auth endpoint to create/sign in the user
  if (isWhopRequest && !user) {
    const pathname = request.nextUrl.pathname

    // Don't redirect if already going to the auth endpoint (prevent loops)
    if (pathname.startsWith('/api/whop/auth')) {
      return response
    }

    const authUrl = new URL('/api/whop/auth', request.url)
    authUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(authUrl)
  }

  return response
}
