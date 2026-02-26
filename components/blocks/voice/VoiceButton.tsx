'use client'

import { useCallback } from 'react'
import { Mic, MicOff, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VoiceState } from '@/lib/hooks/useVoiceScheduling'

interface VoiceButtonProps {
  state: VoiceState
  error: string | null
  onStartRecording: () => void
  onStopRecording: () => void
  onDismiss: () => void
  onCheckBreakout?: () => void
}

const stateLabels: Record<VoiceState, string> = {
  idle: 'Tap to speak',
  recording: 'Listening...',
  text_input: '',
  breakout: 'Waiting for recording...',
  transcribing: 'Transcribing...',
  parsing: 'Processing...',
  confirming: '',
  executing: 'Scheduling...',
  success: 'Done!',
  error: 'Try again',
}

export function VoiceButton({
  state,
  error,
  onStartRecording,
  onStopRecording,
  onDismiss,
  onCheckBreakout,
}: VoiceButtonProps) {
  const isActive = state === 'recording'
  const isProcessing = state === 'transcribing' || state === 'parsing' || state === 'executing'
  const isError = state === 'error'
  const isBreakout = state === 'breakout'

  const handleClick = useCallback(() => {
    if (isActive) {
      onStopRecording()
    } else if (state === 'idle' || isError) {
      onStartRecording()
    }
  }, [state, isActive, isError, onStartRecording, onStopRecording])

  // Don't render when confirming, text input, or when the sheet is showing
  if (state === 'confirming' || state === 'text_input') return null

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Breakout info toast */}
      {isBreakout && error && (
        <div className="max-w-[220px] px-3 py-2 rounded-[10px] bg-[rgba(99,102,241,0.10)] border border-[rgba(99,102,241,0.20)]">
          <p className="text-[11px] text-[rgba(129,140,248,0.85)] text-center leading-snug">
            {error}
          </p>
        </div>
      )}

      {/* Status label */}
      {state !== 'idle' && !isBreakout && stateLabels[state] && (
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-wider max-w-[140px] text-center leading-tight',
          'text-[rgba(238,242,255,0.52)]',
        )}>
          {stateLabels[state]}
        </span>
      )}

      {/* Main mic button */}
      <button
        onClick={handleClick}
        disabled={isProcessing || isBreakout}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-200',
          'h-14 w-14 shadow-lg',
          isActive
            ? 'bg-red-500/90 scale-110'
            : isProcessing
              ? 'bg-[rgba(255,255,255,0.08)] cursor-wait'
              : isBreakout
                ? 'bg-[rgba(99,102,241,0.12)] border border-indigo-500/30 cursor-wait'
                : isError
                  ? 'bg-[rgba(255,80,80,0.15)] border border-red-500/30'
                  : 'bg-[#3b82f6] hover:bg-[#3b82f6]/90',
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.70)]" />
        ) : isBreakout ? (
          <ExternalLink className="h-6 w-6 text-indigo-400 animate-pulse" />
        ) : isActive ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}

        {/* Recording pulse ring */}
        {isActive && (
          <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-40" />
        )}
      </button>

      {/* "I'm back" button — manual re-check during breakout polling */}
      {isBreakout && onCheckBreakout && (
        <button
          onClick={onCheckBreakout}
          className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-[rgba(129,140,248,0.85)] bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.15)] hover:bg-[rgba(99,102,241,0.15)] transition-colors"
        >
          I&apos;m back
        </button>
      )}

      {/* Cancel breakout */}
      {isBreakout && (
        <button
          onClick={onDismiss}
          className="text-[11px] text-[rgba(238,242,255,0.35)] hover:text-[rgba(238,242,255,0.55)] transition-colors"
        >
          Cancel
        </button>
      )}

      {/* Dismiss button when in error state */}
      {isError && (
        <button
          onClick={onDismiss}
          className="text-[11px] text-[rgba(238,242,255,0.40)] hover:text-[rgba(238,242,255,0.60)] transition-colors"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
