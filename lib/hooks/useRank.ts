'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProfileRank } from '@/lib/types'

/**
 * Hook to fetch rank data from v_profiles_rank view
 * Uses DB-provided level, badge, and progress calculations
 */
export function useRank(userId: string | undefined) {
  const [rank, setRank] = useState<ProfileRank | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchRank = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('v_profiles_rank')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // View might not exist yet - fall back gracefully
        console.warn('[useRank] Failed to fetch from v_profiles_rank:', error)
        setRank(null)
      } else {
        setRank(data as ProfileRank)
      }
    } catch (err) {
      console.error('[useRank] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchRank()
  }, [fetchRank])

  return { rank, loading, refetch: fetchRank }
}

/**
 * Hook to fetch rank data for multiple users (e.g., team members)
 */
export function useRanks(userIds: string[]) {
  const [ranks, setRanks] = useState<Map<string, ProfileRank>>(new Map())
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchRanks = useCallback(async () => {
    if (userIds.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('v_profiles_rank')
        .select('*')
        .in('user_id', userIds)

      if (error) {
        console.warn('[useRanks] Failed to fetch from v_profiles_rank:', error)
      } else if (data) {
        const rankMap = new Map<string, ProfileRank>()
        data.forEach((r) => rankMap.set(r.user_id, r as ProfileRank))
        setRanks(rankMap)
      }
    } catch (err) {
      console.error('[useRanks] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [userIds, supabase])

  useEffect(() => {
    fetchRanks()
  }, [fetchRanks])

  return { ranks, loading, refetch: fetchRanks }
}
