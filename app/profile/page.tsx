'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Settings, LogOut, Flame, Trophy, Calendar, Dumbbell, User as UserIcon } from 'lucide-react'
import { useProfile } from '@/lib/hooks'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { ProfileCard } from '@/components/structure/ProfileCard'
import { Button, Input } from '@/components/ui'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Auth check
  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (!isMounted) return

        if (error || !user) {
          router.push('/login')
          return
        }
        setUser(user)
        setAuthLoading(false)
      } catch (err) {
        if (isMounted) {
          router.push('/login')
        }
      }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
          setAuthLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Data hooks
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id)

  // Set display name when profile loads
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
  }, [profile?.display_name])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateProfile({ display_name: displayName || null })
      setEditing(false)
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        {!profileLoading && profile && (
          <ProfileCard profile={profile} />
        )}

        {/* User Info */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-medium text-foreground">Account Info</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-sm text-primary hover:underline"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="p-4 space-y-4">
            {editing ? (
              <>
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Display Name</p>
                    <p className="text-sm text-foreground">{profile?.display_name || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Timezone</p>
                    <p className="text-sm text-foreground">{profile?.timezone || 'Europe/London'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Streak Stats */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-foreground">Streaks</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-secondary rounded-lg">
              <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{profile?.current_streak || 0}</p>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{profile?.best_streak || 0}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-foreground">Statistics</h3>
          </div>
          <div className="divide-y divide-border">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Member since</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Total Points</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {profile?.discipline_score || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleSignOut}
          variant="secondary"
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
