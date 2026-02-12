import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWhopToken } from '@/lib/whop/verify'
import { createHmac } from 'crypto'

/**
 * GET /api/auth/bootstrap
 *
 * Called once on app start (inside Whop embed) to:
 *  1. Verify the Whop token
 *  2. Find-or-create a Supabase user mapped to the Whop user
 *  3. Sign them in and return credentials the client stores
 *  4. Upsert the profile with whop_user_id linkage
 *
 * Required env vars:
 *   SUPABASE_SERVICE_ROLE_KEY  — admin operations
 *   WHOP_AUTH_SECRET           — deterministic password derivation
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

// Rate-limit map (in-memory, per-instance — sufficient for basic protection)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 20          // requests per window

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
      { error: 'Too many requests' },
      { status: 429 },
    )
  }

  // ── Read Whop token ────────────────────────────────────────────
  const whopToken = request.headers.get('x-whop-user-token')
  if (!whopToken) {
    return NextResponse.json(
      { error: 'Missing x-whop-user-token header', access: false },
      { status: 401 },
    )
  }

  // ── Verify with Whop API ───────────────────────────────────────
  const whopUser = await verifyWhopToken(whopToken)
  if (!whopUser) {
    return NextResponse.json(
      { error: 'Invalid or expired Whop token', access: false },
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
    // Try to sign in first (fast path for returning users)
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

      // Now sign in as the new user
      signInResult = await anonClient.auth.signInWithPassword({ email, password })

      if (signInResult.error) {
        console.error('[bootstrap] Sign-in after create failed:', signInResult.error.message)
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 },
        )
      }

      // Upsert profile with Whop identity (new user)
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
      // Existing user — update Whop metadata on each login
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

    return NextResponse.json({
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
  } catch (err) {
    console.error('[bootstrap] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
