import { NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

/**
 * GET /api/auth/whop/authorize
 *
 * Starts the Whop OAuth 2.1 + PKCE flow for standalone (non-iframe) access.
 *
 *  1. Generate PKCE code_verifier + code_challenge
 *  2. Generate CSRF state token
 *  3. Store code_verifier and state in short-lived httpOnly cookies
 *  4. Redirect to Whop OAuth authorization page
 */
export async function GET() {
  const clientId = process.env.WHOP_CLIENT_ID
  const redirectUri = process.env.WHOP_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Whop OAuth not configured. Set WHOP_CLIENT_ID and WHOP_REDIRECT_URI.' },
      { status: 500 },
    )
  }

  // Generate PKCE values
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const state = randomBytes(16).toString('base64url')

  // Build Whop OAuth authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })

  const authUrl = `https://whop.com/oauth?${params.toString()}`

  const response = NextResponse.redirect(authUrl)

  // Store PKCE code_verifier and state in httpOnly cookies
  // These are read by the callback route to complete the exchange.
  // sameSite: 'lax' is correct here — the callback is a redirect back
  // from Whop to our origin, which preserves lax cookies.
  response.cookies.set('whop_pkce_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  response.cookies.set('whop_pkce_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
