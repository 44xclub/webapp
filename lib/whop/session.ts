/**
 * Whop session cookie — HMAC-signed, expiry-bound, user-bound.
 *
 * Cookie value format:  whop_user_id|expires_epoch|hmac_hex
 *
 * Uses Web Crypto API (works in Edge runtime / middleware).
 */

const COOKIE_NAME = 'whop-session'
const COOKIE_TTL_S = 60 * 60 * 24 // 24 hours

export { COOKIE_NAME, COOKIE_TTL_S }

// ── Helpers ────────────────────────────────────────────────────────

function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await getSigningKey(secret)
  const enc = new TextEncoder()
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return hexEncode(sig)
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Create a signed session cookie value for a verified Whop user.
 * Call this ONLY after the Whop token has been verified by the bootstrap endpoint.
 */
export async function createSessionValue(whopUserId: string): Promise<string> {
  const secret = process.env.WHOP_AUTH_SECRET
  if (!secret) throw new Error('WHOP_AUTH_SECRET not set')

  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_S
  const payload = `${whopUserId}|${expiresAt}`
  const hmac = await hmacSign(payload, secret)
  return `${payload}|${hmac}`
}

/**
 * Verify a session cookie value. Returns the whop_user_id if valid, null otherwise.
 * Checks both HMAC signature and expiry.
 */
export async function verifySessionValue(value: string): Promise<string | null> {
  const secret = process.env.WHOP_AUTH_SECRET
  if (!secret) return null

  const parts = value.split('|')
  if (parts.length !== 3) return null

  const [whopUserId, expiresAtStr, providedHmac] = parts

  // Check expiry
  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null // expired
  }

  // Verify HMAC
  const payload = `${whopUserId}|${expiresAtStr}`
  const expectedHmac = await hmacSign(payload, secret)

  // Constant-time comparison
  if (expectedHmac.length !== providedHmac.length) return null
  let mismatch = 0
  for (let i = 0; i < expectedHmac.length; i++) {
    mismatch |= expectedHmac.charCodeAt(i) ^ providedHmac.charCodeAt(i)
  }
  if (mismatch !== 0) return null

  return whopUserId
}
