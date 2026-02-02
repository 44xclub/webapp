'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Dumbbell, Calendar, List, Loader2, X, Check } from 'lucide-react'
import type { UserProgramme, ProgrammeSession } from '@/lib/types'

/*
  44CLUB Programme Section
  Training. Controlled. No fluff.
*/

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
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5])
  const [defaultTime, setDefaultTime] = useState('07:00')
  const [scheduling, setScheduling] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)

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

  const sessionsByWeek = sessions.reduce((acc, session) => {
    const week = session.week
    if (!acc[week]) acc[week] = []
    acc[week].push(session)
    return acc
  }, {} as Record<number, ProgrammeSession[]>)

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

  return (
    <>
      <div className="bg-surface border border-border rounded-[16px] p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-[10px] bg-success/10 border border-success/20">
            <Dumbbell className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="text-body font-semibold text-text-primary">Active Programme</h3>
            <p className="text-secondary text-text-muted">Your training programme</p>
          </div>
          <button
            onClick={() => setDeactivateConfirmOpen(true)}
            className="p-2 rounded-[10px] text-text-muted hover:text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-canvas-card rounded-[10px] border border-border">
            <p className="text-body font-medium text-text-primary">{programme.title}</p>
            {programme.overview && (
              <p className="text-secondary text-text-secondary mt-1">{programme.overview}</p>
            )}
          </div>

          {programme.tags && programme.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {programme.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-meta bg-canvas-card text-text-muted rounded-[6px] border border-border">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {programme.equipment && (
            <p className="text-meta text-text-muted">
              <span className="font-medium text-text-secondary">Equipment:</span> {programme.equipment}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setScheduleModalOpen(true)} className="flex-1">
              <Calendar className="h-4 w-4" /> Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBreakdownModalOpen(true)} className="flex-1">
              <List className="h-4 w-4" /> Sessions
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

      {/* Session Breakdown Modal */}
      <Modal isOpen={breakdownModalOpen} onClose={() => setBreakdownModalOpen(false)} title="Programme Sessions">
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(sessionsByWeek).map(([week, weekSessions]) => (
            <div key={week}>
              <h4 className="text-meta font-medium text-text-muted mb-2">Week {week}</h4>
              <div className="space-y-2">
                {weekSessions.map((session) => (
                  <div key={session.id} className="p-3 bg-canvas-card rounded-[10px] border border-border">
                    <p className="text-secondary font-medium text-text-primary">Day {session.day_index}: {session.title}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-secondary text-text-muted text-center py-4">No sessions defined.</p>}
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
