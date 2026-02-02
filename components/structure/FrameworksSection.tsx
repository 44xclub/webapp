'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Search, Loader2 } from 'lucide-react'
import type { FrameworkTemplate, UserFramework, DailyFrameworkSubmission, FrameworkSubmissionStatus } from '@/lib/types'

/*
  44CLUB Frameworks Section
  Disciplined. Minimal decoration.
*/

interface FrameworksSectionProps {
  frameworks: FrameworkTemplate[]
  activeFramework: UserFramework | null
  todaySubmission: DailyFrameworkSubmission | null
  onActivateFramework: (frameworkId: string) => Promise<UserFramework>
  onSubmitStatus: (status: FrameworkSubmissionStatus) => Promise<DailyFrameworkSubmission>
  onRefetch: () => void
}

export function FrameworksSection({ frameworks, activeFramework, todaySubmission, onActivateFramework, onSubmitStatus, onRefetch }: FrameworksSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<FrameworkTemplate | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false)
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

  return (
    <div id="available-frameworks" className="space-y-3">
      <div className="bg-surface border border-border rounded-[16px] p-4">
        <h4 className="text-body font-semibold text-text-primary mb-3">Available Frameworks</h4>

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
          {filteredFrameworks.length === 0 ? (
            <p className="text-secondary text-text-muted py-4 text-center col-span-4">No frameworks found</p>
          ) : (
            filteredFrameworks.map((framework) => {
              const isActive = activeFramework?.framework_template_id === framework.id
              const imageUrl = framework.image_path 
                ? framework.image_path.startsWith('http') 
                  ? framework.image_path 
                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${framework.image_path}`
                : null
              
              return (
                <button
                  key={framework.id}
                  onClick={() => { setSelectedFramework(framework); setDetailModalOpen(true) }}
                  className={`relative overflow-hidden rounded-[10px] h-[180px] text-left transition-all duration-200 ${
                    isActive ? 'ring-2 ring-[#3b82f6]' : 'hover:opacity-90'
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
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold text-white bg-[#3b82f6] px-1.5 py-0.5 rounded-full">Active</span>
                    )}
                    <p className="text-[12px] font-semibold text-white leading-tight">{framework.title}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedFramework?.title || 'Framework'}>
        {selectedFramework && (
          <div className="space-y-5 px-2">
            {selectedFramework.description && (
              <p className="text-[14px] text-text-primary leading-relaxed px-1">{selectedFramework.description}</p>
            )}
            {selectedFramework.criteria && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-muted mb-3 px-1">Daily Criteria</p>
                <div className="space-y-2">
                  {(() => {
                    const criteria = selectedFramework.criteria as { items?: Array<{ key?: string; id?: string; label: string; description?: string; target?: number; unit?: string }> }
                    const rawItems = Array.isArray(criteria) ? criteria : (criteria.items || [])
                    const items = rawItems.map(item => ({ ...item, key: item.key || item.id || '' }))
                    return items.map((item) => (
                      <div key={item.key} className="flex items-start gap-3 p-4 rounded-[12px] bg-[#0d1014]">
                        <span className="w-2 h-2 rounded-full bg-[#3b82f6] mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[15px] font-medium text-text-primary">{item.label}</p>
                          {item.description && <p className="text-[12px] text-text-muted mt-1">{item.description}</p>}
                          {item.target && item.unit && (
                            <p className="text-[12px] text-[#3b82f6] mt-1">Target: {item.target} {item.unit}</p>
                          )}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
            <div className="pt-2 pb-2">
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
          <p className="text-secondary text-text-secondary">This will deactivate your current framework. History is preserved.</p>
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
