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
    console.log('[WhopGate] ▶ bootstrap start')
    console.log('[WhopGate] whopToken received:', whopToken ? `yes (${whopToken.slice(0, 12)}…)` : 'NO — Whop did not inject the header')

    const supabase = createClient()

    // ── Fast path: already have a valid Supabase session ──────────
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    console.log('[WhopGate] existing session check:', user ? `user ${user.id}` : 'no user', getUserError ? `(err: ${getUserError.message})` : '')
    if (user) {
      console.log('[WhopGate] ✓ fast path — already authenticated')
      setState('ready')
      return
    }

    // ── Slow path: call bootstrap to verify Whop token ────────────
    try {
      const headers: Record<string, string> = {}
      if (whopToken) {
        headers['x-whop-user-token'] = whopToken
      }

      console.log('[WhopGate] calling /api/auth/bootstrap…')
      const res = await fetch('/api/auth/bootstrap', {
        credentials: 'include',
        headers,
      })
      console.log('[WhopGate] bootstrap response:', res.status, res.statusText)

      if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({}))
        console.error('[WhopGate] ✗ blocked —', res.status, body.error || '')
        setState('blocked')
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[WhopGate] ✗ bootstrap failed —', res.status, body.error)
        setErrorMsg(body.error || 'Bootstrap failed')
        setState('error')
        return
      }

      const data = await res.json()
      console.log('[WhopGate] bootstrap data:', { access: data.access, hasToken: !!data.access_token, whop_user_id: data.whop_user_id })

      if (!data.access || !data.access_token) {
        console.error('[WhopGate] ✗ no access or token in response')
        setState('blocked')
        return
      }

      // Set the Supabase session with tokens from bootstrap
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })

      if (sessionError) {
        console.error('[WhopGate] ✗ setSession failed:', sessionError.message)
        setErrorMsg('Session error — reload within Whop')
        setState('error')
        return
      }

      console.log('[WhopGate] ✓ authenticated — redirecting to /app')
      setState('ready')
      router.refresh()
    } catch (err) {
      console.error('[WhopGate] ✗ bootstrap error:', err)
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
