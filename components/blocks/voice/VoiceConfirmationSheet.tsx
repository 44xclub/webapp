'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  Pencil,
  X,
  Clock,
  Calendar,
  Dumbbell,
  Apple,
  Heart,
  User,
  ArrowRight,
  Trash2,
  Send,
  Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { formatTime } from '@/lib/date'
import type { VoiceParseResponse, LLMCreateBlock, LLMRescheduleBlock, LLMCancelBlock, VoiceMode } from '@/lib/voice/types'
import type { VoiceState } from '@/lib/hooks/useVoiceScheduling'

interface VoiceConfirmationSheetProps {
  proposal: VoiceParseResponse | null
  state: VoiceState
  error: string | null
  onConfirm: () => void
  onEdit: () => void
  onCancel: () => void
  /** Submit a typed command (fallback when mic unavailable) */
  onTextSubmit?: (text: string) => void
}

/** Icon for each block type */
function BlockTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'workout':
      return <Dumbbell className={className} />
    case 'nutrition':
      return <Apple className={className} />
    case 'checkin':
      return <Heart className={className} />
    case 'personal':
      return <User className={className} />
    case 'habit':
    default:
      return <Check className={className} />
  }
}

/** Human-readable label for block types */
function blockTypeLabel(type: string): string {
  switch (type) {
    case 'workout': return 'Workout'
    case 'habit': return 'Habit'
    case 'nutrition': return 'Nutrition'
    case 'checkin': return 'Check-in'
    case 'personal': return 'Personal'
    default: return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

export function VoiceConfirmationSheet({
  proposal,
  state,
  error,
  onConfirm,
  onEdit,
  onCancel,
  onTextSubmit,
}: VoiceConfirmationSheetProps) {
  // Track whether we entered text input mode (stays true through parsing/error)
  const wasTextInputRef = useRef(false)
  if (state === 'text_input') wasTextInputRef.current = true
  if (state === 'idle' || state === 'recording' || state === 'confirming' || state === 'file_capture') wasTextInputRef.current = false

  const isTextInput = state === 'text_input' || ((state === 'parsing' || state === 'error') && wasTextInputRef.current)
  const isOpen = state === 'confirming' || state === 'executing' || state === 'success' || isTextInput

  const content = useMemo(() => {
    if (!proposal) return null

    const action = proposal.proposed_action

    switch (action.intent) {
      case 'create_block':
        return <CreateBlockPreview action={action} mode={proposal.mode} resolvedDatetime={proposal.resolved_datetime} />
      case 'reschedule_block':
        return <RescheduleBlockPreview action={action} />
      case 'cancel_block':
        return <CancelBlockPreview action={action} />
      default:
        return null
    }
  }, [proposal])

  // Text input fallback — shown when mic APIs aren't available (e.g. iOS WebView)
  if (isTextInput) {
    return <VoiceTextInputSheet onSubmit={onTextSubmit} onCancel={onCancel} isParsing={state === 'parsing'} error={error} />
  }

  if (!isOpen || !proposal) return null

  const hasClarification = proposal.needs_clarification.length > 0
  const isLog = proposal.mode === 'log'
  const headerText = state === 'success'
    ? (isLog ? 'Logged' : 'Scheduled')
    : 'Confirm Voice Command'

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
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-[#eef2ff]">
              {headerText}
            </h3>
            {proposal.mode && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                isLog
                  ? 'bg-[rgba(34,197,94,0.12)] text-[rgba(34,197,94,0.85)]'
                  : 'bg-[rgba(99,102,241,0.12)] text-[rgba(129,140,248,0.85)]'
              }`}>
                {isLog ? 'LOG' : 'SCHEDULE'}
              </span>
            )}
          </div>
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

function CreateBlockPreview({
  action,
  mode,
  resolvedDatetime,
}: {
  action: LLMCreateBlock
  mode: VoiceMode | null
  resolvedDatetime: string | null
}) {
  const { block } = action
  const workoutData = block.payload?.workout as { items?: { name: string; sets?: number | null; reps?: number | null }[] } | undefined
  const workoutItems = block.block_type === 'workout' ? (workoutData?.items || []) : []

  // Parse date/time from datetime_local or resolved_datetime
  const dt = resolvedDatetime || block.datetime_local
  const dateStr = dt ? dt.slice(0, 10) : null
  const timeStr = dt ? dt.slice(11, 16) : null

  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2">
      {/* Block type badge + title */}
      <div className="flex items-center gap-2">
        <BlockTypeIcon type={block.block_type} className="h-4 w-4 text-[rgba(238,242,255,0.55)]" />
        <span className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] uppercase tracking-wider">
          {blockTypeLabel(block.block_type)}
        </span>
      </div>

      {/* Title */}
      <div className="text-[14px] font-semibold text-[#eef2ff]">
        {block.title || blockTypeLabel(block.block_type)}
      </div>

      {/* Date + Time */}
      {(dateStr || timeStr) && (
        <div className="flex items-center gap-4">
          {dateStr && (
            <div className="flex items-center gap-1.5 text-[13px] text-[rgba(238,242,255,0.75)]">
              <Calendar className="h-3.5 w-3.5 text-[rgba(238,242,255,0.45)]" />
              {dateStr}
            </div>
          )}
          {timeStr && (
            <div className="flex items-center gap-1.5 text-[13px] text-[rgba(238,242,255,0.75)]">
              <Clock className="h-3.5 w-3.5 text-[rgba(238,242,255,0.45)]" />
              {formatTime(timeStr)}
            </div>
          )}
        </div>
      )}

      {/* Workout items */}
      {workoutItems.length > 0 && (
        <div className="space-y-1">
          {workoutItems.map((item: { name: string; sets?: number | null; reps?: number | null }, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-[rgba(238,242,255,0.60)]">
              <Dumbbell className="h-3 w-3 text-[rgba(238,242,255,0.30)]" />
              <span>{item.name}</span>
              {(item.sets || item.reps) && (
                <span className="text-[rgba(238,242,255,0.40)]">
                  {item.sets && item.reps ? `${item.sets}×${item.reps}` : item.sets ? `${item.sets} sets` : `${item.reps} reps`}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {block.notes && (
        <div className="text-[12px] text-[rgba(238,242,255,0.50)] italic">
          {block.notes}
        </div>
      )}

      {/* Duration */}
      {block.duration_minutes && (
        <div className="text-[11px] text-[rgba(238,242,255,0.40)]">
          Duration: {block.duration_minutes} min
        </div>
      )}

      {/* Log mode feed indicator */}
      {mode === 'log' && block.block_type !== 'personal' && (
        <div className="text-[11px] text-[rgba(34,197,94,0.65)]">
          Will be shared to feed
        </div>
      )}
    </div>
  )
}

function RescheduleBlockPreview({ action }: { action: LLMRescheduleBlock }) {
  const from = action.target.selector
  const to = action.new_time

  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2">
      <div className="flex items-center gap-2 text-[13px] text-[rgba(238,242,255,0.52)]">
        <Calendar className="h-3.5 w-3.5" />
        <span>Move block</span>
      </div>
      {from && (
        <div className="flex items-center gap-2 text-[13px] text-[rgba(238,242,255,0.52)]">
          <span>
            From: {from.date_local}{from.start_time_local ? ` at ${formatTime(from.start_time_local)}` : ''}
            {from.block_type ? ` (${blockTypeLabel(from.block_type)})` : ''}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 text-[13px] text-[rgba(238,242,255,0.75)] font-medium">
        <ArrowRight className="h-3.5 w-3.5 text-[rgba(238,242,255,0.45)]" />
        <span>To: {to.date_local} at {formatTime(to.start_time_local)}</span>
      </div>
    </div>
  )
}

function CancelBlockPreview({ action }: { action: LLMCancelBlock }) {
  const target = action.target.selector

  return (
    <div className="rounded-[12px] border border-[rgba(255,80,80,0.10)] bg-[rgba(255,80,80,0.04)] p-3 space-y-1">
      <div className="flex items-center gap-2 text-[13px] text-[rgba(255,80,80,0.75)] font-medium">
        <Trash2 className="h-3.5 w-3.5" />
        <span>Cancel block</span>
      </div>
      {target && (
        <div className="text-[12px] text-[rgba(255,80,80,0.55)]">
          {target.date_local}{target.start_time_local ? ` at ${formatTime(target.start_time_local)}` : ''}
          {target.block_type ? ` — ${blockTypeLabel(target.block_type)}` : ''}
          {target.title_contains ? ` matching "${target.title_contains}"` : ''}
        </div>
      )}
    </div>
  )
}

// ---- Text Input Fallback (for iOS WebView / Whop mobile) ----

function VoiceTextInputSheet({
  onSubmit,
  onCancel,
  isParsing,
  error,
}: {
  onSubmit?: (text: string) => void
  onCancel: () => void
  isParsing: boolean
  error: string | null
}) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the input when sheet appears
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || !onSubmit) return
    onSubmit(trimmed)
  }

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
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[rgba(238,242,255,0.55)]" />
            <h3 className="text-[15px] font-bold text-[#eef2ff]">
              Type your command
            </h3>
          </div>
          <p className="text-[12px] text-[rgba(238,242,255,0.45)] mt-1">
            Mic not available here — type what you&apos;d like to schedule or log
          </p>
        </div>

        {/* Input */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="e.g. Bench press 3x10 80kg tomorrow 7pm"
              disabled={isParsing}
              className="flex-1 px-3 py-2.5 rounded-[10px] text-[14px] text-[#eef2ff] placeholder-[rgba(238,242,255,0.30)] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] focus:border-[#3b82f6] focus:outline-none transition-colors"
            />
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || isParsing}
              loading={isParsing}
              className="h-[42px] w-[42px] p-0 rounded-[10px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-[10px] bg-[rgba(255,80,80,0.08)] border border-[rgba(255,80,80,0.15)]">
            <p className="text-[12px] text-[rgba(255,80,80,0.85)]">{error}</p>
          </div>
        )}

        {/* Cancel */}
        <div
          className="px-4 pt-1"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={onCancel}
            className="w-full py-2 text-[13px] font-medium text-[rgba(238,242,255,0.40)] hover:text-[rgba(238,242,255,0.60)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
