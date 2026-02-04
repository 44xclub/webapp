'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Loader2, Calendar, Check } from 'lucide-react'
import type { ProgrammeTemplate, ProgrammeSession, UserProgramme } from '@/lib/types'

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

interface ProgrammeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  programme: ProgrammeTemplate | null
  sessions: ProgrammeSession[]
  loadingSessions: boolean
  isActive: boolean
  onActivate?: (programme: ProgrammeTemplate) => void
  activating?: boolean
  // Active programme actions
  onScheduleWeek?: (selectedDays: number[], defaultTime?: string) => Promise<number>
  onDeactivate?: () => Promise<void>
}

export function ProgrammeDetailModal({
  isOpen,
  onClose,
  programme,
  sessions,
  loadingSessions,
  isActive,
  onActivate,
  activating = false,
  onScheduleWeek,
  onDeactivate,
}: ProgrammeDetailModalProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(1)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5])
  const [defaultTime, setDefaultTime] = useState('07:00')
  const [scheduling, setScheduling] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && sessions.length > 0) {
      setSelectedDayIndex(sessions[0].day_index)
    }
  }, [isOpen, sessions])

  const uniqueDays = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.day_index))).sort((a, b) => a - b)
  }, [sessions])

  const selectedSession = useMemo(() => {
    return sessions.find(s => s.day_index === selectedDayIndex)
  }, [sessions, selectedDayIndex])

  const handleToggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSchedule = async () => {
    if (!onScheduleWeek || selectedDays.length === 0) return
    setScheduling(true)
    try {
      const count = await onScheduleWeek(selectedDays, defaultTime)
      setScheduledCount(count)
      setTimeout(() => {
        setScheduleModalOpen(false)
        setScheduledCount(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to schedule week:', err)
    } finally {
      setScheduling(false)
    }
  }

  const handleDeactivate = async () => {
    if (!onDeactivate) return
    setDeactivating(true)
    try {
      await onDeactivate()
      setDeactivateConfirmOpen(false)
      onClose()
    } catch (err) {
      console.error('Failed to deactivate programme:', err)
    } finally {
      setDeactivating(false)
    }
  }

  const renderSessionPayload = (payload: any) => {
    if (!payload) return null

    if (payload.plan && typeof payload.plan === 'string') {
      const exercises = payload.plan.split('\\n').filter((line: string) => line.trim())
      return (
        <div className="space-y-1">
          {exercises.map((exercise: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2.5 py-2 px-2.5 rounded-[10px] bg-[rgba(255,255,255,0.03)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] mt-[7px] flex-shrink-0" />
              <p className="text-[13px] text-[rgba(238,242,255,0.85)] flex-1">{exercise.trim()}</p>
            </div>
          ))}
        </div>
      )
    }

    const exercises = payload.exercise_matrix || payload.exercises || []
    if (exercises.length === 0) return null

    return (
      <div className="space-y-1">
        {exercises.map((ex: any, idx: number) => (
          <div key={idx} className="flex items-start gap-2.5 py-2 px-2.5 rounded-[10px] bg-[rgba(255,255,255,0.03)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] mt-[7px] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[rgba(238,242,255,0.90)]">{ex.exercise || ex.name || `Exercise ${idx + 1}`}</p>
              <div className="flex flex-wrap gap-2 mt-0.5">
                {ex.sets && <span className="text-[11px] text-[rgba(238,242,255,0.40)]">{ex.sets} sets</span>}
                {ex.reps && <span className="text-[11px] text-[rgba(238,242,255,0.40)]">{ex.reps} reps</span>}
                {ex.weight && <span className="text-[11px] text-[rgba(238,242,255,0.40)]">{ex.weight}</span>}
                {ex.duration && <span className="text-[11px] text-[rgba(238,242,255,0.40)]">{ex.duration}</span>}
              </div>
              {ex.notes && <p className="text-[11px] text-[rgba(238,242,255,0.35)] mt-0.5">{ex.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!programme) return null

  const imageUrl = programme.hero_image_path
    ? programme.hero_image_path.startsWith('http')
      ? programme.hero_image_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${programme.hero_image_path}`
    : null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} showClose={false} className="!max-w-lg">
        <div className="relative">
          {/* Hero Image */}
          <div className="relative h-[200px]">
            {imageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1014] via-[#0d1014]/40 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all backdrop-blur-sm"
            >
              <span className="text-[16px]">&#x2715;</span>
            </button>

            {/* Active badge */}
            {isActive && (
              <span className="absolute bottom-4 left-4 text-[10px] font-bold text-white bg-[#f97316] px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> Active
              </span>
            )}
          </div>

          {/* Content */}
          <div className="px-4 pb-4 -mt-2">
            <h2 className="text-[20px] font-bold text-[#eef2ff] mb-1.5">{programme.title}</h2>

            {programme.overview && (
              <p className="text-[13px] text-[rgba(238,242,255,0.55)] leading-relaxed mb-4">
                {programme.overview}
              </p>
            )}

            {/* Plan Details */}
            {(programme.structure || programme.equipment) && (
              <div className="space-y-2.5 mb-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.35)] font-semibold">Plan Details</p>
                {programme.structure && (
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-[rgba(238,242,255,0.45)]">Structure</span>
                    <span className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">{programme.structure}</span>
                  </div>
                )}
                {programme.equipment && (
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-[rgba(238,242,255,0.45)]">Equipment</span>
                    <span className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">{programme.equipment}</span>
                  </div>
                )}
                {programme.tags && programme.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {programme.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-medium text-[rgba(238,242,255,0.50)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sessions */}
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[rgba(238,242,255,0.35)]" />
              </div>
            ) : uniqueDays.length > 0 ? (
              <div className="border-t border-[rgba(255,255,255,0.06)] pt-3">
                <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.35)] font-semibold mb-2">Sessions</p>

                {/* Day Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                  {uniqueDays.map((dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => setSelectedDayIndex(dayIndex)}
                      className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-all duration-150 border ${
                        selectedDayIndex === dayIndex
                          ? 'bg-[#f97316] text-white border-transparent'
                          : 'bg-[rgba(255,255,255,0.03)] text-[rgba(238,242,255,0.55)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                      }`}
                    >
                      Day {dayIndex}
                    </button>
                  ))}
                </div>

                {/* Selected Session */}
                {selectedSession && (
                  <div className="space-y-2 mt-2">
                    <div className="p-2.5 bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)]">
                      <p className="text-[14px] font-semibold text-[rgba(238,242,255,0.90)]">{selectedSession.title}</p>
                    </div>
                    {renderSessionPayload(selectedSession.payload)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-[rgba(238,242,255,0.35)] py-3 text-center border-t border-[rgba(255,255,255,0.06)]">
                No sessions defined for this programme.
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-4 mt-2">
              {isActive ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setScheduleModalOpen(true) }}
                    className="flex-1"
                  >
                    <Calendar className="h-3.5 w-3.5" /> Schedule Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeactivateConfirmOpen(true) }}
                    className="flex-1 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    Deactivate
                  </Button>
                </>
              ) : onActivate ? (
                <Button
                  onClick={() => onActivate(programme)}
                  disabled={activating}
                  className="w-full"
                >
                  {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate Programme'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>

      {/* Schedule Week Modal */}
      <Modal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule Week">
        <div className="p-4 space-y-4">
          {scheduledCount !== null ? (
            <div className="text-center py-8">
              <div className="p-3 rounded-[10px] bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.15)] inline-block mb-3">
                <Check className="h-6 w-6 text-[#22c55e]" />
              </div>
              <p className="text-[14px] font-medium text-[#eef2ff]">
                {scheduledCount} workout{scheduledCount !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-[rgba(238,242,255,0.55)]">Select the days you want to train this week.</p>
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => handleToggleDay(day.value)}
                    className={`p-2 text-[11px] font-semibold rounded-[8px] transition-colors duration-150 ${
                      selectedDays.includes(day.value)
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[rgba(255,255,255,0.04)] text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.65)] border border-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[rgba(238,242,255,0.55)] mb-1 block uppercase tracking-wider">Default Time</label>
                <input
                  type="time"
                  value={defaultTime}
                  onChange={(e) => setDefaultTime(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] bg-[rgba(255,255,255,0.04)] text-[#eef2ff] rounded-[10px] border border-[rgba(255,255,255,0.07)] focus:border-[rgba(255,255,255,0.15)] focus:outline-none transition-colors"
                />
              </div>
              <Button onClick={handleSchedule} disabled={scheduling || selectedDays.length === 0} className="w-full">
                {scheduling ? <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling...</> : `Schedule ${selectedDays.length} Day${selectedDays.length !== 1 ? 's' : ''}`}
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Deactivate Confirmation */}
      <Modal isOpen={deactivateConfirmOpen} onClose={() => setDeactivateConfirmOpen(false)} title="Deactivate Programme?">
        <div className="p-4 space-y-4">
          <p className="text-[13px] text-[rgba(238,242,255,0.55)]">This will deactivate your current programme. Past workouts are preserved.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeactivateConfirmOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivating} className="flex-1">
              {deactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
