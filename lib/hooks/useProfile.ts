'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (profile doesn't exist yet)
        throw error
      }

      setProfile(data as Profile | null)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!userId) throw new Error('Not authenticated')

      const { data: updated, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...data,
        })
        .select()
        .single()

      if (error) throw error

      setProfile(updated as Profile)
      return updated as Profile
    },
    [userId, supabase]
  )

  return {
    profile,
    loading,
    updateProfile,
    hasHeight: !!profile?.height_cm,
  }
}
