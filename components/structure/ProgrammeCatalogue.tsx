'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Search, Loader2, Dumbbell } from 'lucide-react'
import type { ProgrammeTemplate, UserProgramme } from '@/lib/types'

/*
  44CLUB Programme Catalogue
  Browse. Select. Activate.
*/

interface ProgrammeCatalogueProps {
  programmes: ProgrammeTemplate[]
  activeProgrammeId: string | undefined
  onActivate: (programmeId: string) => Promise<UserProgramme>
  onRefetch: () => void
}

export function ProgrammeCatalogue({
  programmes,
  activeProgrammeId,
  onActivate,
  onRefetch,
}: ProgrammeCatalogueProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeTemplate | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [activating, setActivating] = useState(false)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    programmes.forEach((p) => p.tags?.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [programmes])

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.overview?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some((tag) => p.tags?.includes(tag))
      return matchesSearch && matchesTags
    })
  }, [programmes, searchQuery, selectedTags])

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleActivate = async () => {
    if (!selectedProgramme) return
    setActivating(true)
    try {
      await onActivate(selectedProgramme.id)
      setDetailModalOpen(false)
      onRefetch()
    } catch (err) {
      console.error('Failed to activate programme:', err)
    } finally {
      setActivating(false)
    }
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-[16px] p-4">
        <h4 className="text-body font-semibold text-text-primary mb-3">Programme Catalogue</h4>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search programmes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-secondary bg-canvas-card text-text-primary rounded-[10px] border border-border placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`px-2 py-1 text-meta rounded-[6px] transition-colors duration-150 ${
                  selectedTags.includes(tag)
                    ? 'bg-accent text-white'
                    : 'bg-canvas-card text-text-muted hover:text-text-secondary border border-border'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Programme List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredProgrammes.length === 0 ? (
            <p className="text-secondary text-text-muted py-4 text-center">No programmes found</p>
          ) : (
            filteredProgrammes.map((programme) => {
              const isActive = activeProgrammeId === programme.id
              return (
                <button
                  key={programme.id}
                  onClick={() => { setSelectedProgramme(programme); setDetailModalOpen(true) }}
                  className={`w-full p-3 rounded-[10px] text-left transition-colors duration-150 ${
                    isActive
                      ? 'bg-success/10 border border-success/30'
                      : 'bg-canvas-card border border-border hover:border-text-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-[8px] ${isActive ? 'bg-success/20 border border-success/30' : 'bg-surface border border-border'}`}>
                      <Dumbbell className={`h-4 w-4 ${isActive ? 'text-success' : 'text-text-muted'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-body font-medium text-text-primary">{programme.title}</span>
                        {isActive && <span className="text-meta text-success font-medium">Active</span>}
                      </div>
                      {programme.overview && (
                        <p className="text-meta text-text-muted mt-0.5 line-clamp-2">{programme.overview}</p>
                      )}
                      {programme.tags && programme.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {programme.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-surface text-text-muted rounded-[4px] border border-border">
                              {tag}
                            </span>
                          ))}
                          {programme.tags.length > 3 && (
                            <span className="text-[10px] text-text-muted">+{programme.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Programme Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedProgramme?.title || 'Programme'}>
        {selectedProgramme && (
          <div className="p-4 space-y-4">
            {selectedProgramme.overview && (
              <div>
                <p className="text-meta font-medium text-text-primary mb-1">Overview</p>
                <p className="text-secondary text-text-secondary">{selectedProgramme.overview}</p>
              </div>
            )}

            {selectedProgramme.structure && (
              <div>
                <p className="text-meta font-medium text-text-primary mb-1">Structure</p>
                <p className="text-secondary text-text-secondary">{selectedProgramme.structure}</p>
              </div>
            )}

            {selectedProgramme.equipment && (
              <div>
                <p className="text-meta font-medium text-text-primary mb-1">Equipment</p>
                <p className="text-secondary text-text-secondary">{selectedProgramme.equipment}</p>
              </div>
            )}

            {selectedProgramme.tags && selectedProgramme.tags.length > 0 && (
              <div>
                <p className="text-meta font-medium text-text-primary mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedProgramme.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-meta bg-canvas-card text-text-muted rounded-[6px] border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleActivate} disabled={activating || activeProgrammeId === selectedProgramme.id} className="w-full">
              {activating ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating...</> : activeProgrammeId === selectedProgramme.id ? 'Currently Active' : 'Activate Programme'}
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}
