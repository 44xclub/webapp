'use client'

import { useEffect, useRef } from 'react'
import { useWhopToken } from './useWhopToken'

/**
 * Automatically links the current Supabase user to their Whop account
 * when the app is loaded inside the Whop iframe.
 *
 * Runs once per page load: if a Whop token is present and the profile
 * doesn't have a whop_user_id yet, it calls POST /api/whop/link.
 *
 * Safe to call unconditionally — no-ops outside the Whop iframe.
 */
export function useWhopLink(
  userId: string | undefined,
  whopUserIdAlreadySet: boolean
) {
  const whopToken = useWhopToken()
  const attempted = useRef(false)

  useEffect(() => {
    if (!userId || !whopToken || whopUserIdAlreadySet || attempted.current) {
      return
    }

    attempted.current = true

    fetch('/api/whop/link', {
      method: 'POST',
      headers: { 'x-whop-user-token': whopToken },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.error('[WhopLink] Failed:', body.error || res.status)
        }
      })
      .catch((err) => {
        console.error('[WhopLink] Network error:', err)
      })
  }, [userId, whopToken, whopUserIdAlreadySet])
}
