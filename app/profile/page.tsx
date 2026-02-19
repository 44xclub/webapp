'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseDateOnly } from '@/lib/date'
import {
  Loader2,
  LogOut,
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
  ChevronRight,
  BookOpen,
  TrendingDown,
  TrendingUp,
  Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useProfile, useRank, useReflection } from '@/lib/hooks'
import { BottomNav } from '@/components/shared/BottomNav'
import { StreakCard } from '@/components/shared/StreakCard'
import { DisciplineScoreModule } from '@/components/shared/DisciplineScoreModule'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { Button, Input, Select } from '@/components/ui'
import { calculateDisciplineLevel } from '@/lib/types'
import type { DisciplineBadge, Block, BlockMedia } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// Extended Block type with media
interface BlockWithMedia extends Block {
  block_media: BlockMedia[]
}

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

// Badge colors for each tier
const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Aligned': 'text-emerald-400',
  'Committed': 'text-blue-400',
  'Disciplined': 'text-indigo-400',
  'Elite': 'text-cyan-400',
  'Forged': 'text-amber-400',
  'Vanguard': 'text-rose-400',
  '44 Pro': 'text-purple-400',
}

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkinBlocks, setCheckinBlocks] = useState<BlockWithMedia[]>([])
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
      } catch { if (isMounted) { setAuthLoading(false); router.push('/login') } }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') router.push('/login')
      else if (session?.user) { setUser(session.user); setAuthLoading(false) }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [router, supabase])

  const { profile, loading: profileLoading, updateProfile, avatarUrl } = useProfile(user?.id)
  const { rank } = useRank(user?.id)
  const { cycles, currentCycle } = useReflection(user?.id)

  useEffect(() => {
    async function fetchCheckins() {
      if (!user?.id) return
      setCheckinsLoading(true)
      try {
        // Fetch last 2 check-ins for preview, ordered by performed_at then created_at
        const { data, error } = await supabase
          .from('blocks')
          .select('*, block_media(*)')
          .eq('user_id', user.id)
          .eq('block_type', 'checkin')
          .is('deleted_at', null)
          .order('performed_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(2)
        if (error) throw error
        setCheckinBlocks(data as BlockWithMedia[] || [])
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
    router.push('/')
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

  const handleAvatarUpload = async (path: string) => {
    try {
      await updateProfile({ avatar_path: path })
    } catch (err) {
      console.error('Failed to update avatar path:', err)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  const displayName = profile?.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-[100dvh] content-container" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      {/* Page Header */}
      <header className="sticky top-0 z-50 bg-[rgba(7,9,13,0.92)] backdrop-blur-[16px] border-b border-[var(--border-subtle)] safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-title">Profile</h1>
          <button onClick={handleSignOut} className="p-2 rounded-[var(--radius-button)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-3 pb-4 space-y-3">
        {/* Profile Card - compact */}
        <div className="section-card p-0 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-shrink-0">
              {user && (
                <AvatarUpload
                  userId={user.id}
                  currentPath={profile?.avatar_path || null}
                  displayName={displayName}
                  onUploadComplete={handleAvatarUpload}
                  resolvedAvatarUrl={avatarUrl}
                />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{displayName}</h2>
              <p className="text-[12px] text-[var(--text-tertiary)] truncate">{user?.email}</p>
            </div>
          </div>

          {/* Discipline Stats */}
          {(rank || disciplineLevel) && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2.5">
              <DisciplineScoreModule
                rank={rank}
                score={profile?.discipline_score}
                variant="full"
                showProgress={true}
                clickable={true}
              />
            </div>
          )}
        </div>

        {/* Edit Profile Section */}
        <div className="section-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-medium text-[var(--text-secondary)]">Profile Details</h3>
            {editing ? (
              <div className="flex items-center gap-2">
                <button onClick={handleCancelEdit} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X className="h-4 w-4" /></button>
                <button onClick={handleSaveProfile} disabled={saving} className="p-1.5 text-[var(--accent-blue)] hover:text-[#60a5fa]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-[12px] text-[var(--accent-blue)] hover:underline">Edit</button>
            )}
          </div>

          <div className={editing ? "space-y-4" : ""}>
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
              <>
                <ProfileRow icon={UserIcon} label="Display Name" value={profile?.display_name || 'Not set'} />
                <ProfileRow icon={Cake} label="Birth Date" value={profile?.birth_date ? `${profile.birth_date} (${age} years)` : 'Not set'} />
                <ProfileRow icon={Ruler} label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : 'Not set'} />
                <ProfileRow icon={Scale} label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'} />
                <ProfileRow icon={Settings} label="Email" value={user?.email || 'Not set'} />
                <ProfileRow icon={Clock} label="Timezone" value={profile?.timezone || 'Europe/London'} isLast />
              </>
            )}
          </div>
        </div>

        {/* Streak Strip - compact */}
        <StreakCard
          currentStreak={profile?.current_streak || 0}
          bestStreak={profile?.best_streak || 0}
          variant="strip"
        />

        {/* Reflection & Planning - Link to dedicated page */}
        <Link
          href="/profile/reflection"
          className="block section-card p-0 hover:bg-[var(--surface-2)] transition-colors"
        >
          <div className="px-[var(--space-card)] py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[var(--radius-button)] bg-[var(--accent-blue-muted)] flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-[var(--accent-blue)]" />
              </div>
              <div>
                <h3 className="text-label">Reflection & Planning</h3>
                {currentCycle && (
                  <p className="text-[11px] font-normal text-[var(--text-tertiary)] mt-0.5">
                    Current: {currentCycle.label.replace('Reflection — ', '')}
                    {' · '}
                    <span className={
                      currentCycle.displayStatus === 'submitted' ? 'text-emerald-400' :
                      currentCycle.displayStatus === 'draft' ? 'text-amber-400' : ''
                    }>
                      {currentCycle.displayStatus === 'not_started' ? 'Not started' :
                       currentCycle.displayStatus === 'draft' ? 'Draft' : 'Submitted'}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
        </Link>

        {/* Check-ins - Link to dedicated page */}
        <Link
          href="/profile/check-ins"
          className="block section-card p-0 hover:bg-[var(--surface-2)] transition-colors overflow-hidden"
        >
          <div className="px-[var(--space-card)] py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[var(--radius-button)] bg-[var(--accent-green-muted)] flex items-center justify-center">
                <Scale className="h-4 w-4 text-[var(--accent-green)]" />
              </div>
              <div>
                <h3 className="text-label">Check-ins</h3>
                <p className="text-[11px] font-normal text-[var(--text-tertiary)] mt-0.5">
                  Track your weight & progress
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
          </div>

          {/* Last 2 check-ins preview */}
          <div className="divide-y divide-[var(--border-subtle)]">
            {checkinsLoading ? (
              <div className="p-[var(--space-card)] flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : checkinBlocks.length === 0 ? (
              <div className="p-[var(--space-card)] text-center text-meta">
                No check-ins yet. Tap to add one.
              </div>
            ) : (
              checkinBlocks.map((block, index) => {
                const payload = block.payload as { weight?: number; body_fat_percent?: number }
                const media = block.block_media || []

                // Calculate delta from previous (next in array since sorted desc)
                let delta: number | null = null
                if (index === 0 && checkinBlocks.length > 1) {
                  const prevPayload = checkinBlocks[1].payload as { weight?: number }
                  if (payload?.weight && prevPayload?.weight) {
                    delta = payload.weight - prevPayload.weight
                  }
                }

                return (
                  <div
                    key={block.id}
                    className="px-[var(--space-card)] py-3 flex items-center justify-between"
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(`/profile/check-ins?open=${block.id}`)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-meta w-12">
                        {parseDateOnly(block.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-label">
                          {payload?.weight ? `${payload.weight} kg` : '—'}
                        </span>
                        {delta !== null && delta !== 0 && (
                          <span className={`text-micro normal-case flex items-center gap-0.5 ${delta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                            {Math.abs(delta).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {media.length > 0 && (
                        <span className="text-micro flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" /> {media.length}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Link>

        {/* Statistics */}
        <div className="section-card">
          <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-2">Statistics</h3>
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-[var(--radius-chip)] bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0">
                <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
              </div>
              <span className="text-[12px] text-[var(--text-tertiary)]">Member since</span>
            </div>
            <span className="text-[13px] text-[var(--text-primary)]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-[var(--radius-chip)] bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0">
                <Dumbbell className="h-3 w-3 text-[var(--text-muted)]" />
              </div>
              <span className="text-[12px] text-[var(--text-tertiary)]">Total Points</span>
            </div>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{profile?.discipline_score || 0}</span>
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

function ProfileRow({ icon: Icon, label, value, isLast }: { icon: typeof UserIcon; label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${isLast ? '' : 'border-b border-[var(--border-subtle)]'}`}>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-[var(--radius-chip)] bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0">
          <Icon className="h-3 w-3 text-[var(--text-muted)]" />
        </div>
        <span className="text-[12px] text-[var(--text-tertiary)]">{label}</span>
      </div>
      <span className="text-[13px] text-[var(--text-primary)]">{value}</span>
    </div>
  )
}
