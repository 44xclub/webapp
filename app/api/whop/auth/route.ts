import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createHmac } from 'crypto'
import { getWhopSdk } from '@/lib/whop'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whop/auth
 *
 * Authenticates a Whop iframe user into Supabase.
 * Flow:
 * 1. Verify the x-whop-user-token header via Whop SDK
 * 2. Look up or create a Supabase auth user mapped to this Whop user
 * 3. Sign in as that Supabase user and set session cookies
 * 4. Redirect to the requested page
 */
export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/app'
  const redirectUrl = new URL(redirectTo, request.url)

  // Verify the Whop user token from the header
  let whopUserId: string
  try {
    const result = await getWhopSdk().verifyUserToken(request.headers)
    whopUserId = result.userId
  } catch (err) {
    console.error('Whop token verification failed:', err)
    // Fall back to regular login if Whop verification fails
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!whopUserId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabaseAdmin = createAdminClient()

  // Deterministic email and password for this Whop user
  const email = `${whopUserId}@whop.44club.app`
  const password = createHmac('sha256', process.env.WHOP_USER_SECRET!)
    .update(whopUserId)
    .digest('hex')

  // Check if this Whop user already has a Supabase mapping
  const { data: existingMapping } = await supabaseAdmin
    .from('whop_users')
    .select('supabase_user_id')
    .eq('whop_user_id', whopUserId)
    .single()

  if (!existingMapping) {
    // First visit: create a Supabase auth user for this Whop user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { whop_user_id: whopUserId },
    })

    if (createError) {
      console.error('Failed to create Supabase user for Whop user:', createError)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Store the mapping
    const { error: mappingError } = await supabaseAdmin
      .from('whop_users')
      .insert({
        whop_user_id: whopUserId,
        supabase_user_id: newUser.user.id,
      })

    if (mappingError) {
      console.error('Failed to create whop_users mapping:', mappingError)
    }
  }

  // Sign in as the Supabase user and set session cookies
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    console.error('Failed to sign in Whop user:', signInError)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Set a cookie to indicate this is a Whop-embedded session
  response.cookies.set('whop_embedded', '1', {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return response
}
