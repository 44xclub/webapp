import { headers } from 'next/headers'
import { HomePageClient } from './HomePageClient'

/**
 * Root page (Server Component).
 *
 * Reads the x-whop-user-token header that Whop injects on the initial
 * iframe load and passes it to the client-side WhopGate so it can call
 * the bootstrap endpoint.
 */
export default async function HomePage() {
  const headersList = await headers()
  const whopToken = headersList.get('x-whop-user-token') || null

  return <HomePageClient whopToken={whopToken} />
}
