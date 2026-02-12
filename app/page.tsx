'use client'

import { WhopGate } from '@/components/WhopGate'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Root page — WhopGate entry point.
 *
 * WhopGate handles:
 *  1. Verifying the Whop embed token
 *  2. Bootstrapping the Supabase session
 *  3. Showing Access Wall if outside Whop
 *
 * Once authenticated, redirects to /app.
 */
function RedirectToApp() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/app')
      }
    })
  }, [router])

  return null
}

export default function HomePage() {
  return (
    <WhopGate>
      <RedirectToApp />
    </WhopGate>
  )
}
