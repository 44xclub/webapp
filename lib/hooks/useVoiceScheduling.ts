'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
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
    mediaRecorderRef.current = null
    audioChunksRef.current = []
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
      const msg = err instanceof Error ? err.message : 'Parse failed'
      setError(msg)
      setVoiceState('error')
    }
  }, [setVoiceState, getAuthHeaders])

  // ---- Transcribe audio blob (fallback path — not implemented in v1) ----
  const transcribeAndParse = useCallback(async (audioBlob: Blob) => {
    setVoiceState('transcribing')

    try {
      throw new Error('Audio transcription not yet implemented — use text input')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed'
      setError(msg)
      setVoiceState('error')
    }
  }, [setVoiceState, parseTranscript])

  // ---- Start recording ----
  const startRecording = useCallback(async () => {
    setError(null)
    setProposal(null)
    transcriptRef.current = ''

    // Use Web Speech API for real-time transcription
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
      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript
          }
        }
        transcriptRef.current = transcript
      }

      recognition.onerror = (event: any) => {
        // 'no-speech' is not fatal — user just hasn't spoken yet
        if (event.error === 'no-speech') return
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
      setVoiceState('recording')
    } catch (err) {
      setError('Microphone access denied')
      setVoiceState('error')
    }
  }, [parseTranscript, transcribeAndParse, setVoiceState])

  // ---- Stop recording ----
  const stopRecording = useCallback(() => {
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

    // Stop MediaRecorder (fallback path)
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        // Ignore if already stopped
      }
    }
  }, [])

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
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch { /* ignore */ }
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
