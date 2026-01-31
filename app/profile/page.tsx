'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  LogOut,
  Flame,
  Trophy,
  Calendar,
  Dumbbell,
  User as UserIcon,
  Settings,
  Scale,
  Ruler,
  Cake,
  Clock,
  Check,
  X,
} from 'lucide-react'
import { useProfile } from '@/lib/hooks'
import { BottomNav } from '@/components/shared/BottomNav'
import { Button, Input, Select } from '@/components/ui'
import { calculateDisciplineLevel } from '@/lib/types'
import type { DisciplineBadge, Block } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/*
  44CLUB Profile Page
  Status. Stats. Settings.
*/

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
  'Initiated': 'text-text-muted',
  'Committed': 'text-accent-blue',
  'Elite': 'text-accent',
  'Forged': 'text-warning',
  '44-Pro': 'text-success',
}

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkinBlocks, setCheckinBlocks] = useState<Block[]>([])
  const [checkinsLoading, setCheckinsLoading] = useState(true)

  const [formData, setFormData] = useState({
    display_name: '',
    birth_date: '',
    height_cm: '',
    weight_kg: '',
    timezone: 'Europe/London',
  })

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!isMounted) return
        if (error || !user) { router.push('/login'); return }
        setUser(user)
        setAuthLoading(false)
      } catch { if (isMounted) router.push('/login') }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') router.push('/login')
      else if (session?.user) { setUser(session.user); setAuthLoading(false) }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [router, supabase])

  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id)

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

  const disciplineLevel = useMemo(() => profile ? calculateDisciplineLevel(profile.discipline_score) : null, [profile])

  const age = useMemo(() => {
    if (!profile?.birth_date) return null
    const birthDate = new Date(profile.birth_date)
    const today = new Date()
    let calculatedAge = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) calculatedAge--
    return calculatedAge
  }, [profile?.birth_date])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  const displayName = profile?.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen min-h-[100dvh] bg-canvas pb-20">
      {/* Page Header */}
      <header className="bg-surface border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-page-title font-semibold text-text-primary">Profile</h1>
          <button onClick={handleSignOut} className="p-2 rounded-[10px] text-text-muted hover:text-text-secondary hover:bg-canvas-card transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-surface rounded-[16px] border border-border overflow-hidden">
          <div className="p-6 flex flex-col items-center">
            <div className="mb-4">
              <div className="h-24 w-24 rounded-[16px] bg-canvas-card flex items-center justify-center border border-border">
                <span className="text-section-title font-semibold text-text-secondary">{initials}</span>
              </div>
            </div>
            <h2 className="text-page-title font-semibold text-text-primary mb-1">{displayName}</h2>
            <p className="text-secondary text-text-muted">{user?.email}</p>
          </div>

          {/* Discipline Stats */}
          {disciplineLevel && (
            <div className="border-t border-border px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-body font-semibold ${badgeColors[disciplineLevel.badge]}`}>{disciplineLevel.badge}</span>
                  <span className="text-secondary text-text-muted">Level {disciplineLevel.level}</span>
                </div>
                <div className="text-right">
                  <span className="text-body font-bold text-text-primary">{profile?.discipline_score}</span>
                  <span className="text-secondary text-text-muted ml-1">pts</span>
                </div>
              </div>
              {disciplineLevel.level < 44 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-meta text-text-muted">
                    <span>{disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel} to next</span>
                    <span>{Math.round(disciplineLevel.progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-canvas-card rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-500" style={{ width: `${disciplineLevel.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Profile Section */}
        <div className="bg-surface rounded-[16px] border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-body font-medium text-text-primary">Profile Details</h3>
            {editing ? (
              <div className="flex items-center gap-2">
                <button onClick={handleCancelEdit} className="p-1.5 text-text-muted hover:text-text-secondary"><X className="h-4 w-4" /></button>
                <button onClick={handleSaveProfile} disabled={saving} className="p-1.5 text-accent hover:text-accent/80">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-secondary text-accent hover:underline">Edit</button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {editing ? (
              <>
                <Input label="Display Name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} placeholder="Enter your display name" />
                <Input label="Birth Date" type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Height (cm)" type="number" value={formData.height_cm} onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })} placeholder="180" />
                  <Input label="Weight (kg)" type="number" step="0.1" value={formData.weight_kg} onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })} placeholder="75.0" />
                </div>
                <Select label="Timezone" value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))} />
              </>
            ) : (
              <div className="space-y-3">
                <ProfileRow icon={UserIcon} label="Display Name" value={profile?.display_name || 'Not set'} />
                <ProfileRow icon={Cake} label="Birth Date" value={profile?.birth_date ? `${profile.birth_date} (${age} years)` : 'Not set'} />
                <ProfileRow icon={Ruler} label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : 'Not set'} />
                <ProfileRow icon={Scale} label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'} />
                <ProfileRow icon={Settings} label="Email" value={user?.email || 'Not set'} />
                <ProfileRow icon={Clock} label="Timezone" value={profile?.timezone || 'Europe/London'} />
              </div>
            )}
          </div>
        </div>

        {/* Streak Stats */}
        <div className="bg-surface rounded-[16px] border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-body font-medium text-text-primary">Streaks</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-canvas-card rounded-[10px] border border-border">
              <Flame className="h-8 w-8 text-warning mx-auto mb-2" />
              <p className="text-section-title font-bold text-text-primary">{profile?.current_streak || 0}</p>
              <p className="text-meta text-text-muted">Current Streak</p>
            </div>
            <div className="text-center p-4 bg-canvas-card rounded-[10px] border border-border">
              <Trophy className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-section-title font-bold text-text-primary">{profile?.best_streak || 0}</p>
              <p className="text-meta text-text-muted">Best Streak</p>
            </div>
          </div>
        </div>

        {/* Check-ins */}
        <div className="bg-surface rounded-[16px] border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-body font-medium text-text-primary">Recent Check-ins</h3>
          </div>
          <div className="divide-y divide-border">
            {checkinsLoading ? (
              <div className="p-4 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div>
            ) : checkinBlocks.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-secondary">No check-ins recorded yet</div>
            ) : (
              checkinBlocks.map((block) => {
                const payload = block.payload as { weight?: number; body_fat_percent?: number }
                return (
                  <div key={block.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-text-muted" />
                      <div>
                        <p className="text-secondary font-medium text-text-primary">{payload?.weight ? `${payload.weight} kg` : 'Check-in'}</p>
                        <p className="text-meta text-text-muted">{new Date(block.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    {payload?.body_fat_percent && <span className="text-secondary text-text-muted">{payload.body_fat_percent}% BF</span>}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-surface rounded-[16px] border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-body font-medium text-text-primary">Statistics</h3>
          </div>
          <div className="divide-y divide-border">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-text-muted" />
                <span className="text-secondary text-text-primary">Member since</span>
              </div>
              <span className="text-secondary text-text-muted">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-5 w-5 text-text-muted" />
                <span className="text-secondary text-text-primary">Total Points</span>
              </div>
              <span className="text-secondary font-medium text-text-primary">{profile?.discipline_score || 0}</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSignOut} variant="secondary" className="w-full">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  )
}

function ProfileRow({ icon: Icon, label, value }: { icon: typeof UserIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-text-muted" />
      <div>
        <p className="text-meta text-text-muted">{label}</p>
        <p className="text-secondary text-text-primary">{value}</p>
      </div>
    </div>
  )
}
