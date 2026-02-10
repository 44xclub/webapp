'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  GripVertical,
  Save,
} from 'lucide-react'
import { usePersonalProgrammes, usePersonalProgramme } from '@/lib/hooks/usePersonalProgrammes'
import { useToast } from '@/components/shared/Toast'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { PersonalProgrammeDay, PersonalProgrammeExercise, ProgrammeFocus } from '@/lib/types'

const focusLabels: Record<ProgrammeFocus, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  conditioning: 'Conditioning',
  hybrid: 'Hybrid',
}

export default function ProgrammeEditorPage() {
  const router = useRouter()
  const params = useParams()
  const programmeId = params.id as string

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

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
        if (isMounted) router.push('/login')
      }
    }
    checkAuth()
    return () => { isMounted = false }
  }, [router, supabase])

  const { programme, loading, refetch } = usePersonalProgramme(programmeId)
  const { showToast } = useToast()
  const {
    addDay,
    updateDay,
    deleteDay,
    addExercise,
    updateExercise,
    deleteExercise,
    updateProgramme,
  } = usePersonalProgrammes({ userId: user?.id })

  // Auto-expand first day or new day
  useEffect(() => {
    if (programme?.days && programme.days.length > 0 && !expandedDay) {
      setExpandedDay(programme.days[0].id)
    }
  }, [programme?.days, expandedDay])

  const handleAddDay = async () => {
    if (!programme) return
    const nextIndex = (programme.days?.length || 0) + 1
    if (nextIndex > programme.days_per_week) return

    const day = await addDay(programme.id, {
      day_index: nextIndex,
      title: `Day ${nextIndex}`,
    })
    if (day) {
      setExpandedDay(day.id)
      refetch()
    }
  }

  const handleSubmit = async () => {
    if (!programme) return
    const success = await updateProgramme(programme.id, { status: 'submitted' })
    if (success) {
      showToast('status', 'Programme submitted for review.')
      refetch()
    }
  }

  if (authLoading || loading) {
    return (
      <div className="app-shell">
        <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
        </div>
      </div>
    )
  }

  if (!programme) {
    return (
      <div className="app-shell">
        <div className="min-h-screen bg-[#07090d] p-4">
          <p className="text-[rgba(238,242,255,0.52)]">Programme not found</p>
        </div>
      </div>
    )
  }

  const canAddDay = (programme.days?.length || 0) < programme.days_per_week

  return (
    <div className="app-shell">
      <div className="min-h-screen min-h-[100dvh] bg-[#07090d] pb-6">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#07090d]/95 backdrop-blur-sm border-b border-[rgba(255,255,255,0.06)]">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/programmes')}
                className="p-2 -ml-2 rounded-[10px] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-[rgba(238,242,255,0.72)]" />
              </button>
              <div>
                <h1 className="text-[18px] font-semibold text-[#eef2ff]">{programme.title}</h1>
                <p className="text-[12px] text-[rgba(238,242,255,0.45)]">
                  {focusLabels[programme.focus]} • {programme.days_per_week} days/week
                </p>
              </div>
            </div>
            {programme.status === 'draft' && (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-blue-500/20 text-blue-400 text-[13px] font-medium"
              >
                <Save className="h-4 w-4" />
                Submit
              </button>
            )}
          </div>
        </header>

        {/* Days List */}
        <main className="px-4 py-4 space-y-3">
          {programme.days?.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              expanded={expandedDay === day.id}
              onToggle={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
              onUpdateDay={async (data) => {
                await updateDay(day.id, data)
                refetch()
              }}
              onDeleteDay={async () => {
                await deleteDay(day.id)
                refetch()
              }}
              onAddExercise={async (data) => {
                await addExercise(day.id, data)
                refetch()
              }}
              onUpdateExercise={async (exerciseId, data) => {
                await updateExercise(exerciseId, data)
                refetch()
              }}
              onDeleteExercise={async (exerciseId) => {
                await deleteExercise(exerciseId)
                refetch()
              }}
            />
          ))}

          {/* Add Day Button */}
          {canAddDay && (
            <button
              onClick={handleAddDay}
              className="w-full py-3 rounded-[12px] border-2 border-dashed border-[rgba(255,255,255,0.12)] text-[rgba(238,242,255,0.52)] text-[14px] font-medium flex items-center justify-center gap-2 hover:border-[rgba(255,255,255,0.2)] hover:text-[rgba(238,242,255,0.72)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Day {(programme.days?.length || 0) + 1}
            </button>
          )}

          {!canAddDay && programme.days?.length === programme.days_per_week && (
            <p className="text-center text-[12px] text-[rgba(238,242,255,0.40)] py-2">
              All {programme.days_per_week} days configured
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

function DayCard({
  day,
  expanded,
  onToggle,
  onUpdateDay,
  onDeleteDay,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
}: {
  day: PersonalProgrammeDay
  expanded: boolean
  onToggle: () => void
  onUpdateDay: (data: { title?: string }) => Promise<void>
  onDeleteDay: () => Promise<void>
  onAddExercise: (data: { name: string; sets?: number; reps?: string; notes?: string; sort_order?: number }) => Promise<void>
  onUpdateExercise: (id: string, data: { name?: string; sets?: number | null; reps?: string | null; notes?: string | null }) => Promise<void>
  onDeleteExercise: (id: string) => Promise<void>
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(day.title)
  const [showAddExercise, setShowAddExercise] = useState(false)

  const handleSaveTitle = async () => {
    if (title.trim() && title !== day.title) {
      await onUpdateDay({ title: title.trim() })
    }
    setEditingTitle(false)
  }

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Day Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[8px] bg-[#3b82f6]/20 text-[#3b82f6] text-[14px] font-bold flex items-center justify-center">
            {day.day_index}
          </span>
          {editingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded-[6px] bg-[rgba(255,255,255,0.08)] text-[14px] text-[#eef2ff] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
              autoFocus
            />
          ) : (
            <span
              onClick={(e) => { e.stopPropagation(); setEditingTitle(true) }}
              className="text-[14px] font-medium text-[#eef2ff] cursor-text hover:underline"
            >
              {day.title}
            </span>
          )}
          <span className="text-[12px] text-[rgba(238,242,255,0.45)]">
            {day.exercises?.length || 0} exercises
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteDay() }}
            className="p-1.5 rounded-[6px] text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          )}
        </div>
      </button>

      {/* Exercises List */}
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)]">
          {day.exercises?.map((exercise, idx) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              isLast={idx === (day.exercises?.length || 0) - 1 && !showAddExercise}
              onUpdate={(data) => onUpdateExercise(exercise.id, data)}
              onDelete={() => onDeleteExercise(exercise.id)}
            />
          ))}

          {showAddExercise ? (
            <AddExerciseRow
              sortOrder={(day.exercises?.length || 0)}
              onAdd={async (data) => {
                await onAddExercise(data)
                setShowAddExercise(false)
              }}
              onCancel={() => setShowAddExercise(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddExercise(true)}
              className="w-full px-4 py-2.5 flex items-center gap-2 text-[13px] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.08)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ExerciseRow({
  exercise,
  isLast,
  onUpdate,
  onDelete,
}: {
  exercise: PersonalProgrammeExercise
  isLast: boolean
  onUpdate: (data: { name?: string; sets?: number | null; reps?: string | null; notes?: string | null }) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(exercise.exercise_name)
  const [sets, setSets] = useState(exercise.sets?.toString() || '')
  const [reps, setReps] = useState(exercise.reps || '')

  const handleSave = () => {
    onUpdate({
      name: name.trim() || exercise.exercise_name,
      sets: sets ? parseInt(sets) : null,
      reps: reps || null,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={`px-4 py-3 ${!isLast ? 'border-b border-[rgba(255,255,255,0.06)]' : ''}`}>
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            className="w-full px-3 py-2 rounded-[8px] bg-[rgba(255,255,255,0.06)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="Sets"
              className="w-20 px-3 py-2 rounded-[8px] bg-[rgba(255,255,255,0.06)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            />
            <input
              type="text"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="Reps (e.g., 8-12)"
              className="flex-1 px-3 py-2 rounded-[8px] bg-[rgba(255,255,255,0.06)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-[8px] text-[12px] text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.06)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-[8px] bg-[#3b82f6] text-white text-[12px] font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`px-4 py-2.5 flex items-center gap-3 group ${!isLast ? 'border-b border-[rgba(255,255,255,0.06)]' : ''}`}>
      <GripVertical className="h-4 w-4 text-[rgba(238,242,255,0.25)] cursor-grab" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#eef2ff] truncate">{exercise.exercise_name}</p>
      </div>
      {(exercise.sets || exercise.reps) && (
        <div className="flex items-center gap-1 text-[12px] text-[rgba(238,242,255,0.52)]">
          {exercise.sets && <span>{exercise.sets} sets</span>}
          {exercise.sets && exercise.reps && <span>×</span>}
          {exercise.reps && <span>{exercise.reps}</span>}
        </div>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded-[4px] text-[rgba(238,242,255,0.52)] hover:text-[#eef2ff] hover:bg-[rgba(255,255,255,0.06)]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded-[4px] text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function AddExerciseRow({
  sortOrder,
  onAdd,
  onCancel,
}: {
  sortOrder: number
  onAdd: (data: { name: string; sets?: number; reps?: string; sort_order: number }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      sets: sets ? parseInt(sets) : undefined,
      reps: reps || undefined,
      sort_order: sortOrder,
    })
  }

  return (
    <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(59,130,246,0.04)]">
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exercise name"
          className="w-full px-3 py-2 rounded-[8px] bg-[rgba(255,255,255,0.06)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          autoFocus
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            placeholder="Sets"
            className="w-20 px-3 py-2 rounded-[8px] bg-[rgba(255,255,255,0.06)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          />
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="Reps (e.g., 8-12)"
            className="flex-1 px-3 py-2 rounded-[8px] bg-[rgba(255,255,255,0.06)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-[8px] text-[12px] text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.06)]"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-3 py-1.5 rounded-[8px] bg-[#3b82f6] text-white text-[12px] font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
