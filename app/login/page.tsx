import { redirect } from 'next/navigation'

/**
 * Login page — disabled.
 *
 * All authentication is now handled via Whop embed.
 * Direct access redirects to the Access Wall.
 */
export default function LoginPage() {
  redirect('/blocked')
}
