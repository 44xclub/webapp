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

        {/* Premium Active Programme Card - 3 region structure */}
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-[16px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {/* Region 1: Media Header - clickable to open modal */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setDetailModalOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModalOpen(true)}
            className="relative h-[100px] md:h-[120px] cursor-pointer group"
          >
            {imageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
            )}
            {/* Strong dark scrim overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.85)] via-[rgba(0,0,0,0.5)] to-[rgba(0,0,0,0.3)]" />

            {/* Status Chip */}
            <span className="absolute top-3 left-3 text-[10px] font-semibold text-white bg-[#22c55e] px-2.5 py-1 rounded-[6px] flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Active
            </span>
          </div>

          {/* Region 2: Content Body - clickable to open modal */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setDetailModalOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModalOpen(true)}
            className="px-4 py-3.5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
          >
            <h3 className="text-[17px] font-semibold text-[#eef2ff] leading-tight line-clamp-1 mb-1">
              {programme.title}
            </h3>
            {programme.overview && (
              <p className="text-[12px] text-[rgba(238,242,255,0.5)] leading-relaxed line-clamp-2">
                {programme.overview}
              </p>
            )}
          </div>

          {/* Region 3: Action Bar - dedicated area with proper spacing */}
          <div
            className="border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)] px-4 py-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3">
              {/* Primary CTA: Schedule Week */}
              <Button
                size="sm"
                onClick={() => setScheduleModalOpen(true)}
                className="flex-1 h-10 bg-gradient-to-b from-[#4f8ef7] to-[#3b7ce6] hover:from-[#5a96f8] hover:to-[#4585ed] shadow-[0_2px_8px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] border-0 text-[13px] font-semibold"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Schedule Week
              </Button>

              {/* Secondary/Destructive: Deactivate */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivateConfirmOpen(true)}
                className="flex-1 h-10 text-[13px] font-medium text-[rgba(248,113,113,0.9)] border-[rgba(248,113,113,0.2)] bg-transparent hover:bg-[rgba(248,113,113,0.08)] hover:border-[rgba(248,113,113,0.3)] hover:text-[#f87171]"
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
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
