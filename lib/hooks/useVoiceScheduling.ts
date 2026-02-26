'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  VoiceParseResponse,
  VoiceExecuteResponse,
  LLMAction,
} from '@/lib/voice/types'
import {
  startMediaRecorder,
  triggerFileCapture,
  captureErrorMessage,
  shouldFallbackToFileCapture,
  type MediaRecorderHandle,
  type VoiceCaptureError,
  type CaptureResult,
} from '@/lib/voice/capture'
import { logVoiceDiagnosticError } from '@/components/blocks/voice/VoiceDebugOverlay'

export type VoiceState =
  | 'idle'
  | 'recording'
  | 'text_input'
  | 'transcribing'
  | 'parsing'
  | 'confirming'
  | 'executing'
  | 'success'
  | 'error'
  // New states for file capture fallback
  | 'file_capture'

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

  const supabase = useMemo(() => createClient(), [])

  // Get the current Supabase access token to send in API headers.
  // Cookie-based auth fails inside the Whop iframe (third-party cookie blocking),
  // so we explicitly pass the token from the client-side session.
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } catch {
      // Fall through — the API route will attempt cookie auth as fallback
    }
    return headers
  }, [supabase])

  // Ref to track state without stale closures in SpeechRecognition callbacks
  const stateRef = useRef<VoiceState>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const mediaRecorderHandleRef = useRef<MediaRecorderHandle | null>(null)
  // Accumulates transcript across multiple onresult events (continuous mode)
  const transcriptRef = useRef('')

  const setVoiceState = useCallback((newState: VoiceState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  const reset = useCallback(() => {
    setVoiceState('idle')
    setError(null)
    setProposal(null)
    recognitionRef.current = null
    mediaRecorderHandleRef.current = null
    transcriptRef.current = ''
  }, [setVoiceState])

  // ---- Parse a text transcript via the API ----
  const parseTranscript = useCallback(async (transcript: string) => {
    setVoiceState('parsing')
    setError(null)
    setProposal(null)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/voice/parse', {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcript }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Parse failed with status ${res.status}`)
      }

      const data: VoiceParseResponse = await res.json()

      setProposal(data)
      setVoiceState('confirming')
    } catch (err) {
      logVoiceDiagnosticError('parseTranscript', err)
      const msg = err instanceof Error ? err.message : 'Parse failed'
      setError(msg)
      setVoiceState('error')
    }
  }, [setVoiceState, getAuthHeaders])

  // ---- Transcribe audio blob via server (Whisper) ----
  const transcribeAndParse = useCallback(async (result: CaptureResult) => {
    setVoiceState('transcribing')

    try {
      // Send audio to our server-side Whisper transcription endpoint
      const headers = await getAuthHeaders()
      // Remove Content-Type — fetch sets it automatically for FormData
      delete headers['Content-Type']

      // Determine file extension from MIME type for the server
      const ext = result.mimeType.includes('mp4') || result.mimeType.includes('m4a')
        ? 'recording.mp4'
        : result.mimeType.includes('aac')
          ? 'recording.aac'
          : result.mimeType.includes('wav')
            ? 'recording.wav'
            : 'recording.webm'

      const formData = new FormData()
      formData.append('audio', result.blob, ext)

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Transcription failed (${res.status})`)
      }

      const { transcript } = await res.json()
      if (!transcript) {
        throw new Error('No speech detected — try again')
      }

      // Now parse the transcript through the LLM
      await parseTranscript(transcript)
    } catch (err) {
      logVoiceDiagnosticError('transcribeAndParse', err)
      const msg = err instanceof Error ? err.message : 'Transcription failed'
      setError(msg)
      setVoiceState('error')
    }
  }, [setVoiceState, parseTranscript, getAuthHeaders])

  // ---- Fallback: trigger file input capture (Strategy 2) ----
  const attemptFileCapture = useCallback(async (policyError?: VoiceCaptureError) => {
    // Show a brief message explaining the fallback
    if (policyError) {
      setError(captureErrorMessage(policyError))
    }
    setVoiceState('file_capture')

    try {
      const result = await triggerFileCapture()
      // User recorded audio via OS UI — transcribe it
      setError(null)
      await transcribeAndParse(result)
    } catch (err) {
      logVoiceDiagnosticError('fileCapture', err)
      const captureErr = err as VoiceCaptureError
      if (captureErr.code === 'no_audio_data' && captureErr.errorName === 'UserCancelled') {
        // User cancelled the OS recording — just go back to idle
        reset()
      } else {
        // File capture also failed — fall back to text input
        setVoiceState('text_input')
      }
    }
  }, [transcribeAndParse, setVoiceState, reset])

  // ---- Start recording ----
  const startRecording = useCallback(async () => {
    setError(null)
    setProposal(null)
    transcriptRef.current = ''

    // Strategy 0: Web Speech API for real-time transcription (desktop browsers)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-GB'

      // Accumulate transcript — do NOT call parseTranscript here.
      // With continuous=true, onresult fires for each finalized segment
      // while the user is still speaking. We only parse once the user
      // clicks stop (which triggers onend).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript
          }
        }
        transcriptRef.current = transcript
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        // 'no-speech' is not fatal — user just hasn't spoken yet
        if (event.error === 'no-speech') return
        logVoiceDiagnosticError('speechRecognition', new Error(event.error))
        setError(`Speech recognition error: ${event.error}`)
        setVoiceState('error')
      }

      // onend fires after recognition.stop() is called, or on unexpected end.
      // This is the single place we read the accumulated transcript and parse.
      recognition.onend = () => {
        if (stateRef.current === 'recording') {
          const transcript = transcriptRef.current.trim()
          if (transcript) {
            parseTranscript(transcript)
          } else {
            setError('No speech detected — tap the mic and try again')
            setVoiceState('error')
          }
        }
      }

      recognitionRef.current = recognition
      recognition.start()
      setVoiceState('recording')
      return
    }

    // Strategy 1: getUserMedia + MediaRecorder (WebViews without SpeechRecognition)
    // Called synchronously in the click handler to preserve user gesture context.
    try {
      const handle = await startMediaRecorder()
      mediaRecorderHandleRef.current = handle
      setVoiceState('recording')
    } catch (err) {
      // err is a VoiceCaptureError from the capture module
      const captureErr = err as VoiceCaptureError
      logVoiceDiagnosticError('getUserMedia', err)

      // Strategy 2: If mic is blocked (Permissions Policy / WebView), try file capture
      if (shouldFallbackToFileCapture(captureErr)) {
        await attemptFileCapture(captureErr)
      } else {
        // Unexpected error — fall back to text input
        setError(captureErrorMessage(captureErr))
        setVoiceState('text_input')
      }
    }
  }, [parseTranscript, setVoiceState, attemptFileCapture])

  // ---- Stop recording ----
  const stopRecording = useCallback(async () => {
    // Stop SpeechRecognition — this triggers onend which reads
    // the accumulated transcript and calls parseTranscript
    const recognition = recognitionRef.current
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        // Ignore if already stopped
      }
      recognitionRef.current = null
    }

    // Stop MediaRecorder (Strategy 1 path)
    const handle = mediaRecorderHandleRef.current
    if (handle) {
      mediaRecorderHandleRef.current = null
      try {
        const result = await handle.stop()
        await transcribeAndParse(result)
      } catch (err) {
        logVoiceDiagnosticError('mediaRecorderStop', err)
        const captureErr = err as VoiceCaptureError
        setError(captureErrorMessage(captureErr))
        setVoiceState('error')
      }
    }
  }, [transcribeAndParse, setVoiceState])

  // ---- Confirm and execute ----
  const confirmAction = useCallback(async (): Promise<VoiceExecuteResponse | null> => {
    if (!proposal) return null

    setVoiceState('executing')
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/voice/execute', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          command_id: proposal.command_id,
          approved_action: proposal.proposed_action,
          mode: proposal.mode,
          resolved_datetime: proposal.resolved_datetime,
        }),
      })

      const data: VoiceExecuteResponse = await res.json()

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.result_summary || 'Execution failed')
      }

      setVoiceState('success')
      onSuccess?.(data)
      return data
    } catch (err) {
      logVoiceDiagnosticError('execute', err)
      const msg = err instanceof Error ? err.message : 'Execution failed'
      setError(msg)
      setVoiceState('error')
      return null
    }
  }, [proposal, onSuccess, setVoiceState, getAuthHeaders])

  // ---- Dismiss ----
  const dismiss = useCallback(() => {
    // If there's an active recording, stop it first
    const recognition = recognitionRef.current
    if (recognition) {
      // We're dismissing, not submitting — clear transcript so onend
      // doesn't try to parse it after we reset.
      stateRef.current = 'idle'
      try { recognition.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    const handle = mediaRecorderHandleRef.current
    if (handle) {
      handle.abort()
      mediaRecorderHandleRef.current = null
    }
    reset()
  }, [reset])

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
