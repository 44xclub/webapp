'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SquareCard } from '@/components/ui/SquareCard'
import { HorizontalCardRow } from '@/components/ui/HorizontalCardRow'
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay'
import { ProgrammeDetailModal } from '@/components/structure/ProgrammeDetailModal'
import { Loader2, X } from 'lucide-react'
import { cleanProgrammeTitle } from '@/lib/hooks/useProgrammes'
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

  // Filter state
  const [filterDays, setFilterDays] = useState<number[]>([])
  const [filterType, setFilterType] = useState<string[]>([])
  const [filterEquipment, setFilterEquipment] = useState<string[]>([])

  // Available filter options derived from data
  const availableDays = useMemo(() => {
    const days = new Set<number>()
    programmes.forEach((p) => {
      if (p.days_per_week != null) days.add(p.days_per_week)
    })
    return Array.from(days).sort((a, b) => a - b)
  }, [programmes])

  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    programmes.forEach((p) => {
      if (p.programme_type) types.add(p.programme_type)
    })
    return Array.from(types).sort()
  }, [programmes])

  const availableEquipment = useMemo(() => {
    const equipment = new Set<string>()
    programmes.forEach((p) => {
      if (p.equipment_tags) {
        p.equipment_tags.forEach((tag) => equipment.add(tag))
      }
    })
    return Array.from(equipment).sort()
  }, [programmes])

  const hasActiveFilters = filterDays.length > 0 || filterType.length > 0 || filterEquipment.length > 0

  const clearFilters = () => {
    setFilterDays([])
    setFilterType([])
    setFilterEquipment([])
  }

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          p.title.toLowerCase().includes(q) ||
          p.overview?.toLowerCase().includes(q)
        if (!matchesSearch) return false
      }

      // Days filter
      if (filterDays.length > 0) {
        if (p.days_per_week == null || !filterDays.includes(p.days_per_week)) return false
      }

      // Type filter
      if (filterType.length > 0) {
        if (!p.programme_type || !filterType.includes(p.programme_type)) return false
      }

      // Equipment filter
      if (filterEquipment.length > 0) {
        if (!p.equipment_tags || !filterEquipment.some((tag) => p.equipment_tags!.includes(tag))) return false
      }

      return true
    })
  }, [programmes, searchQuery, filterDays, filterType, filterEquipment])

  // Sort: active first, then title A-Z
  const sortedFilteredProgrammes = useMemo(() => {
    return [...filteredProgrammes].sort((a, b) => {
      const aActive = a.id === activeProgrammeId ? -1 : 0
      const bActive = b.id === activeProgrammeId ? -1 : 0
      if (aActive !== bActive) return aActive - bActive
      return a.title.localeCompare(b.title)
    })
  }, [filteredProgrammes, activeProgrammeId])

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

  const toggleFilter = (
    value: string | number,
    current: (string | number)[],
    setter: (v: any[]) => void
  ) => {
    setter(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    )
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
              title={cleanProgrammeTitle(programme.title)}
              imageUrl={getImageUrl(programme.hero_image_path)}
              isActive={activeProgrammeId === programme.id}
              activeColor="var(--accent-success)"
              daysPerWeek={programme.days_per_week}
              onClick={() => openDetail(programme)}
            />
          ))
        )}
      </HorizontalCardRow>

      {/* See All Overlay */}
      <FullScreenOverlay
        isOpen={seeAllOpen}
        onClose={() => { setSeeAllOpen(false); setSearchQuery(''); clearFilters() }}
        title="All Programmes"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search programmes..."
      >
        {/* Filter Bar */}
        {(availableDays.length > 0 || availableTypes.length > 0 || availableEquipment.length > 0) && (
          <div className="pb-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {/* Days filter pills */}
              {availableDays.length > 0 && (
                <>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)] self-center mr-1">Days</span>
                  {availableDays.map((d) => (
                    <button
                      key={`day-${d}`}
                      onClick={() => toggleFilter(d, filterDays, setFilterDays)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        filterDays.includes(d)
                          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[rgba(238,242,255,0.60)] hover:border-[rgba(255,255,255,0.15)]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </>
              )}

              {/* Type filter pills */}
              {availableTypes.length > 0 && (
                <>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)] self-center ml-2 mr-1">Type</span>
                  {availableTypes.map((t) => (
                    <button
                      key={`type-${t}`}
                      onClick={() => toggleFilter(t, filterType, setFilterType)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors capitalize ${
                        filterType.includes(t)
                          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[rgba(238,242,255,0.60)] hover:border-[rgba(255,255,255,0.15)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </>
              )}

              {/* Equipment filter pills */}
              {availableEquipment.length > 0 && (
                <>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)] self-center ml-2 mr-1">Equipment</span>
                  {availableEquipment.map((e) => (
                    <button
                      key={`equip-${e}`}
                      onClick={() => toggleFilter(e, filterEquipment, setFilterEquipment)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors capitalize ${
                        filterEquipment.includes(e)
                          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[rgba(238,242,255,0.60)] hover:border-[rgba(255,255,255,0.15)]'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </>
              )}

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.12)] text-[rgba(238,242,255,0.55)] hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-colors flex items-center gap-1 ml-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Programme Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1 max-w-4xl mx-auto">
          {sortedFilteredProgrammes.length === 0 ? (
            <p className="text-[12px] text-[rgba(238,242,255,0.35)] py-8 text-center col-span-2 sm:col-span-3 lg:col-span-4">
              {hasActiveFilters || searchQuery ? 'No programmes match your filters' : 'No programmes found'}
            </p>
          ) : (
            sortedFilteredProgrammes.map((programme) => {
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
                  <div className="absolute inset-0 p-2.5 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-1">
                      {isActive ? (
                        <span className="pill pill--sm pill--success-solid shadow-sm">Active</span>
                      ) : (
                        <span />
                      )}
                      {programme.days_per_week != null && (
                        <span className="text-[9px] font-semibold text-white/90 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {programme.days_per_week} Day{programme.days_per_week !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2">
                      {cleanProgrammeTitle(programme.title)}
                    </p>
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
