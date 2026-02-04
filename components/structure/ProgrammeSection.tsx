'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProgrammeDetailModal } from '@/components/structure/ProgrammeDetailModal'
import { Calendar, Dumbbell, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Check } from 'lucide-react'
import type { UserProgramme, ProgrammeSession } from '@/lib/types'

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

interface ProgrammeSectionProps {
  activeProgramme: UserProgramme | null
  sessions: ProgrammeSession[]
  onDeactivate: () => Promise<void>
  onScheduleWeek: (selectedDays: number[], defaultTime?: string) => Promise<number>
  fetchProgrammeSessions: (programmeId: string) => Promise<ProgrammeSession[]>
}

export function ProgrammeSection({
  activeProgramme,
  sessions,
  onDeactivate,
  onScheduleWeek,
  fetchProgrammeSessions,
}: ProgrammeSectionProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5])
  const [defaultTime, setDefaultTime] = useState('07:00')
  const [scheduling, setScheduling] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)
  const [modalSessions, setModalSessions] = useState<ProgrammeSession[]>([])
  const [loadingModalSessions, setLoadingModalSessions] = useState(false)

  // Load sessions for modal when opened
  useEffect(() => {
    if (detailModalOpen && activeProgramme?.programme_template) {
      setLoadingModalSessions(true)
      fetchProgrammeSessions(activeProgramme.programme_template_id)
        .then((data) => setModalSessions(data))
        .catch(console.error)
        .finally(() => setLoadingModalSessions(false))
    }
  }, [detailModalOpen, activeProgramme, fetchProgrammeSessions])

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

  if (!activeProgramme?.programme_template) {
    return (
      <div>
        <SectionHeader title="Active Programme" subtitle="Your current training plan" />
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[10px] bg-[rgba(255,255,255,0.04)]">
              <Dumbbell className="h-4 w-4 text-[rgba(238,242,255,0.35)]" />
            </div>
            <p className="text-[13px] text-[rgba(238,242,255,0.40)]">No programme activated. Browse the catalogue below.</p>
          </div>
        </div>
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
      <div>
        <SectionHeader title="Active Programme" subtitle="Your current training plan" />

        {/* Compact Active Programme Card - clickable to open modal */}
        <button
          onClick={() => setDetailModalOpen(true)}
          className="w-full text-left bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] overflow-hidden transition-all duration-200 hover:border-[rgba(255,255,255,0.10)] group"
        >
          {/* Image Banner */}
          <div className="relative h-[110px]">
            {imageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 p-3 flex flex-col justify-end">
              <span className="absolute top-2.5 left-2.5 text-[9px] font-bold text-white bg-[#f97316] px-2 py-[2px] rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> Active
              </span>
              <h3 className="text-[16px] font-bold text-white">{programme.title}</h3>
            </div>
          </div>

          {/* Description */}
          <div className="px-3 pt-2.5 pb-3">
            {programme.overview && (
              <p className="text-[12px] text-[rgba(238,242,255,0.45)] leading-relaxed line-clamp-2 mb-3">{programme.overview}</p>
            )}

            {/* Action Buttons - stop propagation so card click doesn't fire */}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={() => setScheduleModalOpen(true)} className="flex-1">
                <Calendar className="h-3.5 w-3.5" /> Schedule Week
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
        </button>
      </div>

      {/* Programme Detail Modal with Sessions */}
      <ProgrammeDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        programme={programme}
        sessions={modalSessions.length > 0 ? modalSessions : sessions}
        loadingSessions={loadingModalSessions}
        isActive={true}
        onScheduleWeek={onScheduleWeek}
        onDeactivate={onDeactivate}
      />

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

      {/* Deactivate Confirmation Modal */}
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
