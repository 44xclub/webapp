'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  Plus,
  Dumbbell,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit,
  Play,
} from 'lucide-react'
import { useProfile } from '@/lib/hooks'
import { usePersonalProgrammes } from '@/lib/hooks/usePersonalProgrammes'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { useToast } from '@/components/shared/Toast'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { PersonalProgramme, ProgrammeFocus } from '@/lib/types'

const focusLabels: Record<ProgrammeFocus, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  conditioning: 'Conditioning',
  hybrid: 'Hybrid',
}

const focusColors: Record<ProgrammeFocus, string> = {
  strength: 'text-red-400 bg-red-500/10',
  hypertrophy: 'text-purple-400 bg-purple-500/10',
  conditioning: 'text-cyan-400 bg-cyan-500/10',
  hybrid: 'text-amber-400 bg-amber-500/10',
}

export default function PersonalProgrammesPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

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
      } catch {
        if (isMounted) { setAuthLoading(false); router.push('/login') }
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

  const { profile, loading: profileLoading, avatarUrl } = useProfile(user?.id)
  const { showToast } = useToast()
  const {
    programmes,
    loading: programmesLoading,
    createProgramme,
    updateProgramme,
    deleteProgramme,
  } = usePersonalProgrammes({ userId: user?.id })

  const handleCreate = async (data: { title: string; days_per_week: number; focus: ProgrammeFocus }) => {
    const programme = await createProgramme(data)
    if (programme) {
      setShowCreateModal(false)
      router.push(`/programmes/${programme.id}`)
    }
  }

  const handleSubmit = async (programmeId: string) => {
    const success = await updateProgramme(programmeId, { status: 'submitted' })
    if (success) {
      showToast('status', 'Programme submitted for review.')
    }
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="min-h-screen min-h-[100dvh] bg-[#07090d] pb-20">
        <HeaderStrip profile={profile} loading={profileLoading} avatarUrl={avatarUrl} />

        <header className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-semibold text-[#eef2ff]">Personal Programmes</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#3b82f6] text-white text-[13px] font-medium"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
          <p className="text-[13px] text-[rgba(238,242,255,0.52)] mt-1">
            Build your own workout programmes
          </p>
        </header>

        <main className="px-4 py-4 space-y-3">
          {programmesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.45)]" />
            </div>
          ) : programmes.length === 0 ? (
            <EmptyState onCreateClick={() => setShowCreateModal(true)} />
          ) : (
            programmes.map((programme) => (
              <ProgrammeCard
                key={programme.id}
                programme={programme}
                onEdit={() => router.push(`/programmes/${programme.id}`)}
                onSubmit={() => handleSubmit(programme.id)}
                onDelete={() => deleteProgramme(programme.id)}
              />
            ))
          )}
        </main>

        <BottomNav />

        {showCreateModal && (
          <CreateProgrammeModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] p-6 border border-[rgba(255,255,255,0.06)] text-center">
      <Dumbbell className="h-12 w-12 text-[rgba(238,242,255,0.35)] mx-auto mb-4" />
      <h3 className="text-[16px] font-medium text-[#eef2ff] mb-2">No Programmes Yet</h3>
      <p className="text-[13px] text-[rgba(238,242,255,0.45)] mb-4">
        Create your first personal fitness programme to schedule structured workouts.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#3b82f6] text-white text-[13px] font-medium"
      >
        <Plus className="h-4 w-4" />
        Create Programme
      </button>
    </div>
  )
}

function ProgrammeCard({
  programme,
  onEdit,
  onSubmit,
  onDelete,
}: {
  programme: PersonalProgramme
  onEdit: () => void
  onSubmit: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const dayCount = programme.days?.length || 0

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <button
        onClick={onEdit}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-[rgba(238,242,255,0.52)]" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#eef2ff]">{programme.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] px-1.5 py-0.5 rounded-[4px] ${focusColors[programme.focus]}`}>
                {focusLabels[programme.focus]}
              </span>
              <span className="text-[11px] text-[rgba(238,242,255,0.45)]">
                {dayCount}/{programme.days_per_week} days
              </span>
              {programme.status === 'draft' && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] text-amber-400 bg-amber-500/10">
                  Draft
                </span>
              )}
              {programme.status === 'submitted' && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] text-blue-400 bg-blue-500/10">
                  Submitted
                </span>
              )}
              {programme.status === 'approved' && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] text-emerald-400 bg-emerald-500/10">
                  Approved
                </span>
              )}
              {programme.status === 'rejected' && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] text-rose-400 bg-rose-500/10">
                  Rejected
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-2 rounded-[8px] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          </button>
          <ChevronRight className="h-4 w-4 text-[rgba(238,242,255,0.35)]" />
        </div>
      </button>

      {showMenu && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-2 py-1.5 flex items-center gap-1">
          <button
            onClick={() => { onEdit(); setShowMenu(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.06)]"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </button>
          {programme.status === 'draft' && (
            <button
              onClick={() => { onSubmit(); setShowMenu(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] text-blue-400 hover:bg-blue-500/10"
            >
              <Play className="h-3.5 w-3.5" />
              Submit
            </button>
          )}
          <button
            onClick={() => { onDelete(); setShowMenu(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] text-rose-400 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function CreateProgrammeModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: { title: string; days_per_week: number; focus: ProgrammeFocus }) => void
}) {
  const [title, setTitle] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [focus, setFocus] = useState<ProgrammeFocus>('hypertrophy')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onCreate({ title: title.trim(), days_per_week: daysPerWeek, focus })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0f1115] rounded-t-[20px] sm:rounded-[20px] border-t border-[rgba(255,255,255,0.08)] sm:border p-5">
        <h2 className="text-[18px] font-semibold text-[#eef2ff] mb-4">Create Programme</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] text-[rgba(238,242,255,0.52)] mb-1.5">
              Programme Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hypertrophy Split"
              className="w-full px-3 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:border-[#3b82f6]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] text-[rgba(238,242,255,0.52)] mb-1.5">
              Days Per Week
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDaysPerWeek(n)}
                  className={`flex-1 py-2 rounded-[8px] text-[14px] font-medium transition-colors ${
                    daysPerWeek === n
                      ? 'bg-[#3b82f6] text-white'
                      : 'bg-[rgba(255,255,255,0.04)] text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-[rgba(238,242,255,0.52)] mb-1.5">
              Focus
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(focusLabels) as ProgrammeFocus[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocus(f)}
                  className={`py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                    focus === f
                      ? `${focusColors[f]} border border-current`
                      : 'bg-[rgba(255,255,255,0.04)] text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  {focusLabels[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.06)] text-[rgba(238,242,255,0.72)] text-[14px] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 py-2.5 rounded-[10px] bg-[#3b82f6] text-white text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
