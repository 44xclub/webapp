'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface AuthContextType {
  user: SupabaseUser | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Check if Supabase is configured
function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [configured, setConfigured] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const supabaseRef = useRef<ReturnType<typeof import('@/lib/supabase/client').createClient> | null>(null)

  // Initialize Supabase client only in browser and when configured
  useEffect(() => {
    if (typeof window !== 'undefined' && isSupabaseConfigured()) {
      const { createClient } = require('@/lib/supabase/client')
      supabaseRef.current = createClient()
      setConfigured(true)
    } else {
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

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          // Only redirect to login for protected routes
          const protectedRoutes = ['/app', '/structure', '/community', '/profile']
          if (protectedRoutes.some(route => pathname?.startsWith(route))) {
            router.push('/login')
          }
          setLoading(false)
          setProfileLoading(false)
          return
        }

        setUser(user)
        await fetchProfile(user.id)
        setLoading(false)
      } catch {
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
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [configured, router, fetchProfile, pathname])

  const signOut = useCallback(async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut()
    }
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, signOut, refreshProfile }}>
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
