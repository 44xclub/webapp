'use client'

import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Check, Pencil, X, Clock, Calendar, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatTime } from '@/lib/date'
import type { VoiceParseResponse, LLMCreateBlock, LLMRescheduleBlock, LLMCancelBlock } from '@/lib/voice/types'
import type { VoiceState } from '@/lib/hooks/useVoiceScheduling'

interface VoiceConfirmationSheetProps {
  proposal: VoiceParseResponse | null
  state: VoiceState
  error: string | null
  onConfirm: () => void
  onEdit: () => void
  onCancel: () => void
}

export function VoiceConfirmationSheet({
  proposal,
  state,
  error,
  onConfirm,
  onEdit,
  onCancel,
}: VoiceConfirmationSheetProps) {
  const isOpen = state === 'confirming' || state === 'executing' || state === 'success'

  const content = useMemo(() => {
    if (!proposal) return null

    const action = proposal.proposed_action

    switch (action.intent) {
      case 'create_block':
        return <CreateBlockPreview action={action} />
      case 'reschedule_block':
        return <RescheduleBlockPreview action={action} />
      case 'cancel_block':
        return <CancelBlockPreview action={action} />
      default:
        return null
    }
  }, [proposal])

  if (!isOpen || !proposal) return null

  const hasClarification = proposal.needs_clarification.length > 0

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#05070a]/70 backdrop-blur-sm animate-fadeIn"
        onClick={onCancel}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg bg-[#0d1014] border-t border-[rgba(255,255,255,0.10)] rounded-t-[16px] animate-slideUp">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 rounded-full bg-[rgba(255,255,255,0.12)]" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2">
          <h3 className="text-[15px] font-bold text-[#eef2ff]">
            {state === 'success' ? 'Scheduled' : 'Confirm Voice Command'}
          </h3>
          <p className="text-[12px] text-[rgba(238,242,255,0.52)] mt-0.5">
            {proposal.summary_text}
          </p>
        </div>

        {/* Clarification warning */}
        {hasClarification && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-[10px] bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.15)]">
            <p className="text-[12px] text-[rgba(251,191,36,0.85)] font-medium">
              {proposal.needs_clarification[0]}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="px-4 pb-3">
          {content}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-[10px] bg-[rgba(255,80,80,0.08)] border border-[rgba(255,80,80,0.15)]">
            <p className="text-[12px] text-[rgba(255,80,80,0.85)]">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div
          className="px-4 pt-2 flex gap-2"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
        >
          {state === 'success' ? (
            <Button
              className="flex-1"
              onClick={onCancel}
            >
              <Check className="h-4 w-4 mr-1.5" />
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={onCancel}
                disabled={state === 'executing'}
              >
                <X className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onEdit}
                disabled={state === 'executing'}
              >
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
              <Button
                className="flex-1"
                onClick={onConfirm}
                loading={state === 'executing'}
                disabled={hasClarification}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Confirm
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ---- Sub-components for each intent preview ----

function CreateBlockPreview({ action }: { action: LLMCreateBlock }) {
  const { block } = action
  const items = block.payload?.workout?.items || []

  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2">
      {/* Date + Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[13px] text-[rgba(238,242,255,0.75)]">
          <Calendar className="h-3.5 w-3.5 text-[rgba(238,242,255,0.45)]" />
          {block.date_local}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-[rgba(238,242,255,0.75)]">
          <Clock className="h-3.5 w-3.5 text-[rgba(238,242,255,0.45)]" />
          {formatTime(block.start_time_local)}
        </div>
      </div>

      {/* Title */}
      <div className="text-[14px] font-semibold text-[#eef2ff]">
        {block.title || 'Workout'}
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-[rgba(238,242,255,0.60)]">
              <Dumbbell className="h-3 w-3 text-[rgba(238,242,255,0.30)]" />
              {item.name}
            </div>
          ))}
        </div>
      )}

      {/* Duration */}
      <div className="text-[11px] text-[rgba(238,242,255,0.40)]">
        Duration: {block.duration_minutes} min
      </div>
    </div>
  )
}

function RescheduleBlockPreview({ action }: { action: LLMRescheduleBlock }) {
  const from = action.target.selector
  const to = action.new_time

  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2">
      {from && (
        <div className="text-[13px] text-[rgba(238,242,255,0.52)]">
          From: {from.date_local} at {formatTime(from.start_time_local)}
        </div>
      )}
      <div className="text-[13px] text-[rgba(238,242,255,0.75)] font-medium">
        To: {to.date_local} at {formatTime(to.start_time_local)}
      </div>
    </div>
  )
}

function CancelBlockPreview({ action }: { action: LLMCancelBlock }) {
  const target = action.target.selector

  return (
    <div className="rounded-[12px] border border-[rgba(255,80,80,0.10)] bg-[rgba(255,80,80,0.04)] p-3">
      <div className="text-[13px] text-[rgba(255,80,80,0.75)] font-medium">
        Cancel workout {target ? `on ${target.date_local} at ${formatTime(target.start_time_local)}` : ''}
      </div>
    </div>
  )
}
