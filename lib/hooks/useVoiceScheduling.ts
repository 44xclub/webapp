'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  VoiceParseResponse,
  VoiceExecuteResponse,
} from '@/lib/voice/types'
import {
  startMediaRecorder,
  captureErrorMessage,
  type MediaRecorderHandle,
  type VoiceCaptureError,
  type CaptureResult,
} from '@/lib/voice/capture'
import {
  detectInlineBlocked,
  createBreakoutSession,
  pollSessionResult,
  persistSessionId,
  clearPersistedSession,
  checkBreakoutReturn,
  type SessionPollResult,
} from '@/lib/voice/service'
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
  | 'breakout'

interface UseVoiceSchedulingReturn {
  state: VoiceState
  error: string | null
  /** The parsed proposal awaiting confirmation */
  proposal: VoiceParseResponse | null
  /** Start recording via browser MediaRecorder or trigger breakout */
  startRecording: () => void
  /** Stop recording and begin transcription + parsing */
  stopRecording: () => void
  /** Submit a text transcript directly (dev/testing) */
  parseTranscript: (transcript: string) => Promise<void>
  /** User confirms the proposed action */
  confirmAction: () => Promise<VoiceExecuteResponse | null>
  /** User cancels / dismisses */
  dismiss: () => void
  /** Manual re-check for breakout session result ("I'm back" button) */
  checkBreakoutResult: () => void
}

export function useVoiceScheduling(
  onSuccess?: (result: VoiceExecuteResponse) => void
): UseVoiceSchedulingReturn {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<VoiceParseResponse | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Ref to track state without stale closures
  const stateRef = useRef<VoiceState>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const mediaRecorderHandleRef = useRef<MediaRecorderHandle | null>(null)
  const transcriptRef = useRef('')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeSessionRef = useRef<string | null>(null)

  const setVoiceState = useCallback((newState: VoiceState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setVoiceState('idle')
    setError(null)
    setProposal(null)
    recognitionRef.current = null
    mediaRecorderHandleRef.current = null
    transcriptRef.current = ''
    stopPolling()
    activeSessionRef.current = null
  }, [setVoiceState, stopPolling])

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } catch {
      // Fall through — API route will attempt cookie auth
    }
    return headers
  }, [supabase])

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
      const headers = await getAuthHeaders()
      delete headers['Content-Type']

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

      await parseTranscript(transcript)
    } catch (err) {
      logVoiceDiagnosticError('transcribeAndParse', err)
      const msg = err instanceof Error ? err.message : 'Transcription failed'
      setError(msg)
      setVoiceState('error')
    }
  }, [setVoiceState, parseTranscript, getAuthHeaders])

  // ---- Apply parsed session result to state (used by breakout resume) ----
  const applySessionResult = useCallback((data: SessionPollResult) => {
    if (data.status === 'parsed' && data.proposed_action) {
      clearPersistedSession()
      setError(null)
      setProposal({
        command_id: data.command_id || '',
        proposed_action: data.proposed_action as VoiceParseResponse['proposed_action'],
        mode: (data.mode as VoiceParseResponse['mode']) || null,
        resolved_datetime: (data.resolved_datetime as string) || null,
        summary_text: (data.summary_text as string) || '',
        needs_clarification: data.needs_clarification || [],
        confidence: data.confidence || 0,
      })
      setVoiceState('confirming')
    } else if (data.status === 'failed') {
      clearPersistedSession()
      setError(data.error_message || 'External recording failed')
      setVoiceState('error')
    } else if (data.status === 'expired') {
      clearPersistedSession()
      setError('Capture session expired')
      setVoiceState('error')
    }
    // 'created', 'uploaded', 'transcribed' → still processing, keep polling
  }, [setVoiceState])

  // ---- Start polling for breakout session result ----
  const startSessionPolling = useCallback((sessionId: string) => {
    stopPolling()
    activeSessionRef.current = sessionId
    let attempts = 0
    const maxAttempts = 120 // 10 min at 5s intervals

    pollIntervalRef.current = setInterval(async () => {
      attempts++
      if (attempts > maxAttempts) {
        stopPolling()
        clearPersistedSession()
        setError('Capture session timed out')
        setVoiceState('error')
        return
      }

      try {
        const headers = await getAuthHeaders()
        const data = await pollSessionResult(sessionId, headers)

        if (data.status === 'parsed' || data.status === 'failed' || data.status === 'expired') {
          stopPolling()
          applySessionResult(data)
        }
      } catch {
        // Network error → continue polling
      }
    }, 5000)
  }, [stopPolling, getAuthHeaders, setVoiceState, applySessionResult])

  // ---- Breakout flow: create session + open external recorder ----
  const startBreakoutFlow = useCallback(async (message: string) => {
    setVoiceState('breakout')
    setError(message)

    try {
      const headers = await getAuthHeaders()
      const session = await createBreakoutSession(headers)
      persistSessionId(session.session_id)

      // Open in system browser
      window.open(session.capture_url, '_blank')

      // Start polling for result
      startSessionPolling(session.session_id)
    } catch (err) {
      logVoiceDiagnosticError('breakoutCapture', err)
      const msg = err instanceof Error ? err.message : 'Failed to start external capture'
      setError(msg)
      // Last resort — text input
      setVoiceState('text_input')
    }
  }, [getAuthHeaders, setVoiceState, startSessionPolling])

  // ---- Manual "I'm back" check ----
  const checkBreakoutResult = useCallback(async () => {
    const sessionId = activeSessionRef.current
    if (!sessionId) return

    try {
      const headers = await getAuthHeaders()
      const data = await pollSessionResult(sessionId, headers)

      if (data.status === 'parsed' || data.status === 'failed' || data.status === 'expired') {
        stopPolling()
        applySessionResult(data)
      }
    } catch {
      // Network error — polling continues
    }
  }, [getAuthHeaders, stopPolling, applySessionResult])

  // ---- Check for returning from breakout capture on mount ----
  useEffect(() => {
    const sessionId = checkBreakoutReturn()
    if (!sessionId) return

    const checkResult = async () => {
      setVoiceState('transcribing')
      try {
        const headers = await getAuthHeaders()
        const data = await pollSessionResult(sessionId, headers)

        if (data.status === 'parsed') {
          applySessionResult(data)
        } else if (data.status === 'failed' || data.status === 'expired') {
          applySessionResult(data)
        } else {
          // Still processing — enter breakout state and poll
          setError('Waiting for recording to finish processing...')
          setVoiceState('breakout')
          activeSessionRef.current = sessionId
          startSessionPolling(sessionId)
        }
      } catch (err) {
        logVoiceDiagnosticError('sessionReturn', err)
        const msg = err instanceof Error ? err.message : 'Failed to load capture result'
        setError(msg)
        setVoiceState('error')
      }
    }

    checkResult()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Start recording ----
  // IMPORTANT: This must remain synchronous at the top level.
  // On mobile, getUserMedia must be in the synchronous user gesture call stack.
  const startRecording = useCallback(() => {
    setError(null)
    setProposal(null)
    transcriptRef.current = ''

    // ============================================================
    // FAST PATH: If pre-detection says mic is blocked, go straight
    // to breakout flow. No getUserMedia attempt.
    // ============================================================
    const preBlock = detectInlineBlocked()
    if (preBlock) {
      startBreakoutFlow(
        "Whop's embedded view doesn't support microphone access. Opening external recorder..."
      )
      return
    }

    // Strategy 0: Web Speech API for real-time transcription (desktop browsers)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-GB'

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
        if (event.error === 'no-speech') return
        logVoiceDiagnosticError('speechRecognition', new Error(event.error))
        setError(`Speech recognition error: ${event.error}`)
        setVoiceState('error')
      }

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

    // Strategy 1: getUserMedia + MediaRecorder with instant-rejection detection
    const tryMediaRecorder = async () => {
      const start = performance.now()
      try {
        const handle = await startMediaRecorder()
        mediaRecorderHandleRef.current = handle
        setVoiceState('recording')
      } catch (err) {
        const duration = performance.now() - start
        const captureErr = err as VoiceCaptureError
        logVoiceDiagnosticError('getUserMedia', err)

        // Instant rejection (<100ms) or policy block → breakout (NOT "try again")
        const isInstantReject = duration < 100 && (
          captureErr.code === 'permission_denied' || captureErr.code === 'blocked_by_policy'
        )
        const isPolicyBlock = captureErr.code === 'blocked_by_policy' ||
          captureErr.code === 'not_supported' ||
          captureErr.code === 'insecure_context'

        if (isInstantReject || isPolicyBlock) {
          startBreakoutFlow(
            "Whop's embedded view doesn't support microphone access. Opening external recorder..."
          )
        } else if (captureErr.code === 'permission_denied') {
          // User explicitly denied after seeing prompt (>100ms) — show error
          setError(captureErrorMessage(captureErr))
          setVoiceState('error')
        } else {
          setError(captureErrorMessage(captureErr))
          setVoiceState('error')
        }
      }
    }

    tryMediaRecorder()
  }, [parseTranscript, setVoiceState, startBreakoutFlow])

  // ---- Stop recording ----
  const stopRecording = useCallback(async () => {
    const recognition = recognitionRef.current
    if (recognition) {
      try { recognition.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }

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

      clearPersistedSession()
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
    const recognition = recognitionRef.current
    if (recognition) {
      stateRef.current = 'idle'
      try { recognition.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    const handle = mediaRecorderHandleRef.current
    if (handle) {
      handle.abort()
      mediaRecorderHandleRef.current = null
    }
    clearPersistedSession()
    reset()
  }, [reset])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  return {
    state,
    error,
    proposal,
    startRecording,
    stopRecording,
    parseTranscript,
    confirmAction,
    dismiss,
    checkBreakoutResult,
  }
}
