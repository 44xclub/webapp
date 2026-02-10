'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SquareCard } from '@/components/ui/SquareCard'
import { HorizontalCardRow } from '@/components/ui/HorizontalCardRow'
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay'
import { Loader2 } from 'lucide-react'
import type { FrameworkTemplate, UserFramework, DailyFrameworkSubmission, FrameworkSubmissionStatus } from '@/lib/types'

interface FrameworksSectionProps {
  frameworks: FrameworkTemplate[]
  activeFramework: UserFramework | null
  todaySubmission: DailyFrameworkSubmission | null
  onActivateFramework: (frameworkId: string) => Promise<UserFramework>
  onSubmitStatus: (status: FrameworkSubmissionStatus) => Promise<DailyFrameworkSubmission>
  onRefetch: () => void
}

function getImageUrl(path: string | null): string | null {
  if (!path) return null
  return path.startsWith('http')
    ? path
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`
}

export function FrameworksSection({ frameworks, activeFramework, onActivateFramework, onRefetch }: FrameworksSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<FrameworkTemplate | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false)
  const [seeAllOpen, setSeeAllOpen] = useState(false)
  const [activating, setActivating] = useState(false)

  const filteredFrameworks = frameworks.filter((f) => f.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleActivate = async (framework: FrameworkTemplate) => {
    if (activeFramework && activeFramework.framework_template_id !== framework.id) {
      setSelectedFramework(framework)
      setSwitchConfirmOpen(true)
      return
    }
    setActivating(true)
    try {
      await onActivateFramework(framework.id)
      setDetailModalOpen(false)
      onRefetch()
    } catch (err) {
      console.error('Failed to activate:', err)
    } finally {
      setActivating(false)
    }
  }

  const handleConfirmSwitch = async () => {
    if (!selectedFramework) return
    setActivating(true)
    try {
      await onActivateFramework(selectedFramework.id)
      setSwitchConfirmOpen(false)
      setDetailModalOpen(false)
      onRefetch()
    } catch (err) {
      console.error('Failed to switch:', err)
    } finally {
      setActivating(false)
    }
  }

  const openDetail = (framework: FrameworkTemplate) => {
    setSelectedFramework(framework)
    setDetailModalOpen(true)
  }

  return (
    <div>
      <SectionHeader
        title="Available Frameworks"
        subtitle="Choose a framework to run next"
        action="See all"
        onAction={() => setSeeAllOpen(true)}
      />

      {/* Horizontal scroll row */}
      <HorizontalCardRow>
        {frameworks.length === 0 ? (
          <p className="text-[12px] text-[rgba(238,242,255,0.35)] py-4 w-full text-center">No frameworks available</p>
        ) : (
          frameworks.map((framework) => (
            <SquareCard
              key={framework.id}
              title={framework.title}
              imageUrl={getImageUrl(framework.image_path)}
              isActive={activeFramework?.framework_template_id === framework.id}
              activeColor="#3b82f6"
              onClick={() => openDetail(framework)}
            />
          ))
        )}
      </HorizontalCardRow>

      {/* See All Overlay */}
      <FullScreenOverlay
        isOpen={seeAllOpen}
        onClose={() => { setSeeAllOpen(false); setSearchQuery('') }}
        title="All Frameworks"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search frameworks..."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
          {filteredFrameworks.length === 0 ? (
            <p className="text-[12px] text-[rgba(238,242,255,0.35)] py-8 text-center col-span-2 sm:col-span-3 lg:col-span-4">No frameworks found</p>
          ) : (
            filteredFrameworks.map((framework) => {
              const isActive = activeFramework?.framework_template_id === framework.id
              const imageUrl = getImageUrl(framework.image_path)

              return (
                <button
                  key={framework.id}
                  onClick={() => { openDetail(framework); setSeeAllOpen(false); setSearchQuery('') }}
                  className={`relative overflow-hidden rounded-[14px] aspect-square text-left transition-all duration-200 group ${
                    isActive ? 'ring-[1.5px] ring-[#3b82f6]' : ''
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
                      <span className="absolute top-2 left-2 text-[9px] font-bold text-white bg-[#3b82f6] px-[6px] py-[2px] rounded-full">Active</span>
                    )}
                    <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2">{framework.title}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </FullScreenOverlay>

      {/* Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedFramework?.title || 'Framework'}>
        {selectedFramework && (
          <div className="space-y-4 px-4 pb-4">
            {selectedFramework.description && (
              <p className="text-[14px] text-[rgba(238,242,255,0.75)] leading-relaxed pt-1">{selectedFramework.description}</p>
            )}
            {selectedFramework.criteria && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.35)] mb-2 font-semibold">Daily Criteria</p>
                <div className="space-y-1">
                  {(() => {
                    const criteria = selectedFramework.criteria as { items?: Array<{ key?: string; id?: string; label: string; description?: string; target?: number; unit?: string }> }
                    const rawItems = Array.isArray(criteria) ? criteria : (criteria.items || [])
                    const items = rawItems.map(item => ({ ...item, key: item.key || item.id || '' }))
                    return items.map((item) => (
                      <div key={item.key} className="flex items-start gap-2.5 py-2 px-2.5 rounded-[10px] bg-[rgba(255,255,255,0.03)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-[7px] flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[13px] font-medium text-[rgba(238,242,255,0.90)]">{item.label}</p>
                          {item.description && <p className="text-[11px] text-[rgba(238,242,255,0.40)] mt-0.5">{item.description}</p>}
                          {item.target && item.unit && (
                            <p className="text-[11px] text-[#3b82f6] mt-0.5">Target: {item.target} {item.unit}</p>
                          )}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
            <div className="pt-1">
              <Button
                onClick={() => handleActivate(selectedFramework)}
                disabled={activating || activeFramework?.framework_template_id === selectedFramework.id}
                className="w-full"
              >
                {activating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : activeFramework?.framework_template_id === selectedFramework.id ? (
                  'Currently Active'
                ) : (
                  'Activate Framework'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Switch Confirm */}
      <Modal isOpen={switchConfirmOpen} onClose={() => setSwitchConfirmOpen(false)} title="Switch Framework?">
        <div className="p-4 space-y-4">
          <p className="text-[13px] text-[rgba(238,242,255,0.55)]">This will deactivate your current framework. History is preserved.</p>
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
