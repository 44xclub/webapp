'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/**
 * Shared auth hook with SWR caching.
 * Replaces the duplicated auth boilerplate across all pages.
 * - Caches the auth user globally so tab switches are instant.
 * - Subscribes to onAuthStateChange for sign-out / token refresh.
 * - Redirects to /login when unauthenticated.
 */
export function useAuth() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const { data, isLoading, mutate } = useSWR<SupabaseUser | null>(
    'auth-user',
    async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return null
      }
      return user
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      revalidateOnReconnect: true,
    }
  )

  // Subscribe to auth state changes (sign-out, token refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          mutate(null, false)
          router.push('/login')
        } else if (session?.user) {
          mutate(session.user, false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase, mutate, router])

  return {
    user: data ?? null,
    loading: isLoading,
  }
}
