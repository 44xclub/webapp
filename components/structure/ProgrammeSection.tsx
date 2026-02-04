'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Calendar, Loader2, Check, Dumbbell } from 'lucide-react'
import type { UserProgramme, ProgrammeSession } from '@/lib/types'

interface ProgrammeSectionProps {
  activeProgramme: UserProgramme | null
  sessions: ProgrammeSession[]
  onDeactivate: () => Promise<void>
  onScheduleWeek: (selectedDays: number[], defaultTime?: string) => Promise<number>
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

export function ProgrammeSection({
  activeProgramme,
  sessions,
  onDeactivate,
  onScheduleWeek,
}: ProgrammeSectionProps) {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5])
  const [defaultTime, setDefaultTime] = useState('07:00')
  const [scheduling, setScheduling] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

  const handleToggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSchedule = async () => {
    if (selectedDays.length === 0) return
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
    setDeactivating(true)
    try {
      await onDeactivate()
      setDeactivateConfirmOpen(false)
    } catch (err) {
      console.error('Failed to deactivate programme:', err)
    } finally {
      setDeactivating(false)
    }
  }

  const uniqueDays = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.day_index))).sort((a, b) => a - b)
  }, [sessions])

  const selectedSession = useMemo(() => {
    if (selectedDayIndex === null) return null
    return sessions.find(s => s.day_index === selectedDayIndex)
  }, [sessions, selectedDayIndex])

  const renderSessionPayload = (payload: any) => {
    if (!payload) return null

    if (payload.plan && typeof payload.plan === 'string') {
      const exercises = payload.plan.split('\\n').filter((line: string) => line.trim())
      return (
        <div className="space-y-1">
          {exercises.map((exercise: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 py-2 px-3 rounded-[10px] bg-[#0d1014]">
              <span className="w-2 h-2 rounded-full bg-[#f97316] mt-1.5 flex-shrink-0" />
              <p className="text-[14px] text-text-primary flex-1">{exercise.trim()}</p>
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
          <div key={idx} className="flex items-start gap-3 py-2 px-3 rounded-[10px] bg-[#0d1014]">
            <span className="w-2 h-2 rounded-full bg-[#f97316] mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[14px] font-medium text-text-primary">{ex.exercise || ex.name || `Exercise ${idx + 1}`}</p>
              <div className="flex flex-wrap gap-2 mt-0.5">
                {ex.sets && <span className="text-[11px] text-text-muted">{ex.sets} sets</span>}
                {ex.reps && <span className="text-[11px] text-text-muted">{ex.reps} reps</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!activeProgramme?.programme_template) {
    return (
      <div className="bg-surface border border-border rounded-[16px] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-[10px] bg-canvas-card">
            <Dumbbell className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <h3 className="text-body font-semibold text-text-primary">Active Programme</h3>
            <p className="text-secondary text-text-muted">Your training programme</p>
          </div>
        </div>
        <p className="text-secondary text-text-muted">No programme activated. Browse the catalogue below.</p>
      </div>
    )
  }

  const programme = activeProgramme.programme_template
  const imageUrl = programme.hero_image_path 
    ? programme.hero_image_path.startsWith('http') 
      ? programme.hero_image_path 
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${programme.hero_image_path}`
    : null

  return (
    <>
      <div className="bg-surface border border-border rounded-[16px] overflow-hidden">
        {/* Image Card Header */}
        <div className="relative h-[140px]">
          {imageUrl ? (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end">
            <span className="absolute top-3 left-3 text-[10px] font-semibold text-white bg-[#f97316] px-2 py-0.5 rounded-full">Active</span>
            <h3 className="text-[18px] font-bold text-white">{programme.title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Overview */}
          {programme.overview && (
            <p className="text-[14px] text-text-secondary leading-relaxed">{programme.overview}</p>
          )}

          {/* Day Tabs */}
          {uniqueDays.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-muted mb-2">Sessions</p>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {uniqueDays.map((dayIndex) => (
                  <button
                    key={dayIndex}
                    onClick={() => setSelectedDayIndex(selectedDayIndex === dayIndex ? null : dayIndex)}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-all duration-200 border ${
                      selectedDayIndex === dayIndex
                        ? 'bg-[#f97316] text-white border-transparent'
                        : 'bg-[#0d1014] text-[rgba(238,242,255,0.72)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'
                    }`}
                  >
                    Day {dayIndex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Session Exercises */}
          {selectedSession && (
            <div className="space-y-2">
              <div className="p-2.5 bg-[#0d1014] rounded-[10px] border border-[rgba(255,255,255,0.08)]">
                <p className="text-[14px] font-semibold text-text-primary">{selectedSession.title}</p>
              </div>
              {renderSessionPayload(selectedSession.payload)}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setScheduleModalOpen(true)} className="flex-1">
              <Calendar className="h-4 w-4" /> Schedule Week
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDeactivateConfirmOpen(true)} 
              className="flex-1 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              Deactivate
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Week Modal */}
      <Modal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule Week">
        <div className="p-4 space-y-4">
          {scheduledCount !== null ? (
            <div className="text-center py-8">
              <div className="p-3 rounded-[10px] bg-success/10 border border-success/20 inline-block mb-3">
                <Check className="h-6 w-6 text-success" />
              </div>
              <p className="text-body font-medium text-text-primary">
                {scheduledCount} workout{scheduledCount !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          ) : (
            <>
              <p className="text-secondary text-text-secondary">Select the days you want to train this week.</p>

              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => handleToggleDay(day.value)}
                    className={`p-2 text-meta font-medium rounded-[8px] transition-colors duration-150 ${
                      selectedDays.includes(day.value)
                        ? 'bg-accent text-white'
                        : 'bg-canvas-card text-text-muted hover:text-text-secondary border border-border'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-meta font-medium text-text-secondary mb-1 block">Default Time</label>
                <input
                  type="time"
                  value={defaultTime}
                  onChange={(e) => setDefaultTime(e.target.value)}
                  className="w-full px-3 py-2 text-secondary bg-canvas-card text-text-primary rounded-[10px] border border-border focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <Button onClick={handleSchedule} disabled={scheduling || selectedDays.length === 0} className="w-full">
                {scheduling ? <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling...</> : `Schedule ${selectedDays.length} Day${selectedDays.length !== 1 ? 's' : ''}`}
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={deactivateConfirmOpen} onClose={() => setDeactivateConfirmOpen(false)} title="Deactivate Programme?">
        <div className="p-4 space-y-4">
          <p className="text-secondary text-text-secondary">This will deactivate your current programme. Past workouts are preserved.</p>
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
