'use client'

import { useState, useEffect } from 'react'

/**
 * Reads the Whop user token from the iframe URL search params.
 * When the app is embedded in Whop, the iframe src includes a
 * `token` (or `whop_user_token`) query parameter containing the JWT.
 *
 * Returns null when running outside the Whop iframe.
 */
export function useWhopToken(): string | null {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const t = params.get('whop_user_token') || params.get('token')
    if (t) setToken(t)
  }, [])

  return token
}
