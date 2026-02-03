'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Search, Loader2 } from 'lucide-react'
import type { ProgrammeTemplate, ProgrammeSession, UserProgramme } from '@/lib/types'

interface ProgrammeCatalogueProps {
  programmes: ProgrammeTemplate[]
  activeProgrammeId: string | undefined
  onActivate: (programmeId: string) => Promise<UserProgramme>
  onRefetch: () => void
  fetchProgrammeSessions: (programmeId: string) => Promise<ProgrammeSession[]>
}

export function ProgrammeCatalogue({
  programmes,
  activeProgrammeId,
  onActivate,
  onRefetch,
  fetchProgrammeSessions,
}: ProgrammeCatalogueProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeTemplate | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false)
  const [sessions, setSessions] = useState<ProgrammeSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [selectedDayIndex, setSelectedDayIndex] = useState(1)

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      return p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.overview?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [programmes, searchQuery])

  useEffect(() => {
    if (selectedProgramme && detailModalOpen) {
      setLoadingSessions(true)
      setSessions([])
      setSelectedDayIndex(1)
      fetchProgrammeSessions(selectedProgramme.id)
        .then((data) => {
          setSessions(data)
          if (data.length > 0) {
            setSelectedDayIndex(data[0].day_index)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingSessions(false))
    }
  }, [selectedProgramme, detailModalOpen, fetchProgrammeSessions])

  const handleActivate = async (programme: ProgrammeTemplate) => {
    if (activeProgrammeId && activeProgrammeId !== programme.id) {
      setSelectedProgramme(programme)
      setSwitchConfirmOpen(true)
      return
    }
    setActivating(true)
    try {
      await onActivate(programme.id)
      setDetailModalOpen(false)
      onRefetch()
    } catch (err) {
      console.error('Failed to activate:', err)
    } finally {
      setActivating(false)
    }
  }

  const handleConfirmSwitch = async () => {
    if (!selectedProgramme) return
    setActivating(true)
    try {
      await onActivate(selectedProgramme.id)
      setSwitchConfirmOpen(false)
      setDetailModalOpen(false)
      onRefetch()
    } catch (err) {
      console.error('Failed to switch:', err)
    } finally {
      setActivating(false)
    }
  }

  const uniqueDays = useMemo(() => {
    const days = Array.from(new Set(sessions.map(s => s.day_index))).sort((a, b) => a - b)
    return days
  }, [sessions])

  const selectedSession = useMemo(() => {
    return sessions.find(s => s.day_index === selectedDayIndex)
  }, [sessions, selectedDayIndex])

  const renderSessionPayload = (payload: any) => {
    if (!payload) return null

    // Handle plan string format (exercises separated by newlines)
    if (payload.plan && typeof payload.plan === 'string') {
      const exercises = payload.plan.split('\\n').filter((line: string) => line.trim())
      return (
        <div className="space-y-1">
          {exercises.map((exercise: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 py-2.5 px-3 rounded-[10px] bg-[#0d1014]">
              <span className="w-2 h-2 rounded-full bg-[#f97316] mt-1.5 flex-shrink-0" />
              <p className="text-[15px] text-text-primary flex-1">{exercise.trim()}</p>
            </div>
          ))}
        </div>
      )
    }

    // Handle structured exercise_matrix or exercises array
    const exercises = payload.exercise_matrix || payload.exercises || []
    if (exercises.length === 0) return null

    return (
      <div className="space-y-1">
        {exercises.map((ex: any, idx: number) => (
          <div key={idx} className="flex items-start gap-3 py-2.5 px-3 rounded-[10px] bg-[#0d1014]">
            <span className="w-2 h-2 rounded-full bg-[#f97316] mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[15px] font-medium text-text-primary">{ex.exercise || ex.name || `Exercise ${idx + 1}`}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {ex.sets && <span className="text-[12px] text-text-muted">{ex.sets} sets</span>}
                {ex.reps && <span className="text-[12px] text-text-muted">{ex.reps} reps</span>}
                {ex.weight && <span className="text-[12px] text-text-muted">{ex.weight}</span>}
                {ex.duration && <span className="text-[12px] text-text-muted">{ex.duration}</span>}
              </div>
              {ex.notes && <p className="text-[12px] text-text-muted mt-1">{ex.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-[16px] p-4">
        <h4 className="text-body font-semibold text-text-primary mb-3">Available Programmes</h4>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-secondary bg-canvas-card text-text-primary border border-border rounded-[10px] placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {filteredProgrammes.length === 0 ? (
            <p className="text-secondary text-text-muted py-4 text-center col-span-4">No programmes found</p>
          ) : (
            filteredProgrammes.map((programme) => {
              const isActive = activeProgrammeId === programme.id
              const imageUrl = programme.hero_image_path 
                ? programme.hero_image_path.startsWith('http') 
                  ? programme.hero_image_path 
                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${programme.hero_image_path}`
                : null
              
              return (
                <button
                  key={programme.id}
                  onClick={() => { setSelectedProgramme(programme); setDetailModalOpen(true) }}
                  className={`relative overflow-hidden rounded-[10px] h-[180px] text-left transition-all duration-200 ${
                    isActive ? 'ring-2 ring-[#f97316]' : 'hover:opacity-90'
                  }`}
                >
                  {imageUrl ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${imageUrl})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 p-2.5 flex flex-col justify-end">
                    {isActive && (
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold text-white bg-[#f97316] px-1.5 py-0.5 rounded-full">Active</span>
                    )}
                    <p className="text-[12px] font-semibold text-white leading-tight">{programme.title}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedProgramme?.title || 'Programme'}>
        {selectedProgramme && (
          <div className="space-y-4 px-2">
            {selectedProgramme.overview && (
              <p className="text-[17px] text-text-primary leading-relaxed px-1 pt-2">{selectedProgramme.overview}</p>
            )}

            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
              </div>
            ) : sessions.length > 0 ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-muted mb-2 px-1">Session Breakdown</p>
                
                {/* Day Tabs */}
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                  {uniqueDays.map((dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => setSelectedDayIndex(dayIndex)}
                      className={`px-4 py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-all duration-200 border ${
                        selectedDayIndex === dayIndex
                          ? 'bg-[#f97316] text-white border-transparent'
                          : 'bg-[#0d1014] text-[rgba(238,242,255,0.72)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'
                      }`}
                    >
                      Day {dayIndex}
                    </button>
                  ))}
                </div>

                {/* Selected Session */}
                {selectedSession && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#0d1014] rounded-[12px] border border-[rgba(255,255,255,0.08)]">
                      <p className="text-[15px] font-semibold text-text-primary">{selectedSession.title}</p>
                    </div>
                    {renderSessionPayload(selectedSession.payload)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-secondary text-text-muted py-4 text-center">No sessions defined for this programme.</p>
            )}

            <div className="pt-2 pb-2">
              <Button 
                onClick={() => handleActivate(selectedProgramme)} 
                disabled={activating || activeProgrammeId === selectedProgramme.id} 
                className="w-full"
              >
                {activating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : activeProgrammeId === selectedProgramme.id ? (
                  'Currently Active'
                ) : (
                  'Activate Programme'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Switch Confirm */}
      <Modal isOpen={switchConfirmOpen} onClose={() => setSwitchConfirmOpen(false)} title="Switch Programme?">
        <div className="p-4 space-y-4">
          <p className="text-secondary text-text-secondary">This will deactivate your current programme. Past workouts are preserved.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSwitchConfirmOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleConfirmSwitch} disabled={activating} className="flex-1">
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Switch'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
