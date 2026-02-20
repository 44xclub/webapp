import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWhopToken } from '@/lib/whop/verify-token'

/**
 * POST /api/whop/link
 *
 * Links the authenticated Supabase user to their Whop account by
 * saving the Whop user ID from the iframe JWT into the profile.
 *
 * Requires:
 * - Valid Supabase session (from cookies)
 * - Valid Whop iframe JWT in `x-whop-user-token` header
 *
 * Idempotent: if already linked to the same Whop ID, returns success.
 */
export async function POST(request: NextRequest) {
  // 1. Verify Supabase session
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  // 2. Verify Whop JWT
  const whopToken = request.headers.get('x-whop-user-token')
  if (!whopToken) {
    return NextResponse.json(
      { error: 'Missing x-whop-user-token header' },
      { status: 401 }
    )
  }

  let whopUserId: string
  try {
    const payload = await verifyWhopToken(whopToken)
    whopUserId = payload.sub
  } catch (err) {
    console.error('[WhopLink] JWT verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid or expired Whop token' },
      { status: 401 }
    )
  }

  // 3. Check if this Whop ID is already linked to a different user
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('whop_user_id', whopUserId)
    .single()

  if (existing && existing.id !== user.id) {
    return NextResponse.json(
      { error: 'This Whop account is already linked to another user' },
      { status: 409 }
    )
  }

  // 4. Already linked to this user — no-op
  if (existing && existing.id === user.id) {
    return NextResponse.json({ success: true, already_linked: true })
  }

  // 5. Link: set whop_user_id on the profile
  const { error: updateError } = await admin
    .from('profiles')
    .update({ whop_user_id: whopUserId })
    .eq('id', user.id)

  if (updateError) {
    console.error('[WhopLink] Profile update failed:', updateError.message)
    return NextResponse.json(
      { error: 'Failed to link Whop account' },
      { status: 500 }
    )
  }

  console.log('[WhopLink] Linked Whop user to profile:', user.id)
  return NextResponse.json({ success: true })
}
