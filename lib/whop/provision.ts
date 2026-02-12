/**
 * Shared Supabase user provisioning for Whop users.
 *
 * Used by both:
 *  - /api/auth/bootstrap (iframe flow)
 *  - /api/auth/whop/callback (standalone OAuth flow)
 *
 * Given a verified WhopUser, this module finds or creates the corresponding
 * Supabase user with a deterministic email/password derived from the Whop ID.
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import type { WhopUser } from './verify'

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

export interface ProvisionResult {
  session: {
    access_token: string
    refresh_token: string
    expires_at?: number
    user: { id: string; email?: string }
  }
  isNewUser: boolean
}

/**
 * Find-or-create a Supabase user for the given Whop user.
 * Returns Supabase session tokens on success, null on failure.
 */
export async function provisionWhopUser(whopUser: WhopUser): Promise<ProvisionResult | null> {
  const authSecret = process.env.WHOP_AUTH_SECRET
  if (!authSecret) {
    console.error('[provision] WHOP_AUTH_SECRET not set')
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const email = `whop_${whopUser.id}@whop.44club.internal`
  const password = derivePassword(whopUser.id, authSecret)

  const admin = getSupabaseAdmin()
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let signInResult = await anonClient.auth.signInWithPassword({ email, password })
  let isNewUser = false

  if (signInResult.error) {
    // User doesn't exist yet — create via admin API
    isNewUser = true
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
      console.error('[provision] Failed to create user:', createError.message)
      return null
    }

    // Sign in as the new user
    signInResult = await anonClient.auth.signInWithPassword({ email, password })

    if (signInResult.error) {
      console.error('[provision] Sign-in after create failed:', signInResult.error.message)
      return null
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
  return {
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    },
    isNewUser,
  }
}
