'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SquareCard } from '@/components/ui/SquareCard'
import { HorizontalCardRow } from '@/components/ui/HorizontalCardRow'
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay'
import { ProgrammeDetailModal } from '@/components/structure/ProgrammeDetailModal'
import { Loader2 } from 'lucide-react'
import type { ProgrammeTemplate, ProgrammeSession, UserProgramme } from '@/lib/types'

interface ProgrammeCatalogueProps {
  programmes: ProgrammeTemplate[]
  activeProgrammeId: string | undefined
  onActivate: (programmeId: string) => Promise<UserProgramme>
  onRefetch: () => void
  fetchProgrammeSessions: (programmeId: string) => Promise<ProgrammeSession[]>
}

function getImageUrl(path: string | null): string | null {
  if (!path) return null
  return path.startsWith('http')
    ? path
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`
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
  const [seeAllOpen, setSeeAllOpen] = useState(false)
  const [sessions, setSessions] = useState<ProgrammeSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

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
      fetchProgrammeSessions(selectedProgramme.id)
        .then((data) => setSessions(data))
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

  const openDetail = (programme: ProgrammeTemplate) => {
    setSelectedProgramme(programme)
    setDetailModalOpen(true)
  }

  return (
    <div>
      <SectionHeader
        title="Available Programmes"
        subtitle="Browse programmes and start one anytime"
        action="See all"
        onAction={() => setSeeAllOpen(true)}
      />

      {/* Horizontal scroll row */}
      <HorizontalCardRow>
        {programmes.length === 0 ? (
          <p className="text-[12px] text-[rgba(238,242,255,0.35)] py-4 w-full text-center">No programmes available</p>
        ) : (
          programmes.map((programme) => (
            <SquareCard
              key={programme.id}
              title={programme.title}
              imageUrl={getImageUrl(programme.hero_image_path)}
              isActive={activeProgrammeId === programme.id}
              activeColor="var(--accent-success)"
              onClick={() => openDetail(programme)}
            />
          ))
        )}
      </HorizontalCardRow>

      {/* See All Overlay */}
      <FullScreenOverlay
        isOpen={seeAllOpen}
        onClose={() => { setSeeAllOpen(false); setSearchQuery('') }}
        title="All Programmes"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search programmes..."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
          {filteredProgrammes.length === 0 ? (
            <p className="text-[12px] text-[rgba(238,242,255,0.35)] py-8 text-center col-span-2 sm:col-span-3 lg:col-span-4">No programmes found</p>
          ) : (
            filteredProgrammes.map((programme) => {
              const isActive = activeProgrammeId === programme.id
              const imageUrl = getImageUrl(programme.hero_image_path)

              return (
                <button
                  key={programme.id}
                  onClick={() => { openDetail(programme); setSeeAllOpen(false); setSearchQuery('') }}
                  className={`relative overflow-hidden rounded-[14px] aspect-square text-left transition-all duration-200 group ${
                    isActive ? 'ring-2 ring-[var(--accent-success)] ring-offset-1 ring-offset-[var(--surface-0)]' : ''
                  }`}
                >
                  {imageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundImage: `url(${imageUrl})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute inset-0 p-2.5 flex flex-col justify-end">
                    {isActive && (
                      <span className="pill pill--sm pill--success-solid absolute top-2 left-2 shadow-sm">Active</span>
                    )}
                    <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2">{programme.title}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </FullScreenOverlay>

      {/* Programme Detail Modal */}
      <ProgrammeDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        programme={selectedProgramme}
        sessions={sessions}
        loadingSessions={loadingSessions}
        isActive={activeProgrammeId === selectedProgramme?.id}
        onActivate={handleActivate}
        activating={activating}
      />

      {/* Switch Confirm */}
      <Modal isOpen={switchConfirmOpen} onClose={() => setSwitchConfirmOpen(false)} title="Switch Programme?">
        <div className="p-4 space-y-4">
          <p className="text-[13px] text-[rgba(238,242,255,0.55)]">This will deactivate your current programme. Past workouts are preserved.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSwitchConfirmOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleConfirmSwitch} disabled={activating} className="flex-1">
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Switch'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
