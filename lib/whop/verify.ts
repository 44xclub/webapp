/**
 * Whop token verification.
 *
 * Validates the x-whop-user-token JWT that Whop injects into every
 * request from the embedded iframe.  The token is verified by calling
 * Whop's /api/v5/me endpoint — if the token is valid Whop returns the
 * user profile; otherwise it returns 401.
 */

export interface WhopUser {
  id: string          // Whop user ID
  email: string | null
  username: string | null
  name: string | null
  image_url: string | null
}

interface WhopMeResponse {
  id: string
  email?: string
  username?: string
  name?: string
  profile_pic_url?: string
}

const WHOP_API_BASE = 'https://api.whop.com'

/**
 * Verify a Whop user token by calling Whop's /me endpoint.
 * Returns the user on success, null on any failure.
 */
export async function verifyWhopToken(token: string): Promise<WhopUser | null> {
  try {
    const res = await fetch(`${WHOP_API_BASE}/api/v5/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Short timeout — this runs in the request path
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data: WhopMeResponse = await res.json()
    if (!data.id) return null

    return {
      id: data.id,
      email: data.email ?? null,
      username: data.username ?? null,
      name: data.name ?? null,
      image_url: data.profile_pic_url ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Check whether a Whop user has access to a specific experience/product.
 * Requires WHOP_API_KEY (server-side Bearer key).
 *
 * Optional hardening — can be enabled later.
 */
export async function checkWhopAccess(
  whopUserId: string,
  experienceId: string,
): Promise<boolean> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) {
    console.warn('[whop] WHOP_API_KEY not set — skipping entitlement check')
    return true // fail-open when key not configured
  }

  try {
    const res = await fetch(
      `${WHOP_API_BASE}/api/v5/memberships?user_id=${whopUserId}&valid=true`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      },
    )

    if (!res.ok) return false

    const data = await res.json()
    // If any membership matches the experience, they have access
    if (!experienceId) return (data.data?.length ?? 0) > 0
    return data.data?.some(
      (m: { experience_id?: string }) => m.experience_id === experienceId,
    ) ?? false
  } catch {
    return false
  }
}
