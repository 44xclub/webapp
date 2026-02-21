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

  // Ref to track state without stale closures in SpeechRecognition callbacks
  const stateRef = useRef<VoiceState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<any>(null)
  const audioChunksRef = useRef<Blob[]>([])
  // Track whether onresult already fired (so onend knows if it needs to handle no-speech)
  const gotResultRef = useRef(false)

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
    gotResultRef.current = false
  }, [setVoiceState])

  // ---- Parse a text transcript via the API ----
  const parseTranscript = useCallback(async (transcript: string) => {
    setVoiceState('parsing')
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
      setVoiceState('confirming')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parse failed'
      setError(msg)
      setVoiceState('error')
    }
  }, [setVoiceState])

  // ---- Transcribe audio blob using OpenAI Whisper via browser ----
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
    gotResultRef.current = false

    // Use Web Speech API for real-time transcription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-GB'

      recognition.onresult = (event: any) => {
        // Collect all final results into one transcript
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript
          }
        }
        if (transcript) {
          gotResultRef.current = true
          parseTranscript(transcript)
        }
      }

      recognition.onerror = (event: any) => {
        // 'no-speech' is not a fatal error — user just hasn't spoken yet
        if (event.error === 'no-speech') return
        setError(`Speech recognition error: ${event.error}`)
        setVoiceState('error')
      }

      recognition.onend = () => {
        // Only handle if we're still in 'recording' state and no result was captured
        if (stateRef.current === 'recording' && !gotResultRef.current) {
          setError('No speech detected — tap the mic and try again')
          setVoiceState('error')
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
    // Stop SpeechRecognition
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

      setVoiceState('success')
      onSuccess?.(data)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed'
      setError(msg)
      setVoiceState('error')
      return null
    }
  }, [proposal, onSuccess, setVoiceState])

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
