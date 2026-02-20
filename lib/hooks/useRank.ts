'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { ProfileRank } from '@/lib/types'

/**
 * Hook to fetch rank data from v_profiles_rank view
 * Uses DB-provided level, badge, and progress calculations
 */
export function useRank(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])

  const { data: rank, isLoading: loading, mutate } = useSWR<ProfileRank | null>(
    userId ? ['rank', userId] : null,
    async () => {
      const { data, error } = await supabase
        .from('v_profiles_rank')
        .select('*')
        .eq('user_id', userId!)
        .single()

      if (error) {
        console.warn('[useRank] Failed to fetch from v_profiles_rank:', error)
        return null
      }
      return data as ProfileRank
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const refetch = useCallback(() => { mutate() }, [mutate])

  return { rank: rank ?? null, loading, refetch }
}

/**
 * Hook to fetch rank data for multiple users (e.g., team members)
 */
export function useRanks(userIds: string[]) {
  const supabase = useMemo(() => createClient(), [])
  const key = userIds.length > 0 ? ['ranks', ...userIds.sort()] : null

  const { data: ranks, isLoading: loading, mutate } = useSWR<Map<string, ProfileRank>>(
    key,
    async () => {
      const { data, error } = await supabase
        .from('v_profiles_rank')
        .select('*')
        .in('user_id', userIds)

      const rankMap = new Map<string, ProfileRank>()
      if (!error && data) {
        data.forEach((r) => rankMap.set(r.user_id, r as ProfileRank))
      }
      return rankMap
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const refetch = useCallback(() => { mutate() }, [mutate])

  return { ranks: ranks ?? new Map<string, ProfileRank>(), loading, refetch }
}
