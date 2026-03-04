'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Plus,
  Target,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  Play,
  X,
} from 'lucide-react'
import { useAuth, useProfile } from '@/lib/hooks'
import { usePersonalFramework } from '@/lib/hooks/usePersonalFramework'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { useToast } from '@/components/shared/Toast'
import type { FrameworkCriteriaItem } from '@/lib/types'

// Criteria type options
const criteriaTypes = [
  { value: 'boolean', label: 'Checkbox', description: 'Yes/No completion' },
  { value: 'number', label: 'Numeric', description: 'Target with unit' },
]

// Example criteria for guidance
const exampleCriteria = [
  '30 min walk (no phone)',
  'No phone first 30 minutes',
  'Plan tomorrow in app',
  '8 hours sleep',
  'Read 20 pages',
]

// Rejected patterns (UI warns)
const rejectedPatterns = ['be mindful', 'try harder', 'eat better', 'feel good', 'be happy']

export default function PersonalFrameworkPage() {
  const { user, loading: authLoading } = useAuth()
  const [showEditor, setShowEditor] = useState(false)

  const router = useRouter()

  const { profile, loading: profileLoading, avatarUrl } = useProfile(user?.id)
  const { showToast } = useToast()
  const {
    personalFramework,
    activeFramework,
    loading: frameworkLoading,
    createPersonalFramework,
    updatePersonalFramework,
    deletePersonalFramework,
    activateFramework,
  } = usePersonalFramework({ userId: user?.id })

  const handleCreate = async (data: { title: string; description?: string; criteria: FrameworkCriteriaItem[] }) => {
    const framework = await createPersonalFramework(data)
    if (framework) {
      setShowEditor(false)
    }
  }

  const handleUpdate = async (data: { title?: string; description?: string; criteria?: FrameworkCriteriaItem[] }) => {
    if (!personalFramework) return
    await updatePersonalFramework(personalFramework.id, data)
    setShowEditor(false)
  }

  const handleActivate = async () => {
    if (!personalFramework) return
    const success = await activateFramework(personalFramework.id)
    if (success) {
      showToast('success', 'Framework activated! Track your daily non-negotiables.')
    }
  }

  const handleDelete = async () => {
    if (!personalFramework) return
    const success = await deletePersonalFramework(personalFramework.id)
    if (success) {
      showToast('status', 'Framework deleted.')
    }
  }

  const isPersonalFrameworkActive = activeFramework?.framework_template_id === personalFramework?.id

  if (authLoading || !user) {
    return (
      <div className="app-shell">
        <div className="min-h-app flex items-center justify-center bg-[#07090d]">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="min-h-app bg-[#07090d]" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
        <HeaderStrip profile={profile} loading={profileLoading} avatarUrl={avatarUrl} />

        <header className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-semibold text-[#eef2ff]">Personal Discipline Framework</h1>
            <button
              onClick={() => router.push('/structure')}
              className="p-2 -mr-2 rounded-[10px] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            >
              <X className="h-5 w-5 text-[rgba(238,242,255,0.72)]" />
            </button>
          </div>
          <p className="text-[13px] text-[rgba(238,242,255,0.52)] mt-1">
            Define up to 5 daily non-negotiables
          </p>
        </header>

        <main className="px-4 py-4 space-y-4">
          {frameworkLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.45)]" />
            </div>
          ) : !personalFramework ? (
            <EmptyState onCreateClick={() => setShowEditor(true)} />
          ) : (
            <>
              {/* Framework Card */}
              <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#3b82f6]/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-[#3b82f6]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#eef2ff]">{personalFramework.title}</p>
                      {personalFramework.description && (
                        <p className="text-[12px] text-[rgba(238,242,255,0.52)]">{personalFramework.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPersonalFrameworkActive ? (
                      <span className="text-[11px] px-2 py-1 rounded-[6px] bg-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={handleActivate}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-[#3b82f6] text-white text-[12px] font-medium"
                      >
                        <Play className="h-3 w-3" />
                        Activate
                      </button>
                    )}
                  </div>
                </div>

                {/* Criteria List */}
                <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                  {(personalFramework.criteria as any)?.items?.map((item: FrameworkCriteriaItem, idx: number) => (
                    <div key={item.key || idx} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[11px] text-[rgba(238,242,255,0.52)]">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] text-[#eef2ff]">{item.label}</p>
                        {item.type === 'number' && item.target && (
                          <p className="text-[11px] text-[rgba(238,242,255,0.45)]">
                            Target: {item.target} {item.unit || ''}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] bg-[rgba(255,255,255,0.06)] text-[rgba(238,242,255,0.52)]">
                        {item.type === 'number' ? 'Numeric' : 'Checkbox'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                  <button
                    onClick={() => setShowEditor(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.06)]"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-[rgba(59,130,246,0.08)] rounded-[12px] p-4 border border-[rgba(59,130,246,0.2)]">
                <h3 className="text-[13px] font-medium text-[#3b82f6] mb-2">How it works</h3>
                <ul className="text-[12px] text-[rgba(238,242,255,0.60)] space-y-1">
                  <li>• Complete your non-negotiables daily to earn framework points</li>
                  <li>• Each completed item contributes +1 to your discipline score</li>
                  <li>• Consistent completion helps maintain badge eligibility</li>
                </ul>
              </div>
            </>
          )}
        </main>

        <BottomNav />

        {showEditor && (
          <FrameworkEditorModal
            existingFramework={personalFramework}
            onClose={() => setShowEditor(false)}
            onSave={personalFramework ? handleUpdate : handleCreate}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] p-6 border border-[rgba(255,255,255,0.06)] text-center">
      <Target className="h-12 w-12 text-[rgba(238,242,255,0.35)] mx-auto mb-4" />
      <h3 className="text-[16px] font-medium text-[#eef2ff] mb-2">No Personal Framework</h3>
      <p className="text-[13px] text-[rgba(238,242,255,0.45)] mb-4">
        Create your own discipline framework with up to 5 daily non-negotiables.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#3b82f6] text-white text-[13px] font-medium"
      >
        <Plus className="h-4 w-4" />
        Create Framework
      </button>

      {/* Examples */}
      <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)] text-left">
        <p className="text-[12px] text-[rgba(238,242,255,0.52)] mb-2">Example non-negotiables:</p>
        <div className="flex flex-wrap gap-2">
          {exampleCriteria.map((ex) => (
            <span key={ex} className="text-[11px] px-2 py-1 rounded-[6px] bg-[rgba(255,255,255,0.06)] text-[rgba(238,242,255,0.60)]">
              {ex}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function FrameworkEditorModal({
  existingFramework,
  onClose,
  onSave,
}: {
  existingFramework: any
  onClose: () => void
  onSave: (data: { title: string; description?: string; criteria: FrameworkCriteriaItem[] }) => void
}) {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [title, setTitle] = useState(existingFramework?.title || '')
  const [description, setDescription] = useState(existingFramework?.description || '')
  const [criteria, setCriteria] = useState<FrameworkCriteriaItem[]>(
    (existingFramework?.criteria as any)?.items || []
  )
  const [saving, setSaving] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])

  // Skip to step 2 when editing existing framework
  useState(() => {
    if (existingFramework) setWizardStep(1)
  })

  const addCriterion = () => {
    if (criteria.length >= 5) return
    setCriteria([
      ...criteria,
      { key: `item_${Date.now()}`, label: '', type: 'boolean' },
    ])
  }

  const updateCriterion = (index: number, updates: Partial<FrameworkCriteriaItem>) => {
    const newCriteria = [...criteria]
    newCriteria[index] = { ...newCriteria[index], ...updates }
    setCriteria(newCriteria)

    if (updates.label) {
      const lower = updates.label.toLowerCase()
      const hasRejected = rejectedPatterns.some((p) => lower.includes(p))
      if (hasRejected) {
        setWarnings((prev) => [...prev.filter((w) => !w.includes(updates.label!)), `"${updates.label}" may be too vague. Try a specific action.`])
      }
    }
  }

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!title.trim() || criteria.length === 0) return
    if (criteria.some((c) => !c.label.trim())) return

    setSaving(true)
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      criteria,
    })
    setSaving(false)
  }

  const canGoToStep2 = title.trim().length > 0
  const canGoToStep3 = criteria.length > 0 && criteria.every((c) => c.label.trim())

  const stepLabels = ['Name', 'Rules', 'Review']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0f1115] rounded-t-[20px] sm:rounded-[20px] border-t border-[rgba(255,255,255,0.08)] sm:border">
        {/* Header with step indicator */}
        <div className="sticky top-0 bg-[#0f1115] px-5 pt-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold text-[#eef2ff]">
              {existingFramework ? 'Edit Framework' : 'Build Framework'}
            </h2>
            <button onClick={onClose} className="p-2 -m-1 rounded-[10px] hover:bg-[rgba(255,255,255,0.06)] touch-manipulation">
              <X className="h-5 w-5 text-[rgba(238,242,255,0.52)]" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-1.5">
                <div className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= wizardStep ? 'bg-[#3b82f6]' : 'bg-[rgba(255,255,255,0.08)]'
                }`} />
                <span className={`text-[10px] font-medium ${
                  s === wizardStep ? 'text-[#3b82f6]' : 'text-[rgba(238,242,255,0.35)]'
                }`}>{stepLabels[s - 1]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: Name & description */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-1.5">
                  Framework Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Morning Discipline Protocol"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-1.5">
                  Description <span className="text-[rgba(238,242,255,0.35)]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your framework"
                  className="w-full px-3 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[14px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <button
                onClick={() => setWizardStep(2)}
                disabled={!canGoToStep2}
                className="w-full py-2.5 rounded-[10px] bg-[#3b82f6] text-white text-[14px] font-medium disabled:opacity-40 transition-opacity"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 2: Add non-negotiables */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-[rgba(238,242,255,0.72)]">
                  Non-Negotiables ({criteria.length}/5)
                </p>
                {criteria.length < 5 && (
                  <button type="button" onClick={addCriterion} className="text-[12px] text-[#3b82f6] font-medium">
                    + Add
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {criteria.map((item, idx) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-[11px] flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateCriterion(idx, { label: e.target.value })}
                      placeholder="30 min walk (no phone)"
                      className="flex-1 px-3 py-2 rounded-[8px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[13px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.35)] focus:outline-none focus:border-[#3b82f6]"
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(idx)}
                      className="p-1.5 rounded-[6px] text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 touch-manipulation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {criteria.length === 0 && (
                  <button
                    type="button"
                    onClick={addCriterion}
                    className="w-full py-3 rounded-[10px] border-2 border-dashed border-[rgba(255,255,255,0.12)] text-[rgba(238,242,255,0.52)] text-[13px] flex items-center justify-center gap-2 hover:border-[rgba(255,255,255,0.2)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Non-Negotiable
                  </button>
                )}
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-amber-500/10 rounded-[10px] p-3 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-[12px] text-amber-400 space-y-1">
                      {warnings.map((w, i) => <p key={i}>{w}</p>)}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[rgba(238,242,255,0.40)]">
                Each item should be a specific, measurable daily action.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setWizardStep(1)}
                  className="flex-1 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.06)] text-[rgba(238,242,255,0.72)] text-[14px] font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  disabled={!canGoToStep3}
                  className="flex-1 py-2.5 rounded-[10px] bg-[#3b82f6] text-white text-[14px] font-medium disabled:opacity-40 transition-opacity"
                >
                  Review
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & save */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                  <p className="text-[15px] font-semibold text-[#eef2ff]">{title}</p>
                  {description && (
                    <p className="text-[12px] text-[rgba(238,242,255,0.50)] mt-0.5">{description}</p>
                  )}
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                  {criteria.map((item, idx) => (
                    <div key={item.key} className="px-4 py-2.5 flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-[6px] border-2 border-[rgba(255,255,255,0.20)]" />
                      <span className="text-[13px] text-[#eef2ff]">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setWizardStep(2)}
                  className="flex-1 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.06)] text-[rgba(238,242,255,0.72)] text-[14px] font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-[10px] bg-[#3b82f6] text-white text-[14px] font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {existingFramework ? 'Save Changes' : 'Create Framework'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
