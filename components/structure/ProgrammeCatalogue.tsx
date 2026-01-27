'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Search, Loader2, Dumbbell } from 'lucide-react'
import type { ProgrammeTemplate, UserProgramme } from '@/lib/types'

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

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    programmes.forEach((p) => p.tags?.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [programmes])

  // Filter programmes
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
      <div className="bg-card rounded-xl p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-3">Programme Catalogue</h4>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search programmes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
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
            <p className="text-sm text-muted-foreground py-4 text-center">
              No programmes found
            </p>
          ) : (
            filteredProgrammes.map((programme) => {
              const isActive = activeProgrammeId === programme.id
              return (
                <button
                  key={programme.id}
                  onClick={() => {
                    setSelectedProgramme(programme)
                    setDetailModalOpen(true)
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-green-500/10 border border-green-500'
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-green-500/20' : 'bg-secondary'}`}>
                      <Dumbbell className={`h-4 w-4 ${isActive ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{programme.title}</span>
                        {isActive && (
                          <span className="text-xs text-green-500 font-medium">Active</span>
                        )}
                      </div>
                      {programme.overview && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {programme.overview}
                        </p>
                      )}
                      {programme.tags && programme.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {programme.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {programme.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{programme.tags.length - 3}
                            </span>
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
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedProgramme?.title || 'Programme'}
      >
        {selectedProgramme && (
          <div className="p-4 space-y-4">
            {selectedProgramme.overview && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Overview</p>
                <p className="text-sm text-muted-foreground">{selectedProgramme.overview}</p>
              </div>
            )}

            {selectedProgramme.structure && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Structure</p>
                <p className="text-sm text-muted-foreground">{selectedProgramme.structure}</p>
              </div>
            )}

            {selectedProgramme.equipment && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Equipment</p>
                <p className="text-sm text-muted-foreground">{selectedProgramme.equipment}</p>
              </div>
            )}

            {selectedProgramme.tags && selectedProgramme.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedProgramme.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-secondary text-muted-foreground rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleActivate}
              disabled={activating || activeProgrammeId === selectedProgramme.id}
              className="w-full"
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : activeProgrammeId === selectedProgramme.id ? (
                'Currently Active'
              ) : (
                'Activate Programme'
              )}
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}
