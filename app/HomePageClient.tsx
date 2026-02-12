'use client'

import { WhopGate } from '@/components/WhopGate'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
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

export function HomePageClient({ whopToken }: { whopToken: string | null }) {
  return (
    <WhopGate whopToken={whopToken}>
      <RedirectToApp />
    </WhopGate>
  )
}
