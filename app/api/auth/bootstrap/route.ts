import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWhopToken, checkWhopAccess } from '@/lib/whop/verify'
import { createSessionValue, COOKIE_NAME, COOKIE_TTL_S } from '@/lib/whop/session'
import { createHmac } from 'crypto'

/**
 * GET /api/auth/bootstrap
 *
 * The ONLY entry point for authentication. Called by WhopGate on app start.
 *
 *  1. Verify x-whop-user-token with Whop API (rejects forged tokens)
 *  2. Verify paid access via Whop memberships API (rejects non-members)
 *  3. Find-or-create a Supabase user mapped to the Whop user
 *  4. Set a signed session cookie (HMAC-bound to user + expiry)
 *  5. Return Supabase session credentials
 */

// ── Rate limiting (in-memory, per-instance) ──────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10 // tightened from 20

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// Clean up stale entries periodically to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key)
  }
}, 5 * 60_000)

function derivePassword(whopUserId: string, secret: string): string {
  return createHmac('sha256', secret).update(whopUserId).digest('hex')
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests', access: false },
      { status: 429 },
    )
  }

  // ── Step 1: Read Whop token ────────────────────────────────────
  const whopToken = request.headers.get('x-whop-user-token')
  if (!whopToken) {
    return NextResponse.json(
      { error: 'Missing x-whop-user-token header', access: false },
      { status: 401 },
    )
  }

  // ── Step 2: Verify token with Whop API ─────────────────────────
  const whopUser = await verifyWhopToken(whopToken)
  if (!whopUser) {
    return NextResponse.json(
      { error: 'Invalid or expired Whop token', access: false },
      { status: 403 },
    )
  }

  // ── Step 3: Verify paid access (entitlement check) ─────────────
  const experienceId = process.env.WHOP_EXPERIENCE_ID || ''
  console.log('[bootstrap] Checking access for user:', whopUser.id, 'with experienceId:', experienceId || '(empty)')
  const hasAccess = await checkWhopAccess(whopUser.id, experienceId)
  if (!hasAccess) {
    console.warn('[bootstrap] Access DENIED for user:', whopUser.id, '— check WHOP_EXPERIENCE_ID in server logs above')
    return NextResponse.json(
      { error: 'No active 44CLUB membership', access: false },
      { status: 403 },
    )
  }

  // ── Env checks ─────────────────────────────────────────────────
  const authSecret = process.env.WHOP_AUTH_SECRET
  if (!authSecret) {
    console.error('[bootstrap] WHOP_AUTH_SECRET not set')
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    const admin = getSupabaseAdmin()

    // Deterministic email and password for this Whop user
    const email = `whop_${whopUser.id}@whop.44club.internal`
    const password = derivePassword(whopUser.id, authSecret)

    // ── Find or create the Supabase user ───────────────────────
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let signInResult = await anonClient.auth.signInWithPassword({ email, password })

    if (signInResult.error) {
      // User doesn't exist yet — create via admin API
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          whop_user_id: whopUser.id,
          whop_username: whopUser.username,
          display_name: whopUser.name || whopUser.username || 'Member',
        },
      })

      if (createError) {
        console.error('[bootstrap] Failed to create user:', createError.message)
        return NextResponse.json(
          { error: 'Failed to provision account' },
          { status: 500 },
        )
      }

      // Sign in as the new user
      signInResult = await anonClient.auth.signInWithPassword({ email, password })

      if (signInResult.error) {
        console.error('[bootstrap] Sign-in after create failed:', signInResult.error.message)
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 },
        )
      }

      // Upsert profile with Whop identity
      if (newUser.user) {
        await admin.from('profiles').upsert({
          id: newUser.user.id,
          whop_user_id: whopUser.id,
          whop_email: whopUser.email,
          whop_meta: {
            username: whopUser.username,
            name: whopUser.name,
            image_url: whopUser.image_url,
            linked_at: new Date().toISOString(),
          },
        }, { onConflict: 'id' })
      }
    } else {
      // Existing user — update Whop metadata
      const userId = signInResult.data.user?.id
      if (userId) {
        await admin.from('profiles').update({
          whop_user_id: whopUser.id,
          whop_email: whopUser.email,
          whop_meta: {
            username: whopUser.username,
            name: whopUser.name,
            image_url: whopUser.image_url,
            last_seen: new Date().toISOString(),
          },
        }).eq('id', userId)
      }
    }

    const session = signInResult.data.session!

    // ── Step 4: Set signed session cookie ────────────────────────
    const cookieValue = await createSessionValue(whopUser.id)
    const res = NextResponse.json({
      access: true,
      whop_user_id: whopUser.id,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    })

    res.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // required for cross-origin iframe
      maxAge: COOKIE_TTL_S,
      path: '/',
    })

    return res
  } catch (err) {
    console.error('[bootstrap] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
