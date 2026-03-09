'use client'

import { useMemo } from 'react'
import { Dumbbell, ChevronRight } from 'lucide-react'
import { cleanProgrammeTitle } from '@/lib/hooks/useProgrammes'
import type { UserProgramme, ProgrammeSession, ProgrammeProgress } from '@/lib/types'

interface NextSessionCardProps {
  activeProgramme: UserProgramme | null
  sessions: ProgrammeSession[]
  progress: ProgrammeProgress | null
  onTap?: () => void
}

export function NextSessionCard({
  activeProgramme,
  sessions,
  progress,
  onTap,
}: NextSessionCardProps) {
  // Determine the next uncompleted session
  const nextSession = useMemo(() => {
    if (!sessions.length || !progress) return null
    // Next session is based on how many are completed
    const nextIndex = progress.completedSessions % sessions.length
    return sessions[nextIndex] || sessions[0]
  }, [sessions, progress])

  if (!activeProgramme?.programme_template || !nextSession) {
    return null
  }

  const programmeTitle = cleanProgrammeTitle(activeProgramme.programme_template.title)
  const sessionPayload = nextSession.payload as {
    session_focus?: string
    plan?: string
    exercise_matrix?: { exercise: string; sets?: number; reps?: string }[]
  } | null

  const sessionLabel = sessionPayload?.session_focus || nextSession.title || `Day ${nextSession.day_index + 1}`

  // Get first 3 exercises for preview
  const exercisePreview = useMemo(() => {
    if (!sessionPayload) return []
    if (sessionPayload.exercise_matrix?.length) {
      return sessionPayload.exercise_matrix.slice(0, 3).map((e) => e.exercise)
    }
    if (sessionPayload.plan) {
      return sessionPayload.plan.split('\n').filter(Boolean).slice(0, 3).map((line) => {
        // Clean up "Exercise - 4x8" format to just "Exercise"
        const dash = line.indexOf(' - ')
        return dash > 0 ? line.slice(0, dash).trim() : line.trim()
      })
    }
    return []
  }, [sessionPayload])

  return (
    <button
      onClick={onTap}
      className="w-full text-left section-card p-0 overflow-hidden hover:border-[rgba(255,255,255,0.12)] transition-colors group"
    >
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[8px] bg-[rgba(139,92,246,0.12)]">
              <Dumbbell className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Next Session</p>
              <p className="text-[10px] text-[var(--text-muted)]">{programmeTitle}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
        </div>

        <h4 className="text-[14px] font-semibold text-[var(--text-primary)] leading-tight mt-2">
          {sessionLabel}
        </h4>

        {/* Exercise preview */}
        {exercisePreview.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {exercisePreview.map((exercise, i) => (
              <span
                key={i}
                className="text-[11px] text-[var(--text-secondary)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-[6px]"
              >
                {exercise}
              </span>
            ))}
            {sessionPayload?.exercise_matrix && sessionPayload.exercise_matrix.length > 3 && (
              <span className="text-[11px] text-[var(--text-muted)] px-2 py-0.5">
                +{sessionPayload.exercise_matrix.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Progress bar */}
        {progress && progress.totalSessions > 0 && (
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              {progress.completedSessions}/{progress.totalSessions}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
