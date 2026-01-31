'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { BookOpen, Check, Circle, Minus, Search, Loader2 } from 'lucide-react'
import type { FrameworkTemplate, UserFramework, DailyFrameworkSubmission, FrameworkSubmissionStatus } from '@/lib/types'

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
  const [submitting, setSubmitting] = useState(false)
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

  const handleSubmitStatus = async (status: FrameworkSubmissionStatus) => {
    setSubmitting(true)
    try {
      await onSubmitStatus(status)
      onRefetch()
    } catch (err) {
      console.error('Failed to submit:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const isLocked = todaySubmission?.locked_at != null

  return (
    <div className="space-y-3">
      {/* Active Framework */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Daily Framework</h3>
            <p className="text-sm text-zinc-500">Your discipline checklist</p>
          </div>
        </div>

        {activeFramework?.framework_template ? (
          <div className="space-y-4">
            <div className="p-3 bg-zinc-800 rounded-md border border-zinc-700">
              <p className="font-medium text-zinc-100">{activeFramework.framework_template.title}</p>
              {activeFramework.framework_template.description && (
                <p className="text-sm text-zinc-400 mt-1">{activeFramework.framework_template.description}</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-300 mb-2">Today&apos;s Status</p>
              {isLocked ? (
                <p className="text-sm text-zinc-500 capitalize">{todaySubmission?.status} (locked)</p>
              ) : (
                <div className="flex gap-2">
                  <Button variant={todaySubmission?.status === 'complete' ? 'default' : 'outline'} size="sm" onClick={() => handleSubmitStatus('complete')} disabled={submitting} className="flex-1">
                    <Check className="h-4 w-4" /> Complete
                  </Button>
                  <Button variant={todaySubmission?.status === 'partial' ? 'default' : 'outline'} size="sm" onClick={() => handleSubmitStatus('partial')} disabled={submitting} className="flex-1">
                    <Circle className="h-4 w-4" /> Partial
                  </Button>
                  <Button variant={todaySubmission?.status === 'zero' ? 'destructive' : 'outline'} size="sm" onClick={() => handleSubmitStatus('zero')} disabled={submitting} className="flex-1">
                    <Minus className="h-4 w-4" /> Zero
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No framework active. Choose one below.</p>
        )}
      </div>

      {/* Framework List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
        <h4 className="font-semibold text-zinc-100 mb-3">Available Frameworks</h4>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filteredFrameworks.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No frameworks found</p>
          ) : (
            filteredFrameworks.map((framework) => {
              const isActive = activeFramework?.framework_template_id === framework.id
              return (
                <button
                  key={framework.id}
                  onClick={() => { setSelectedFramework(framework); setDetailModalOpen(true) }}
                  className={`w-full p-3 rounded-md text-left transition-colors ${
                    isActive ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-100">{framework.title}</span>
                    {isActive && <span className="text-xs text-blue-400 font-medium">Active</span>}
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
          <div className="p-4 space-y-4">
            {selectedFramework.description && <p className="text-sm text-zinc-400">{selectedFramework.description}</p>}
            {selectedFramework.criteria && 'items' in selectedFramework.criteria && (
              <div>
                <p className="text-sm font-medium text-zinc-200 mb-2">Criteria</p>
                <ul className="space-y-1">
                  {(selectedFramework.criteria as { items: Array<{ id: string; label: string }> }).items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="w-1 h-1 rounded-full bg-blue-400" />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button onClick={() => handleActivate(selectedFramework)} disabled={activating} className="w-full">
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : activeFramework?.framework_template_id === selectedFramework.id ? 'Currently Active' : 'Activate'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Switch Confirm */}
      <Modal isOpen={switchConfirmOpen} onClose={() => setSwitchConfirmOpen(false)} title="Switch Framework?">
        <div className="p-4 space-y-4">
          <p className="text-sm text-zinc-400">This will deactivate your current framework. History is preserved.</p>
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
