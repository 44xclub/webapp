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
  'Initiated': 'text-[rgba(238,242,255,0.50)]',
  'Committed': 'text-[#60a5fa]',
  'Elite': 'text-[#22d3ee]',
  'Forged': 'text-[#f59e0b]',
  '44-Pro': 'text-[#a78bfa]',
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
      <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.35)]" />
      </div>
    )
  }

  const displayName = profile?.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#07090d] pb-20">
      {/* Page Header */}
      <header className="sticky top-0 z-50 bg-[rgba(7,9,13,0.92)] backdrop-blur-[16px] border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-[20px] font-semibold text-[#eef2ff]">Profile</h1>
          <button onClick={handleSignOut} className="p-2 rounded-[10px] text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="p-5 flex flex-col items-center">
            <div className="mb-3">
              <div className="h-20 w-20 rounded-[14px] bg-[rgba(255,255,255,0.04)] flex items-center justify-center border border-[rgba(255,255,255,0.08)]">
                <span className="text-[18px] font-semibold text-[rgba(238,242,255,0.65)]">{initials}</span>
              </div>
            </div>
            <h2 className="text-[18px] font-semibold text-[#eef2ff] mb-0.5">{displayName}</h2>
            <p className="text-[13px] text-[rgba(238,242,255,0.45)]">{user?.email}</p>
          </div>

          {/* Discipline Stats */}
          {disciplineLevel && (
            <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[14px] font-semibold ${badgeColors[disciplineLevel.badge]}`}>{disciplineLevel.badge}</span>
                  <span className="text-[12px] text-[rgba(238,242,255,0.40)]">Level {disciplineLevel.level}</span>
                </div>
                <div className="text-right">
                  <span className="text-[14px] font-bold text-[#eef2ff]">{profile?.discipline_score}</span>
                  <span className="text-[12px] text-[rgba(238,242,255,0.40)] ml-1">pts</span>
                </div>
              </div>
              {disciplineLevel.level < 44 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[rgba(238,242,255,0.40)]">
                    <span>{disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel} to next</span>
                    <span>{Math.round(disciplineLevel.progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6] transition-all duration-500" style={{ width: `${disciplineLevel.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Profile Section */}
        <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#eef2ff]">Profile Details</h3>
            {editing ? (
              <div className="flex items-center gap-2">
                <button onClick={handleCancelEdit} className="p-1.5 text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.72)]"><X className="h-4 w-4" /></button>
                <button onClick={handleSaveProfile} disabled={saving} className="p-1.5 text-[#3b82f6] hover:text-[#60a5fa]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-[12px] font-medium text-[#3b82f6] hover:underline">Edit</button>
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
              <div className="space-y-2.5">
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
        <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)]">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[14px] font-semibold text-[#eef2ff]">Streaks</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="text-center p-3.5 bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)]">
              <Flame className="h-7 w-7 text-[#f59e0b] mx-auto mb-1.5" />
              <p className="text-[18px] font-bold text-[#eef2ff]">{profile?.current_streak || 0}</p>
              <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Current Streak</p>
            </div>
            <div className="text-center p-3.5 bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)]">
              <Trophy className="h-7 w-7 text-[#22c55e] mx-auto mb-1.5" />
              <p className="text-[18px] font-bold text-[#eef2ff]">{profile?.best_streak || 0}</p>
              <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Best Streak</p>
            </div>
          </div>
        </div>

        {/* Check-ins */}
        <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)]">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[14px] font-semibold text-[#eef2ff]">Recent Check-ins</h3>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {checkinsLoading ? (
              <div className="p-4 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-[rgba(238,242,255,0.30)]" /></div>
            ) : checkinBlocks.length === 0 ? (
              <div className="p-4 text-center text-[12px] text-[rgba(238,242,255,0.40)]">No check-ins recorded yet</div>
            ) : (
              checkinBlocks.map((block) => {
                const payload = block.payload as { weight?: number; body_fat_percent?: number }
                return (
                  <div key={block.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Scale className="h-4 w-4 text-[rgba(238,242,255,0.35)]" />
                      <div>
                        <p className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">{payload?.weight ? `${payload.weight} kg` : 'Check-in'}</p>
                        <p className="text-[11px] text-[rgba(238,242,255,0.40)]">{new Date(block.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    {payload?.body_fat_percent && <span className="text-[12px] text-[rgba(238,242,255,0.45)]">{payload.body_fat_percent}% BF</span>}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)]">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[14px] font-semibold text-[#eef2ff]">Statistics</h3>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-[rgba(238,242,255,0.35)]" />
                <span className="text-[13px] text-[rgba(238,242,255,0.85)]">Member since</span>
              </div>
              <span className="text-[12px] text-[rgba(238,242,255,0.45)]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-4 w-4 text-[rgba(238,242,255,0.35)]" />
                <span className="text-[13px] text-[rgba(238,242,255,0.85)]">Total Points</span>
              </div>
              <span className="text-[13px] font-medium text-[#eef2ff]">{profile?.discipline_score || 0}</span>
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
    <div className="flex items-center gap-3 py-1">
      <Icon className="h-4 w-4 text-[rgba(238,242,255,0.35)]" />
      <div>
        <p className="text-[11px] text-[rgba(238,242,255,0.40)]">{label}</p>
        <p className="text-[13px] text-[rgba(238,242,255,0.85)]">{value}</p>
      </div>
    </div>
  )
}
