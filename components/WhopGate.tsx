'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { AccessWall } from './AccessWall'

/**
 * WhopGate — client-side bootstrap wrapper.
 *
 * On mount:
 *  1. Check if there's already a Supabase session (returning user).
 *  2. If not, call /api/auth/bootstrap (which reads x-whop-user-token).
 *  3. If bootstrap succeeds, set the Supabase session from the returned tokens.
 *  4. If it fails, show the Access Wall.
 *
 * Wrap the app shell with this component.
 */

type GateState = 'loading' | 'ready' | 'blocked' | 'error'

export function WhopGate({ children, whopToken }: { children: React.ReactNode; whopToken?: string | null }) {
  const [state, setState] = useState<GateState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  const bootstrap = useCallback(async () => {
    const supabase = createClient()

    // ── Fast path: already have a valid Supabase session ──────────
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setState('ready')
      return
    }

    // ── Slow path: call bootstrap to verify Whop token ────────────
    try {
      const headers: Record<string, string> = {}
      if (whopToken) {
        headers['x-whop-user-token'] = whopToken
      }

      const res = await fetch('/api/auth/bootstrap', {
        credentials: 'include',
        headers,
      })

      if (res.status === 401 || res.status === 403) {
        setState('blocked')
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        setErrorMsg(body.error || 'Bootstrap failed')
        setState('error')
        return
      }

      const data = await res.json()

      if (!data.access || !data.access_token) {
        setState('blocked')
        return
      }

      // Set the Supabase session with tokens from bootstrap
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })

      if (sessionError) {
        console.error('[WhopGate] setSession failed:', sessionError.message)
        setErrorMsg('Session error — reload within Whop')
        setState('error')
        return
      }

      setState('ready')
      router.refresh()
    } catch (err) {
      console.error('[WhopGate] bootstrap error:', err)
      setErrorMsg('Connection error')
      setState('error')
    }
  }, [router, whopToken])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // ── Loading ──────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#07090d]">
        <div className="text-center animate-fadeIn">
          <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6] mx-auto mb-3" />
          <p className="text-[13px] text-[rgba(238,242,255,0.40)]">Loading...</p>
        </div>
      </div>
    )
  }

  // ── Blocked / Error ──────────────────────────────────────────────
  if (state === 'blocked') {
    return <AccessWall />
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#07090d] px-6">
        <div className="text-center animate-fadeIn">
          <p className="text-[15px] text-[#ef4444] mb-2">Something went wrong</p>
          <p className="text-[13px] text-[rgba(238,242,255,0.45)] mb-4">{errorMsg}</p>
          <button
            onClick={() => { setState('loading'); bootstrap() }}
            className="text-[13px] font-medium text-[#3b82f6] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Ready ────────────────────────────────────────────────────────
  return <>{children}</>
}
