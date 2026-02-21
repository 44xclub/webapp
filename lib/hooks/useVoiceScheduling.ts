'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  VoiceParseResponse,
  VoiceExecuteResponse,
  LLMAction,
} from '@/lib/voice/types'

export type VoiceState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'parsing'
  | 'confirming'
  | 'executing'
  | 'success'
  | 'error'

interface UseVoiceSchedulingReturn {
  state: VoiceState
  error: string | null
  /** The parsed proposal awaiting confirmation */
  proposal: VoiceParseResponse | null
  /** Start recording via browser MediaRecorder */
  startRecording: () => Promise<void>
  /** Stop recording and begin transcription + parsing */
  stopRecording: () => void
  /** Submit a text transcript directly (dev/testing) */
  parseTranscript: (transcript: string) => Promise<void>
  /** User confirms the proposed action */
  confirmAction: () => Promise<VoiceExecuteResponse | null>
  /** User cancels / dismisses */
  dismiss: () => void
}

export function useVoiceScheduling(
  onSuccess?: (result: VoiceExecuteResponse) => void
): UseVoiceSchedulingReturn {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<VoiceParseResponse | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
    setProposal(null)
    mediaRecorderRef.current = null
    audioChunksRef.current = []
  }, [])

  // ---- Parse a text transcript via the API ----
  const parseTranscript = useCallback(async (transcript: string) => {
    setState('parsing')
    setError(null)
    setProposal(null)

    try {
      const res = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Parse failed with status ${res.status}`)
      }

      const data: VoiceParseResponse = await res.json()

      setProposal(data)
      setState('confirming')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parse failed'
      setError(msg)
      setState('error')
    }
  }, [])

  // ---- Transcribe audio blob using OpenAI Whisper via browser ----
  const transcribeAndParse = useCallback(async (audioBlob: Blob) => {
    setState('transcribing')

    try {
      // Use the Web Speech API for transcription (simpler than sending audio to server)
      // Fall back to sending audio to a server-side endpoint if needed.
      // For v1, we use the SpeechRecognition API directly.
      // This function is called when we don't use SpeechRecognition.
      // For now, throw to indicate we need the text path.
      throw new Error('Audio transcription not yet implemented — use text input')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed'
      setError(msg)
      setState('error')
    }
  }, [parseTranscript])

  // ---- Start recording ----
  const startRecording = useCallback(async () => {
    setError(null)
    setProposal(null)

    // Use Web Speech API for real-time transcription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-GB'

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          parseTranscript(transcript)
        } else {
          setError('No speech detected')
          setState('error')
        }
      }

      recognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`)
        setState('error')
      }

      recognition.onend = () => {
        if (state === 'recording') {
          // Recognition ended naturally (silence timeout)
          setState('transcribing')
        }
      }

      mediaRecorderRef.current = recognition as unknown as MediaRecorder
      recognition.start()
      setState('recording')
      return
    }

    // Fallback: MediaRecorder for audio capture (would need server-side STT)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        transcribeAndParse(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setState('recording')
    } catch (err) {
      setError('Microphone access denied')
      setState('error')
    }
  }, [parseTranscript, transcribeAndParse, state])

  // ---- Stop recording ----
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    // Both SpeechRecognition and MediaRecorder have a stop() method
    try {
      (recorder as any).stop()
    } catch {
      // Ignore if already stopped
    }
  }, [])

  // ---- Confirm and execute ----
  const confirmAction = useCallback(async (): Promise<VoiceExecuteResponse | null> => {
    if (!proposal) return null

    setState('executing')
    setError(null)

    try {
      const res = await fetch('/api/voice/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_id: proposal.command_id,
          approved_action: proposal.proposed_action,
        }),
      })

      const data: VoiceExecuteResponse = await res.json()

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.result_summary || 'Execution failed')
      }

      setState('success')
      onSuccess?.(data)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed'
      setError(msg)
      setState('error')
      return null
    }
  }, [proposal, onSuccess])

  // ---- Dismiss ----
  const dismiss = useCallback(() => {
    // If there's an active recording, stop it
    stopRecording()
    reset()
  }, [stopRecording, reset])

  return {
    state,
    error,
    proposal,
    startRecording,
    stopRecording,
    parseTranscript,
    confirmAction,
    dismiss,
  }
}
