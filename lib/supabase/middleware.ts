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

  await supabase.auth.getUser()

  return response
}
