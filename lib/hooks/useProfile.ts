'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // Resolve avatar signed URL whenever profile.avatar_path changes
  useEffect(() => {
    if (!profile?.avatar_path) {
      setAvatarUrl(null)
      return
    }
    supabase.storage
      .from('avatars')
      .createSignedUrl(profile.avatar_path, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          setAvatarUrl(null)
        } else {
          setAvatarUrl(data.signedUrl)
        }
      })
  }, [profile?.avatar_path, supabase])

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

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
    avatarUrl,
  }
}
