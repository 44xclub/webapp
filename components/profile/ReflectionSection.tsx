'use client'

import { useState, useCallback } from 'react'
import { Textarea, Button } from '@/components/ui'
import { parseDateOnly } from '@/lib/date'
import { ChevronDown, ChevronUp, Loader2, Check, FileText, Send } from 'lucide-react'
import type { ReflectionCycleWithEntry, ReflectionAnswers, ReflectionStatus } from '@/lib/types'

interface ReflectionSectionProps {
  cycles: ReflectionCycleWithEntry[]
  loading: boolean
  saving: boolean
  onSave: (cycleId: string, answers: ReflectionAnswers, submit?: boolean) => Promise<unknown>
}

const QUESTIONS = [
  { key: 'q1', label: 'What went well this cycle?', multiline: true },
  { key: 'q2', label: 'What didn\'t go as planned?', multiline: true },
  { key: 'q3', label: 'What did I learn about myself?', multiline: true },
  { key: 'q4', label: 'What will I do differently next cycle?', multiline: true },
  { key: 'q5', label: 'What am I grateful for?', multiline: true },
  { key: 'q6', label: 'What are my priorities for the next two weeks?', multiline: true },
  { key: 'q7', label: 'What support or resources do I need?', multiline: true },
  { key: 'q8', label: 'One word to describe how I feel right now', multiline: false },
] as const

const statusConfig: Record<ReflectionStatus, { label: string; className: string }> = {
  not_started: {
    label: 'Not started',
    className: 'text-[rgba(238,242,255,0.45)] bg-[rgba(255,255,255,0.04)]',
  },
  draft: {
    label: 'Draft',
    className: 'text-amber-400 bg-amber-400/10',
  },
  submitted: {
    label: 'Submitted',
    className: 'text-emerald-400 bg-emerald-400/10',
  },
}

function CycleRow({
  cycle,
  isExpanded,
  onToggle,
  onSave,
  saving,
}: {
  cycle: ReflectionCycleWithEntry
  isExpanded: boolean
  onToggle: () => void
  onSave: (answers: ReflectionAnswers, submit?: boolean) => Promise<unknown>
  saving: boolean
}) {
  const [localAnswers, setLocalAnswers] = useState<ReflectionAnswers>(
    cycle.entry?.answers || {}
  )
  const [lastSaved, setLastSaved] = useState<Date | null>(
    cycle.entry?.updated_at ? new Date(cycle.entry.updated_at) : null
  )

  const isSubmitted = cycle.displayStatus === 'submitted'
  const status = statusConfig[cycle.displayStatus]

  const handleSave = useCallback(async (submit: boolean = false) => {
    const result = await onSave(localAnswers, submit)
    if (result) {
      setLastSaved(new Date())
    }
  }, [localAnswers, onSave])

  const handleInputChange = (key: keyof ReflectionAnswers, value: string) => {
    if (isSubmitted) return
    setLocalAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="border-b border-[rgba(255,255,255,0.06)] last:border-b-0">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex-1 text-left">
          <p className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">
            {cycle.label}
          </p>
          {lastSaved && cycle.displayStatus !== 'not_started' && (
            <p className="text-[11px] text-[rgba(238,242,255,0.40)] mt-0.5">
              Last updated: {lastSaved.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          )}
        </div>
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[rgba(255,255,255,0.04)]">
          {/* Date range header */}
          <div className="flex items-center justify-between py-2">
            <p className="text-[11px] text-[rgba(238,242,255,0.45)]">
              {parseDateOnly(cycle.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              {' — '}
              {parseDateOnly(cycle.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Questions */}
          {QUESTIONS.map((q, index) => (
            <div key={q.key}>
              <label className="block text-[12px] font-medium text-[rgba(238,242,255,0.72)] mb-1.5">
                {index + 1}. {q.label}
              </label>
              {q.multiline ? (
                <Textarea
                  value={localAnswers[q.key] || ''}
                  onChange={(e) => handleInputChange(q.key, e.target.value)}
                  placeholder={isSubmitted ? '' : 'Write your thoughts...'}
                  rows={3}
                  disabled={isSubmitted}
                  className="resize-none text-[13px]"
                />
              ) : (
                <input
                  type="text"
                  value={localAnswers[q.key] || ''}
                  onChange={(e) => handleInputChange(q.key, e.target.value)}
                  placeholder={isSubmitted ? '' : 'Enter one word...'}
                  disabled={isSubmitted}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[10px] text-[13px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.30)] focus:border-[#3b82f6] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              )}
            </div>
          ))}

          {/* Actions */}
          {!isSubmitted && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {lastSaved && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {isSubmitted && cycle.entry?.submitted_at && (
            <p className="text-[11px] text-emerald-400 pt-2 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Submitted on {new Date(cycle.entry.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function ReflectionSection({ cycles, loading, saving, onSave }: ReflectionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null)

  // Show only the most recent 6 cycles
  const visibleCycles = cycles.slice(0, 6)

  // Current cycle (for the collapsed preview)
  const currentCycle = cycles.find((c) => {
    const today = new Date().toISOString().split('T')[0]
    return c.start_date <= today && c.end_date >= today
  }) || cycles[0]

  const handleToggleCycle = (cycleId: string) => {
    setExpandedCycleId((prev) => (prev === cycleId ? null : cycleId))
  }

  const handleSaveCycle = useCallback(
    (cycleId: string) => async (answers: ReflectionAnswers, submit?: boolean) => {
      return onSave(cycleId, answers, submit)
    },
    [onSave]
  )

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Section header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div>
          <h3 className="text-[14px] font-semibold text-[#eef2ff]">Reflection & Planning</h3>
          {!isExpanded && currentCycle && (
            <p className="text-[11px] text-[rgba(238,242,255,0.45)] mt-0.5">
              Current: {currentCycle.label.replace('Reflection — ', '')}
              {' · '}
              <span className={currentCycle.displayStatus === 'submitted' ? 'text-emerald-400' : currentCycle.displayStatus === 'draft' ? 'text-amber-400' : ''}>
                {statusConfig[currentCycle.displayStatus].label}
              </span>
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-[rgba(238,242,255,0.30)]" />
            </div>
          ) : visibleCycles.length === 0 ? (
            <div className="p-4 text-center text-[12px] text-[rgba(238,242,255,0.40)]">
              No reflection cycles available
            </div>
          ) : (
            visibleCycles.map((cycle) => (
              <CycleRow
                key={cycle.id}
                cycle={cycle}
                isExpanded={expandedCycleId === cycle.id}
                onToggle={() => handleToggleCycle(cycle.id)}
                onSave={handleSaveCycle(cycle.id)}
                saving={saving}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
