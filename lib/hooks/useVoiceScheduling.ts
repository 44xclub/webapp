'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  hasSpeechRecognitionAPI,
  hasGetUserMediaAPI,
  hasMediaRecorderAPI,
  shouldSkipGetUserMedia,
  isMobileDevice,
} from '@/lib/voice/diagnostics'
import type {
  VoiceParseResponse,
  VoiceExecuteResponse,
  LLMAction,
} from '@/lib/voice/types'

export type VoiceState =
  | 'idle'
  | 'recording'
  | 'capturing'     // OS file capture (file picker open)
  | 'text_input'
  | 'transcribing'
  | 'parsing'
  | 'confirming'
  | 'executing'
  | 'success'
  | 'error'

/** Which capture strategy was selected */
export type CaptureStrategy = 'speech_recognition' | 'media_recorder' | 'file_capture' | 'text_input' | 'none'

interface UseVoiceSchedulingReturn {
  state: VoiceState
  error: string | null
  /** The parsed proposal awaiting confirmation */
  proposal: VoiceParseResponse | null
  /** Which strategy was last selected (for diagnostics) */
  selectedStrategy: CaptureStrategy
  /** Start voice capture (tries strategies in order) */
  startRecording: () => Promise<void>
  /** Stop recording and begin transcription + parsing */
  stopRecording: () => void
  /** Submit a text transcript directly */
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
  const [selectedStrategy, setSelectedStrategy] = useState<CaptureStrategy>('none')

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

  // Refs for state tracking and cleanup
  const stateRef = useRef<VoiceState>('idle')
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const transcriptRef = useRef('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const setVoiceState = useCallback((newState: VoiceState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  const cleanupFileInput = useCallback(() => {
    if (fileInputRef.current) {
      if (document.body.contains(fileInputRef.current)) {
        document.body.removeChild(fileInputRef.current)
      }
      fileInputRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setVoiceState('idle')
    setError(null)
    setProposal(null)
    recognitionRef.current = null
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    transcriptRef.current = ''
    cleanupFileInput()
  }, [setVoiceState, cleanupFileInput])

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

  // ---- Transcribe audio blob via server (Whisper) ----
  const transcribeAndParse = useCallback(async (audioBlob: Blob) => {
    setVoiceState('transcribing')

    try {
      const headers = await getAuthHeaders()
      // Remove Content-Type — fetch sets it automatically for FormData
      delete headers['Content-Type']

      // Detect file extension from MIME type for Whisper compatibility
      const ext = mimeToExtension(audioBlob.type)
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${ext}`)

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const errorCode = body.code || 'TRANSCRIPTION_FAILED'
        throw new Error(body.error || `Transcription failed (${errorCode})`)
      }

      const { transcript } = await res.json()
      if (!transcript) {
        throw new Error('No speech detected — try again')
      }

      await parseTranscript(transcript)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed'
      setError(msg)
      setVoiceState('error')
    }
  }, [setVoiceState, parseTranscript, getAuthHeaders])

  // ---- Strategy 1: Web Speech API ----
  const startSpeechRecognition = useCallback(() => {
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-GB'

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
      if (event.error === 'no-speech') return
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
    setSelectedStrategy('speech_recognition')
    setVoiceState('recording')
  }, [parseTranscript, setVoiceState])

  // ---- Strategy 2: getUserMedia + MediaRecorder → Whisper ----
  const startMediaRecorder = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    })

    // Pick a supported MIME type at runtime
    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''
    const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {}

    const recorder = new MediaRecorder(stream, recorderOptions)
    audioChunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const actualType = mimeType || recorder.mimeType || 'audio/webm'
      const blob = new Blob(audioChunksRef.current, { type: actualType })
      transcribeAndParse(blob)
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    setSelectedStrategy('media_recorder')
    setVoiceState('recording')
  }, [transcribeAndParse, setVoiceState])

  // ---- Strategy 3: File capture via OS audio recorder ----
  // Uses <input type="file" accept="audio/*" capture> to invoke the OS recording UI.
  // This works in iOS WKWebView (Whop mobile) because it uses UIDocumentPicker,
  // not getUserMedia — no special WebView permissions needed.
  const startFileCapture = useCallback(() => {
    cleanupFileInput()

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.setAttribute('capture', '') // triggers OS recorder on mobile
    input.style.position = 'fixed'
    input.style.top = '-9999px'
    input.style.opacity = '0'

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      cleanupFileInput()

      if (file) {
        transcribeAndParse(file) // File extends Blob
      } else {
        setVoiceState('idle')
      }
    })

    // Detect cancel: when the picker closes, window regains focus.
    // We wait briefly to let the change event fire first if a file was selected.
    const handleFocus = () => {
      window.removeEventListener('focus', handleFocus)
      setTimeout(() => {
        if (stateRef.current === 'capturing') {
          cleanupFileInput()
          setVoiceState('idle')
        }
      }, 800)
    }
    window.addEventListener('focus', handleFocus)

    fileInputRef.current = input
    document.body.appendChild(input)
    input.click()

    setSelectedStrategy('file_capture')
    setVoiceState('capturing')
  }, [transcribeAndParse, setVoiceState, cleanupFileInput])

  // ---- Main entry point: try strategies in cascade ----
  const startRecording = useCallback(async () => {
    setError(null)
    setProposal(null)
    transcriptRef.current = ''

    // Strategy 1: Web Speech API (real-time transcription, no server needed)
    if (hasSpeechRecognitionAPI()) {
      startSpeechRecognition()
      return
    }

    // Check if getUserMedia is likely blocked (iframe Permissions Policy / mobile WebView).
    // This check is synchronous — if we decide to skip, we can still invoke file capture
    // in the same user-gesture call stack (required for input.click() on iOS).
    const skipGUM = shouldSkipGetUserMedia()

    // Strategy 2: getUserMedia + MediaRecorder → server-side Whisper
    if (!skipGUM && hasGetUserMediaAPI() && hasMediaRecorderAPI()) {
      try {
        await startMediaRecorder()
        return
      } catch {
        // getUserMedia failed (permission denied, unsupported, etc.)
        // We've awaited so the user gesture is lost — can't fall back to file capture.
        // Fall through to text input.
      }
    }

    // Strategy 3: File capture via OS audio recorder (mobile only).
    // This is reached synchronously when skipGUM is true (no await happened above).
    // Invokes the OS recording UI which doesn't require iframe mic permissions.
    if (isMobileDevice()) {
      startFileCapture()
      return
    }

    // Strategy 4: Text input (universal last resort)
    setSelectedStrategy('text_input')
    setVoiceState('text_input')
  }, [startSpeechRecognition, startMediaRecorder, startFileCapture, setVoiceState])

  // ---- Stop recording ----
  const stopRecording = useCallback(() => {
    // Stop SpeechRecognition — triggers onend which reads transcript and parses
    const recognition = recognitionRef.current
    if (recognition) {
      try { recognition.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }

    // Stop MediaRecorder — triggers onstop which sends to Whisper
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch { /* ignore */ }
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
    const recognition = recognitionRef.current
    if (recognition) {
      stateRef.current = 'idle'
      try { recognition.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch { /* ignore */ }
    }
    cleanupFileInput()
    reset()
  }, [reset, cleanupFileInput])

  return {
    state,
    error,
    proposal,
    selectedStrategy,
    startRecording,
    stopRecording,
    parseTranscript,
    confirmAction,
    dismiss,
  }
}

// ---- Utilities ----

/** Map MIME type to a file extension Whisper understands */
function mimeToExtension(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  if (mimeType.includes('aac')) return 'm4a'
  return 'webm' // default
}
