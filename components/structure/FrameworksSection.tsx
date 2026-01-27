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

export function FrameworksSection({
  frameworks,
  activeFramework,
  todaySubmission,
  onActivateFramework,
  onSubmitStatus,
  onRefetch,
}: FrameworksSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<FrameworkTemplate | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activating, setActivating] = useState(false)

  const filteredFrameworks = frameworks.filter((f) =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      console.error('Failed to activate framework:', err)
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
      console.error('Failed to switch framework:', err)
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
      console.error('Failed to submit status:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const isLocked = todaySubmission?.locked_at != null

  return (
    <div className="space-y-4">
      {/* Active Framework & Daily Submission */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <BookOpen className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Daily Framework</h3>
            <p className="text-sm text-muted-foreground">Your daily discipline checklist</p>
          </div>
        </div>

        {activeFramework?.framework_template ? (
          <div className="space-y-4">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="font-medium text-foreground">{activeFramework.framework_template.title}</p>
              {activeFramework.framework_template.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {activeFramework.framework_template.description}
                </p>
              )}
            </div>

            {/* Daily Status Submission */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Today&apos;s Status</p>
              {isLocked ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="capitalize">{todaySubmission?.status}</span>
                  <span className="text-xs">(locked)</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant={todaySubmission?.status === 'complete' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSubmitStatus('complete')}
                    disabled={submitting}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                  <Button
                    variant={todaySubmission?.status === 'partial' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSubmitStatus('partial')}
                    disabled={submitting}
                    className="flex-1"
                  >
                    <Circle className="h-4 w-4 mr-1" />
                    Partial
                  </Button>
                  <Button
                    variant={todaySubmission?.status === 'zero' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => handleSubmitStatus('zero')}
                    disabled={submitting}
                    className="flex-1"
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    Zero
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No framework activated. Choose one below to start tracking.
          </p>
        )}
      </div>

      {/* Framework List */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-3">Available Frameworks</h4>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search frameworks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Framework List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredFrameworks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No frameworks found
            </p>
          ) : (
            filteredFrameworks.map((framework) => {
              const isActive = activeFramework?.framework_template_id === framework.id
              return (
                <button
                  key={framework.id}
                  onClick={() => {
                    setSelectedFramework(framework)
                    setDetailModalOpen(true)
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{framework.title}</span>
                    {isActive && (
                      <span className="text-xs text-primary font-medium">Active</span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Framework Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedFramework?.title || 'Framework'}
      >
        {selectedFramework && (
          <div className="p-4 space-y-4">
            {selectedFramework.description && (
              <p className="text-sm text-muted-foreground">{selectedFramework.description}</p>
            )}

            {/* Criteria List */}
            {selectedFramework.criteria && 'items' in selectedFramework.criteria && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Criteria</p>
                <ul className="space-y-2">
                  {(selectedFramework.criteria as { items: Array<{ id: string; label: string; description?: string }> }).items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-foreground">{item.label}</span>
                        {item.description && (
                          <p className="text-muted-foreground text-xs">{item.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={() => handleActivate(selectedFramework)}
              disabled={activating}
              className="w-full"
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : activeFramework?.framework_template_id === selectedFramework.id ? (
                'Currently Active'
              ) : activeFramework ? (
                'Switch to this Framework'
              ) : (
                'Activate Framework'
              )}
            </Button>
          </div>
        )}
      </Modal>

      {/* Switch Confirmation Modal */}
      <Modal
        isOpen={switchConfirmOpen}
        onClose={() => setSwitchConfirmOpen(false)}
        title="Switch Framework?"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Switching will deactivate your current framework. Your history will be preserved.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSwitchConfirmOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSwitch}
              disabled={activating}
              className="flex-1"
            >
              {activating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Switch'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
