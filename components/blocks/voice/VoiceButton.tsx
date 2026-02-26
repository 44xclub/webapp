'use client'

import { useCallback } from 'react'
import { Mic, MicOff, Loader2, FileAudio } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VoiceState } from '@/lib/hooks/useVoiceScheduling'

interface VoiceButtonProps {
  state: VoiceState
  onStartRecording: () => void
  onStopRecording: () => void
  onDismiss: () => void
}

const stateLabels: Record<VoiceState, string> = {
  idle: 'Tap to speak',
  recording: 'Listening...',
  text_input: '',
  file_capture: 'Recording via OS...',
  transcribing: 'Transcribing...',
  parsing: 'Processing...',
  confirming: '',
  executing: 'Scheduling...',
  success: 'Done!',
  error: 'Try again',
}

export function VoiceButton({
  state,
  onStartRecording,
  onStopRecording,
  onDismiss,
}: VoiceButtonProps) {
  const isActive = state === 'recording'
  const isProcessing = state === 'transcribing' || state === 'parsing' || state === 'executing'
  const isError = state === 'error'
  const isFileCapture = state === 'file_capture'

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
      {/* Status label */}
      {state !== 'idle' && stateLabels[state] && (
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-wider max-w-[140px] text-center leading-tight',
          isFileCapture
            ? 'text-[rgba(251,191,36,0.75)]'
            : 'text-[rgba(238,242,255,0.52)]',
        )}>
          {stateLabels[state]}
        </span>
      )}

      {/* Main mic button */}
      <button
        onClick={handleClick}
        disabled={isProcessing || isFileCapture}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-200',
          'h-14 w-14 shadow-lg',
          isActive
            ? 'bg-red-500/90 scale-110'
            : isProcessing
              ? 'bg-[rgba(255,255,255,0.08)] cursor-wait'
              : isFileCapture
                ? 'bg-[rgba(251,191,36,0.12)] border border-amber-500/30 cursor-wait'
                : isError
                  ? 'bg-[rgba(255,80,80,0.15)] border border-red-500/30'
                  : 'bg-[#3b82f6] hover:bg-[#3b82f6]/90',
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.70)]" />
        ) : isFileCapture ? (
          <FileAudio className="h-6 w-6 text-amber-400 animate-pulse" />
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
