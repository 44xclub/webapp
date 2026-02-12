import { NextRequest, NextResponse } from 'next/server'
import { verifyWhopToken, checkWhopAccess } from '@/lib/whop/verify'
import { provisionWhopUser } from '@/lib/whop/provision'
import { createSessionValue, COOKIE_NAME, COOKIE_TTL_S } from '@/lib/whop/session'

/**
 * GET /api/auth/whop/callback
 *
 * Handles the redirect back from Whop OAuth.
 *
 *  1. Validate CSRF state
 *  2. Exchange authorization code for Whop access token (PKCE)
 *  3. Verify user identity via Whop /me endpoint
 *  4. Check paid membership (same logic as bootstrap)
 *  5. Provision Supabase user (shared with bootstrap)
 *  6. Set session cookies
 *  7. Store Supabase tokens for client-side session setup
 *  8. Redirect to /auth/session → /app
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // User denied OAuth or Whop returned an error
  if (error) {
    console.warn('[whop-oauth] OAuth error from Whop:', error)
    return redirectTo(request, '/login?error=oauth_denied')
  }

  // ── Validate CSRF state ────────────────────────────────────────
  const storedState = request.cookies.get('whop_pkce_state')?.value
  const codeVerifier = request.cookies.get('whop_pkce_verifier')?.value

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    console.error('[whop-oauth] Invalid state or missing PKCE values')
    return redirectTo(request, '/login?error=invalid_state')
  }

  const clientId = process.env.WHOP_CLIENT_ID!
  const redirectUri = process.env.WHOP_REDIRECT_URI!

  // ── Exchange code for Whop access token ────────────────────────
  let tokenData: { access_token?: string; refresh_token?: string }
  try {
    const tokenRes = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('[whop-oauth] Token exchange failed:', tokenRes.status, body)
      return redirectTo(request, '/login?error=token_exchange')
    }

    tokenData = await tokenRes.json()
  } catch (err) {
    console.error('[whop-oauth] Token exchange error:', err)
    return redirectTo(request, '/login?error=token_exchange')
  }

  if (!tokenData.access_token) {
    console.error('[whop-oauth] No access_token in response')
    return redirectTo(request, '/login?error=token_exchange')
  }

  // ── Verify Whop user identity ──────────────────────────────────
  const whopUser = await verifyWhopToken(tokenData.access_token)
  if (!whopUser) {
    console.error('[whop-oauth] Failed to verify Whop user with OAuth token')
    return redirectTo(request, '/login?error=verification')
  }

  // ── Check paid membership ──────────────────────────────────────
  const experienceId = process.env.WHOP_EXPERIENCE_ID || ''
  console.log('[whop-oauth] Checking access for user:', whopUser.id)
  const hasAccess = await checkWhopAccess(whopUser.id, experienceId)
  if (!hasAccess) {
    console.warn('[whop-oauth] Access DENIED for user:', whopUser.id)
    return redirectTo(request, '/blocked')
  }

  // ── Provision Supabase user ────────────────────────────────────
  const result = await provisionWhopUser(whopUser)
  if (!result) {
    console.error('[whop-oauth] User provisioning failed for:', whopUser.id)
    return redirectTo(request, '/login?error=provision')
  }

  // ── Set cookies and redirect ───────────────────────────────────
  const cookieValue = await createSessionValue(whopUser.id)

  const response = redirectTo(request, '/auth/session')

  // Whop session cookie (for middleware gate)
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_TTL_S,
    path: '/',
  })

  // Temporary cookie with Supabase tokens for client-side setSession.
  // httpOnly so only the server component can read it; 60s expiry.
  response.cookies.set('whop-oauth-tokens', JSON.stringify({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token,
  }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60,
    path: '/',
  })

  // Clean up PKCE cookies
  response.cookies.delete('whop_pkce_verifier')
  response.cookies.delete('whop_pkce_state')

  return response
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = path
  if (!path.includes('?')) url.search = ''
  else {
    const [pathname, search] = path.split('?')
    url.pathname = pathname
    url.search = `?${search}`
  }
  return NextResponse.redirect(url)
}
