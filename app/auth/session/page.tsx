import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SessionSetter } from './SessionSetter'

/**
 * /auth/session — Server Component
 *
 * Intermediary page after Whop OAuth callback.
 * Reads the temporary httpOnly cookie containing Supabase tokens,
 * passes them to the client component which calls setSession().
 */
export default async function SessionPage() {
  const cookieStore = await cookies()
  const tokensCookie = cookieStore.get('whop-oauth-tokens')

  if (!tokensCookie?.value) {
    redirect('/login')
  }

  let tokens: { access_token: string; refresh_token: string }
  try {
    tokens = JSON.parse(tokensCookie.value)
  } catch {
    redirect('/login')
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    redirect('/login')
  }

  return (
    <SessionSetter
      accessToken={tokens.access_token}
      refreshToken={tokens.refresh_token}
    />
  )
}
