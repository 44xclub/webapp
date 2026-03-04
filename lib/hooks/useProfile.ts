'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export function useProfile(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])

  const { data: profile, isLoading: loading, mutate } = useSWR<Profile | null>(
    userId ? ['profile', userId] : null,
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return (data as Profile) ?? null
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  // Resolve avatar public URL — no network request needed since the bucket is public
  const avatarUrl = useMemo(() => {
    if (!profile?.avatar_path) return null
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(profile.avatar_path)
    return data?.publicUrl ?? null
  }, [profile?.avatar_path, supabase])

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!userId) throw new Error('Not authenticated')

      const { data: updated, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...data })
        .select()
        .single()

      if (error) throw error

      mutate(updated as Profile, false)
      return updated as Profile
    },
    [userId, supabase, mutate]
  )

  return {
    profile: profile ?? null,
    loading,
    updateProfile,
    hasHeight: !!profile?.height_cm,
    avatarUrl: avatarUrl ?? null,
  }
}
