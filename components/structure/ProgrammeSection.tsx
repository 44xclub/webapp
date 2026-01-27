'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Dumbbell, Calendar, List, Loader2, X } from 'lucide-react'
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
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]) // Mon, Wed, Fri default
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

  // Group sessions by week
  const sessionsByWeek = sessions.reduce((acc, session) => {
    const week = session.week
    if (!acc[week]) acc[week] = []
    acc[week].push(session)
    return acc
  }, {} as Record<number, ProgrammeSession[]>)

  if (!activeProgramme?.programme_template) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-muted">
            <Dumbbell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Active Programme</h3>
            <p className="text-sm text-muted-foreground">Your training programme</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          No programme activated. Browse the catalogue below to get started.
        </p>
      </div>
    )
  }

  const programme = activeProgramme.programme_template

  return (
    <>
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Dumbbell className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Active Programme</h3>
            <p className="text-sm text-muted-foreground">Your training programme</p>
          </div>
          <button
            onClick={() => setDeactivateConfirmOpen(true)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="font-medium text-foreground">{programme.title}</p>
            {programme.overview && (
              <p className="text-sm text-muted-foreground mt-1">{programme.overview}</p>
            )}
          </div>

          {/* Tags */}
          {programme.tags && programme.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {programme.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-secondary text-muted-foreground rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Equipment */}
          {programme.equipment && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Equipment:</span> {programme.equipment}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleModalOpen(true)}
              className="flex-1"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Schedule Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBreakdownModalOpen(true)}
              className="flex-1"
            >
              <List className="h-4 w-4 mr-1" />
              View Sessions
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Week Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Week"
      >
        <div className="p-4 space-y-4">
          {scheduledCount !== null ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✓</div>
              <p className="text-lg font-medium text-foreground">
                {scheduledCount} workout{scheduledCount !== 1 ? 's' : ''} scheduled!
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Select the days you want to train this week.
              </p>

              {/* Day Selection */}
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => handleToggleDay(day.value)}
                    className={`p-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              {/* Default Time */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Default Time
                </label>
                <input
                  type="time"
                  value={defaultTime}
                  onChange={(e) => setDefaultTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <Button
                onClick={handleSchedule}
                disabled={scheduling || selectedDays.length === 0}
                className="w-full"
              >
                {scheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  `Schedule ${selectedDays.length} Day${selectedDays.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Session Breakdown Modal */}
      <Modal
        isOpen={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        title="Programme Sessions"
      >
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(sessionsByWeek).map(([week, weekSessions]) => (
            <div key={week}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Week {week}
              </h4>
              <div className="space-y-2">
                {weekSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 bg-secondary/50 rounded-lg"
                  >
                    <p className="font-medium text-foreground text-sm">
                      Day {session.day_index}: {session.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sessions defined for this programme.
            </p>
          )}
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={deactivateConfirmOpen}
        onClose={() => setDeactivateConfirmOpen(false)}
        title="Deactivate Programme?"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            This will deactivate your current programme and remove any future scheduled workouts.
            Past workouts will be preserved.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeactivateConfirmOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="flex-1"
            >
              {deactivating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Deactivate'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
