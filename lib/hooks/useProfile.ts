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

  // Resolve avatar signed URL — cached separately with longer TTL
  const { data: avatarUrl } = useSWR<string | null>(
    profile?.avatar_path ? ['avatar-url', profile.avatar_path] : null,
    async () => {
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile!.avatar_path!, 3600)
      if (error || !data?.signedUrl) return null
      return data.signedUrl
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

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
