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
    console.log('[Auth] Init effect running, window:', typeof window)

    if (typeof window === 'undefined') {
      console.log('[Auth] SSR detected, skipping')
      return
    }

    const isConfigured = isSupabaseConfigured()
    console.log('[Auth] Supabase configured:', isConfigured)

    if (!isConfigured) {
      console.log('[Auth] Supabase not configured, setting error')
      setError('Supabase is not configured. Please check your environment variables.')
      setLoading(false)
      setProfileLoading(false)
      return
    }

    try {
      console.log('[Auth] Creating Supabase client...')
      supabaseRef.current = createClient()
      console.log('[Auth] Supabase client created, setting configured=true')
      setConfigured(true)
    } catch (err) {
      console.error('[Auth] Failed to initialize Supabase:', err)
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
    console.log('[Auth] Auth check effect, configured:', configured, 'supabaseRef:', !!supabaseRef.current)

    if (!configured || !supabaseRef.current) {
      console.log('[Auth] Not ready, skipping auth check')
      return
    }

    const supabase = supabaseRef.current

    const checkAuth = async () => {
      console.log('[Auth] Starting auth check...')
      try {
        // Add timeout to getSession() - it should be instant but sometimes hangs
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
          setTimeout(() => {
            console.log('[Auth] getSession() timed out after 3s')
            resolve({ data: { session: null }, error: new Error('Session check timed out') })
          }, 3000)
        })

        console.log('[Auth] Calling getSession()...')
        const result = await Promise.race([sessionPromise, timeoutPromise])
        const { data: { session }, error: sessionError } = result
        console.log('[Auth] getSession() returned, session:', !!session, 'error:', sessionError)

        if (sessionError) {
          console.log('[Auth] Session error (not fatal):', sessionError.message)
          // Session error - user just needs to log in
          setLoading(false)
          setProfileLoading(false)
          return
        }

        if (!session?.user) {
          console.log('[Auth] No session found, setting loading=false')
          setLoading(false)
          setProfileLoading(false)
          return
        }

        console.log('[Auth] Session found, user:', session.user.id)
        setUser(session.user)
        await fetchProfile(session.user.id)
        setLoading(false)
      } catch (err) {
        console.error('[Auth] Auth check failed:', err)
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
