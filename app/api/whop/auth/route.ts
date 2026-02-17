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
  const loginUrl = new URL('/login', request.url)

  try {
    // ── 1. Check required env vars ──────────────────────────────────────
    const whopUserSecret = process.env.WHOP_USER_SECRET
    if (!whopUserSecret) {
      console.error('[whop/auth] Missing WHOP_USER_SECRET env var')
      return NextResponse.redirect(loginUrl)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[whop/auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return NextResponse.redirect(loginUrl)
    }
    if (!serviceRoleKey) {
      console.error('[whop/auth] Missing SUPABASE_SERVICE_ROLE_KEY env var')
      return NextResponse.redirect(loginUrl)
    }

    // ── 2. Verify the Whop user token ───────────────────────────────────
    let whopUserId: string
    try {
      const result = await getWhopSdk().verifyUserToken(request.headers)
      whopUserId = result.userId
    } catch (err) {
      console.error('[whop/auth] Whop token verification failed:', err)
      return NextResponse.redirect(loginUrl)
    }

    if (!whopUserId) {
      console.error('[whop/auth] No whopUserId returned from token verification')
      return NextResponse.redirect(loginUrl)
    }

    console.log('[whop/auth] Verified Whop user:', whopUserId)

    // ── 3. Create or look up the Supabase user ─────────────────────────
    const supabaseAdmin = createAdminClient()

    // Deterministic email and password for this Whop user
    const email = `${whopUserId}@whop.44club.app`
    const password = createHmac('sha256', whopUserSecret)
      .update(whopUserId)
      .digest('hex')

    // Try to create the Supabase auth user.
    // If they already exist, createUser returns an error — that's fine, we just sign in.
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { whop_user_id: whopUserId },
    })

    if (newUser?.user) {
      console.log('[whop/auth] Created new Supabase user:', newUser.user.id)

      // Try to store the mapping in whop_users (non-fatal if table doesn't exist)
      try {
        await supabaseAdmin
          .from('whop_users')
          .upsert({
            whop_user_id: whopUserId,
            supabase_user_id: newUser.user.id,
          }, { onConflict: 'whop_user_id' })
      } catch (e) {
        console.warn('[whop/auth] whop_users upsert failed (table may not exist):', e)
      }
    } else if (createError) {
      // User likely already exists — this is expected for returning users
      console.log('[whop/auth] User already exists, proceeding to sign in:', createError.message)
    }

    // ── 4. Sign in and set session cookies ──────────────────────────────
    const redirectUrl = new URL(redirectTo, request.url)
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    })

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('[whop/auth] Failed to sign in Whop user:', signInError)
      return NextResponse.redirect(loginUrl)
    }

    console.log('[whop/auth] Signed in successfully, redirecting to:', redirectTo)

    // Set a cookie to indicate this is a Whop-embedded session
    response.cookies.set('whop_embedded', '1', {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch (err) {
    // Catch-all: any unhandled error returns a redirect instead of a 500
    console.error('[whop/auth] Unhandled error:', err)
    return NextResponse.redirect(loginUrl)
  }
}
