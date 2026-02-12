import { NextRequest, NextResponse } from 'next/server'
import { verifyWhopToken, checkWhopAccess } from '@/lib/whop/verify'
import { provisionWhopUser } from '@/lib/whop/provision'
import { createSessionValue, COOKIE_NAME, COOKIE_TTL_S } from '@/lib/whop/session'

/**
 * GET /api/auth/bootstrap
 *
 * Authentication entry point for the Whop iframe flow.
 * Called by WhopGate on app start.
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
const RATE_LIMIT_MAX = 10

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

  // ── Step 4: Provision Supabase user ────────────────────────────
  try {
    const result = await provisionWhopUser(whopUser)
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to provision account' },
        { status: 500 },
      )
    }

    // ── Step 5: Set signed session cookie ──────────────────────────
    const cookieValue = await createSessionValue(whopUser.id)
    const res = NextResponse.json({
      access: true,
      whop_user_id: whopUser.id,
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
      expires_at: result.session.expires_at,
      user: result.session.user,
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
