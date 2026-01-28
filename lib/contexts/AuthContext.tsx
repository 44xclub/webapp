'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

interface AuthContextType {
  user: SupabaseUser | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  // Initialize Supabase client only in browser and when configured
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please check your environment variables.')
      setLoading(false)
      setProfileLoading(false)
      return
    }

    try {
      supabaseRef.current = createClient()
      setConfigured(true)
    } catch (err) {
      console.error('Failed to initialize Supabase:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize Supabase')
      setLoading(false)
      setProfileLoading(false)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabaseRef.current) return

    setProfileLoading(true)
    try {
      const { data, error } = await supabaseRef.current
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setProfile(data as Profile | null)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    if (!configured || !supabaseRef.current) return

    const supabase = supabaseRef.current
    let timeoutId: NodeJS.Timeout

    const checkAuth = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth check timed out'))
          }, 10000) // 10 second timeout
        })

        const authPromise = supabase.auth.getUser()
        const { data: { user } } = await Promise.race([authPromise, timeoutPromise])

        clearTimeout(timeoutId)

        if (!user) {
          // No user found - let AuthenticatedLayout handle redirect
          setLoading(false)
          setProfileLoading(false)
          return
        }

        setUser(user)
        await fetchProfile(user.id)
        setLoading(false)
      } catch (err) {
        clearTimeout(timeoutId)
        console.error('Auth check failed:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setLoading(false)
        setProfileLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        } else if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [configured, fetchProfile])

  const signOut = useCallback(async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut()
    }
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, error, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
