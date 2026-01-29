'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  Settings,
  LogOut,
  Flame,
  Trophy,
  Calendar,
  Dumbbell,
  User as UserIcon,
  Camera,
  Scale,
  Ruler,
  Cake,
  Clock,
  ChevronRight,
  Check,
  X,
} from 'lucide-react'
import { useProfile } from '@/lib/hooks'
import { BottomNav } from '@/components/shared/BottomNav'
import { Button, Input, Select } from '@/components/ui'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile, DisciplineBadge, Block } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
]

const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Committed': 'text-blue-400',
  'Elite': 'text-purple-400',
  'Forged': 'text-amber-400',
  '44-Pro': 'text-yellow-400',
}

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [checkinBlocks, setCheckinBlocks] = useState<Block[]>([])
  const [checkinsLoading, setCheckinsLoading] = useState(true)

  // Edit form state
  const [formData, setFormData] = useState({
    display_name: '',
    birth_date: '',
    height_cm: '',
    weight_kg: '',
    timezone: 'Europe/London',
  })

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

  // Get signed URL for avatar
  useEffect(() => {
    async function getAvatarUrl() {
      if (!profile?.avatar_path) {
        setAvatarUrl(null)
        return
      }

      try {
        const { data } = await supabase.storage
          .from('avatars')
          .createSignedUrl(profile.avatar_path, 3600)

        if (data?.signedUrl) {
          setAvatarUrl(data.signedUrl)
        }
      } catch (err) {
        console.error('Failed to get avatar URL:', err)
        setAvatarUrl(null)
      }
    }

    getAvatarUrl()
  }, [profile?.avatar_path, supabase])

  // Fetch check-in blocks
  useEffect(() => {
    async function fetchCheckins() {
      if (!user?.id) return
      setCheckinsLoading(true)
      try {
        const { data, error } = await supabase
          .from('blocks')
          .select('*')
          .eq('user_id', user.id)
          .eq('block_type', 'checkin')
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .limit(10)

        if (error) throw error
        setCheckinBlocks(data as Block[] || [])
      } catch (err) {
        console.error('Failed to fetch check-ins:', err)
      } finally {
        setCheckinsLoading(false)
      }
    }

    fetchCheckins()
  }, [user?.id, supabase])

  // Set form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        birth_date: profile.birth_date || '',
        height_cm: profile.height_cm?.toString() || '',
        weight_kg: profile.weight_kg?.toString() || '',
        timezone: profile.timezone || 'Europe/London',
      })
    }
  }, [profile])

  const disciplineLevel = useMemo(
    () => profile ? calculateDisciplineLevel(profile.discipline_score) : null,
    [profile]
  )

  // Calculate age from birth date
  const age = useMemo(() => {
    if (!profile?.birth_date) return null
    const birthDate = new Date(profile.birth_date)
    const today = new Date()
    let calculatedAge = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--
    }
    return calculatedAge
  }, [profile?.birth_date])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    setAvatarUploading(true)
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}/avatar-${Date.now()}.${ext}`

      // Delete old avatar if exists
      if (profile?.avatar_path) {
        await supabase.storage.from('avatars').remove([profile.avatar_path])
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Update profile with new avatar path
      await updateProfile({ avatar_path: fileName })

      // Get new signed URL
      const { data } = await supabase.storage
        .from('avatars')
        .createSignedUrl(fileName, 3600)

      if (data?.signedUrl) {
        setAvatarUrl(data.signedUrl)
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateProfile({
        display_name: formData.display_name || null,
        birth_date: formData.birth_date || null,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        timezone: formData.timezone,
      })
      setEditing(false)
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        birth_date: profile.birth_date || '',
        height_cm: profile.height_cm?.toString() || '',
        weight_kg: profile.weight_kg?.toString() || '',
        timezone: profile.timezone || 'Europe/London',
      })
    }
    setEditing(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const displayName = profile?.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header - No HeaderStrip on Profile page per requirements */}
      <header className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
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
        {/* Profile Card with Avatar */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 flex flex-col items-center">
            {/* Avatar with upload */}
            <div className="relative mb-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center ring-4 ring-primary/20">
                {avatarUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {initials}
                  </span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4 text-primary-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>
            </div>

            {/* Name & Email */}
            <h2 className="text-xl font-bold text-foreground mb-1">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          {/* Discipline Stats */}
          {disciplineLevel && (
            <div className="border-t border-border px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${badgeColors[disciplineLevel.badge]}`}>
                    {disciplineLevel.badge}
                  </span>
                  <span className="text-sm text-muted-foreground">Level {disciplineLevel.level}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{profile?.discipline_score}</span>
                  <span className="text-sm text-muted-foreground ml-1">pts</span>
                </div>
              </div>
              {disciplineLevel.level < 44 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel} to next level</span>
                    <span>{Math.round(disciplineLevel.progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${disciplineLevel.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Profile Section */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-medium text-foreground">Profile Details</h3>
            {editing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="p-1.5 text-primary hover:text-primary/80"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {editing ? (
              <>
                <Input
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Enter your display name"
                />
                <Input
                  label="Birth Date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Height (cm)"
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    placeholder="180"
                  />
                  <Input
                    label="Weight (kg)"
                    type="number"
                    step="0.1"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    placeholder="75.0"
                  />
                </div>
                <Select
                  label="Timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
                />
              </>
            ) : (
              <div className="space-y-3">
                <ProfileRow
                  icon={UserIcon}
                  label="Display Name"
                  value={profile?.display_name || 'Not set'}
                />
                <ProfileRow
                  icon={Cake}
                  label="Birth Date"
                  value={profile?.birth_date ? `${profile.birth_date} (${age} years)` : 'Not set'}
                />
                <ProfileRow
                  icon={Ruler}
                  label="Height"
                  value={profile?.height_cm ? `${profile.height_cm} cm` : 'Not set'}
                />
                <ProfileRow
                  icon={Scale}
                  label="Weight"
                  value={profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}
                />
                <ProfileRow
                  icon={Settings}
                  label="Email"
                  value={user?.email || 'Not set'}
                />
                <ProfileRow
                  icon={Clock}
                  label="Timezone"
                  value={profile?.timezone || 'Europe/London'}
                />
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

        {/* Check-ins */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-foreground">Recent Check-ins</h3>
          </div>
          <div className="divide-y divide-border">
            {checkinsLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : checkinBlocks.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No check-ins recorded yet
              </div>
            ) : (
              checkinBlocks.map((block) => {
                const payload = block.payload as any
                return (
                  <div key={block.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {payload?.weight ? `${payload.weight} kg` : 'Check-in'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(block.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {payload?.body_fat_percent && (
                      <span className="text-sm text-muted-foreground">
                        {payload.body_fat_percent}% BF
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Statistics */}
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
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
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

// Helper component for profile rows
function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}
