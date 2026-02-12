'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

/**
 * Client component that sets the Supabase session from tokens
 * received via the Whop OAuth flow, then redirects to /app.
 */
export function SessionSetter({
  accessToken,
  refreshToken,
}: {
  accessToken: string
  refreshToken: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          console.error('[SessionSetter] setSession failed:', sessionError.message)
          setError('Failed to establish session. Please try again.')
          return
        }

        console.log('[SessionSetter] Session established — redirecting to /app')
        router.replace('/app')
      })
  }, [accessToken, refreshToken, router])

  if (error) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#07090d] px-6">
        <div className="text-center animate-fadeIn">
          <p className="text-[15px] text-[#ef4444] mb-2">Something went wrong</p>
          <p className="text-[13px] text-[rgba(238,242,255,0.45)] mb-4">{error}</p>
          <a
            href="/login"
            className="text-[13px] font-medium text-[#3b82f6] hover:underline"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#07090d]">
      <div className="text-center animate-fadeIn">
        <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6] mx-auto mb-3" />
        <p className="text-[13px] text-[rgba(238,242,255,0.40)]">Signing you in...</p>
      </div>
    </div>
  )
}
