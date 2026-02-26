'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  VoiceParseResponse,
  VoiceExecuteResponse,
} from '@/lib/voice/types'
import {
  startMediaRecorder,
  triggerFileCapture,
  captureErrorMessage,
  shouldFallbackToFileCapture,
  shouldUseFileCaptureOnly,
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
  | 'file_capture'
  | 'breakout'       // Waiting for external capture page to complete

interface UseVoiceSchedulingReturn {
  state: VoiceState
  error: string | null
  /** The parsed proposal awaiting confirmation */
  proposal: VoiceParseResponse | null
  /** Start recording via browser MediaRecorder */
  startRecording: () => void
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

  // --- Pre-detect: should we go straight to file capture? ---
  // This runs once on mount. The result is read synchronously in the
  // tap handler so we never lose user gesture context.
  const fileCaptureOnlyRef = useRef(false)
  useEffect(() => {
    fileCaptureOnlyRef.current = shouldUseFileCaptureOnly()
  }, [])

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
  // Breakout session polling
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  }, [setVoiceState, stopPolling])

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

  // ---- Strategy B: Breakout recording via external page ----
  const startBreakoutCapture = useCallback(async () => {
    setVoiceState('breakout')
    setError('Voice recording not supported in this embedded view. Opening external recorder...')

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/voice/capture-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ return_url: window.location.href }),
      })

      if (!res.ok) {
        throw new Error('Failed to create capture session')
      }

      const { session_id, capture_url } = await res.json()

      // Open in new tab / system browser
      window.open(capture_url, '_blank')

      // Poll for result
      let attempts = 0
      const maxAttempts = 120 // 10 minutes at 5-second intervals
      pollIntervalRef.current = setInterval(async () => {
        attempts++
        if (attempts > maxAttempts) {
          stopPolling()
          setError('Capture session timed out')
          setVoiceState('error')
          return
        }

        try {
          const pollHeaders = await getAuthHeaders()
          const pollRes = await fetch(`/api/voice/session-result?session_id=${session_id}`, {
            headers: pollHeaders,
          })

          if (!pollRes.ok) return // Retry next interval

          const data = await pollRes.json()

          if (data.status === 'completed' && data.transcript) {
            stopPolling()
            setError(null)
            await parseTranscript(data.transcript)
          } else if (data.status === 'failed' || data.status === 'expired') {
            stopPolling()
            setError(data.status === 'expired' ? 'Capture session expired' : 'External recording failed')
            setVoiceState('error')
          }
          // If still 'pending', continue polling
        } catch {
          // Network error — continue polling
        }
      }, 5000)
    } catch (err) {
      logVoiceDiagnosticError('breakoutCapture', err)
      const msg = err instanceof Error ? err.message : 'Failed to start external capture'
      setError(msg)
      // Last resort — text input
      setVoiceState('text_input')
    }
  }, [getAuthHeaders, parseTranscript, setVoiceState, stopPolling])

  // ---- Handle file capture result (async, called after input.click()) ----
  const handleFileCaptureResult = useCallback(async (fileCapturePromise: Promise<CaptureResult>) => {
    try {
      const result = await fileCapturePromise
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
        // File capture also failed — escalate to breakout (Strategy B)
        await startBreakoutCapture()
      }
    }
  }, [transcribeAndParse, reset, startBreakoutCapture])

  // ---- Check for returning from breakout capture on mount ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('voice_session_id')
    if (!sessionId) return

    // Remove the param from URL to prevent re-triggering
    const url = new URL(window.location.href)
    url.searchParams.delete('voice_session_id')
    window.history.replaceState({}, '', url.toString())

    // Poll for the session result
    const checkResult = async () => {
      setVoiceState('transcribing')
      try {
        const headers = await getAuthHeaders()
        const res = await fetch(`/api/voice/session-result?session_id=${sessionId}`, {
          headers,
        })
        if (!res.ok) throw new Error('Failed to fetch session result')
        const data = await res.json()

        if (data.status === 'completed' && data.transcript) {
          await parseTranscript(data.transcript)
        } else if (data.status === 'pending') {
          // Session not complete yet — set up polling
          setError('Waiting for external recording to complete...')
          setVoiceState('breakout')
        } else {
          throw new Error('External capture session failed or expired')
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
  // IMPORTANT: This must remain synchronous at the top level for file capture.
  // On mobile, input.click() must be in the synchronous user gesture call stack.
  // Any `await` before input.click() will cause mobile browsers to silently
  // ignore the click (gesture context consumed by the microtask).
  const startRecording = useCallback(() => {
    setError(null)
    setProposal(null)
    transcriptRef.current = ''

    // ============================================================
    // FAST PATH: If pre-detection says mic is blocked, go straight
    // to file capture SYNCHRONOUSLY — no getUserMedia attempt.
    // This is the critical fix for Whop mobile.
    // ============================================================
    if (fileCaptureOnlyRef.current) {
      setVoiceState('file_capture')
      // triggerFileCapture() calls input.click() synchronously here,
      // within the user gesture call stack. The returned Promise is
      // awaited asynchronously after the click has fired.
      const capturePromise = triggerFileCapture()
      handleFileCaptureResult(capturePromise)
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

    // Strategy 1: getUserMedia + MediaRecorder (WebViews without SpeechRecognition
    // but where mic IS available — e.g. desktop Whop embed)
    const tryMediaRecorder = async () => {
      try {
        const handle = await startMediaRecorder()
        mediaRecorderHandleRef.current = handle
        setVoiceState('recording')
      } catch (err) {
        const captureErr = err as VoiceCaptureError
        logVoiceDiagnosticError('getUserMedia', err)

        if (shouldFallbackToFileCapture(captureErr)) {
          setError(captureErrorMessage(captureErr))
          setVoiceState('file_capture')
          const capturePromise = triggerFileCapture()
          handleFileCaptureResult(capturePromise)
        } else {
          setError(captureErrorMessage(captureErr))
          setVoiceState('text_input')
        }
      }
    }

    tryMediaRecorder()
  }, [parseTranscript, setVoiceState, handleFileCaptureResult])

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
  }
}
