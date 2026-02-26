'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, Check, ArrowLeft, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * External Voice Capture Page — Breakout Recording
 *
 * This page opens in the system browser (outside the Whop iframe) where
 * getUserMedia works normally. After recording, it uploads the audio to
 * /api/voice/upload which handles transcription + parsing. The embedded
 * app polls for the result via /api/voice/session-result.
 *
 * URL: /voice-capture?session_id=xxx
 */
export default function VoiceCapturePage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'init' | 'ready' | 'recording' | 'uploading' | 'done' | 'error'>('init')
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('session_id')
    if (!sid) {
      setError('Missing session_id parameter')
      setPhase('error')
      return
    }
    setSessionId(sid)

    // Extract return URL if provided
    const ret = params.get('return')
    if (ret) {
      try {
        setReturnUrl(decodeURIComponent(ret))
      } catch {
        // malformed return URL — ignore
      }
    }

    setPhase('ready')
  }, [])

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {}
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } catch { /* fall through */ }
    return headers
  }, [])

  // Select the best supported MIME type
  const selectMimeType = useCallback((): string => {
    if (typeof MediaRecorder === 'undefined') return ''
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
    ]
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) return mime
    }
    return ''
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      })
      streamRef.current = stream

      const mimeType = selectMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setPhase('recording')
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(`Microphone error: ${e.name} — ${e.message}`)
      setPhase('error')
    }
  }, [selectMimeType])

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    const stream = streamRef.current
    if (!recorder || !sessionId) return

    setPhase('uploading')

    // Wait for recorder to finish
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop())
        const actualType = recorder.mimeType || 'audio/webm'
        resolve(new Blob(chunksRef.current, { type: actualType }))
      }
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        stream?.getTracks().forEach((t) => t.stop())
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
    })

    if (blob.size === 0) {
      setError('No audio captured. Please try again.')
      setPhase('error')
      return
    }

    try {
      // Upload audio to /api/voice/upload — server handles transcription + parsing
      const headers = await getAuthHeaders()
      const formData = new FormData()
      const ext = blob.type.includes('mp4') ? 'recording.mp4'
        : blob.type.includes('aac') ? 'recording.aac'
        : 'recording.webm'
      formData.append('audio', blob, ext)
      formData.append('session_id', sessionId)

      const res = await fetch('/api/voice/upload', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Upload failed (${res.status})`)
      }

      const data = await res.json()
      setTranscript(data.transcript || null)
      setPhase('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      setPhase('error')
    }
  }, [sessionId, getAuthHeaders])

  const handleReturn = useCallback(() => {
    if (returnUrl) {
      // Append voice_session_id so the embedded app can pick it up
      try {
        const url = new URL(returnUrl)
        if (sessionId) url.searchParams.set('voice_session_id', sessionId)
        window.location.href = url.toString()
        return
      } catch {
        // malformed return URL — try window.close
      }
    }
    window.close()
  }, [returnUrl, sessionId])

  return (
    <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[20px] font-bold text-[#eef2ff]">44CLUB Voice</h1>
          <p className="text-[13px] text-[rgba(238,242,255,0.50)] mt-1">
            {phase === 'ready' && 'Tap to start recording your voice command'}
            {phase === 'recording' && 'Recording... tap to stop when done'}
            {phase === 'uploading' && 'Processing your recording...'}
            {phase === 'done' && 'Done! You can return to the app.'}
            {phase === 'error' && 'Something went wrong'}
            {phase === 'init' && 'Loading...'}
          </p>
        </div>

        {/* Main action button */}
        <div className="flex justify-center">
          {phase === 'ready' && (
            <button
              onClick={startRecording}
              className="h-20 w-20 rounded-full bg-[#3b82f6] flex items-center justify-center shadow-lg hover:bg-[#3b82f6]/90 transition-colors"
            >
              <Mic className="h-8 w-8 text-white" />
            </button>
          )}
          {phase === 'recording' && (
            <button
              onClick={stopRecording}
              className="relative h-20 w-20 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg scale-110 transition-transform"
            >
              <MicOff className="h-8 w-8 text-white" />
              <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-40" />
            </button>
          )}
          {phase === 'uploading' && (
            <div className="h-20 w-20 rounded-full bg-[rgba(255,255,255,0.08)] flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[rgba(238,242,255,0.70)] animate-spin" />
            </div>
          )}
          {phase === 'done' && (
            <div className="h-20 w-20 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center">
              <Check className="h-8 w-8 text-green-400" />
            </div>
          )}
        </div>

        {/* Transcript preview */}
        {transcript && (
          <div className="px-4 py-3 rounded-[12px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
            <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.40)] mb-1">Transcript</p>
            <p className="text-[14px] text-[#eef2ff]">{transcript}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-[12px] bg-[rgba(255,80,80,0.08)] border border-[rgba(255,80,80,0.15)]">
            <p className="text-[13px] text-[rgba(255,80,80,0.85)]">{error}</p>
          </div>
        )}

        {/* Return to app */}
        {phase === 'done' && (
          <div className="space-y-3">
            <p className="text-[12px] text-[rgba(238,242,255,0.40)]">
              Your voice command has been processed. Return to the app to confirm.
            </p>
            <button
              onClick={handleReturn}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-[10px] bg-[#3b82f6] text-[14px] font-medium text-white hover:bg-[#3b82f6]/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to 44CLUB
            </button>
          </div>
        )}

        {/* Error actions */}
        {phase === 'error' && (
          <div className="space-y-3">
            <button
              onClick={() => { setError(null); setPhase('ready') }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-[10px] bg-[rgba(255,255,255,0.06)] text-[14px] font-medium text-[#eef2ff] hover:bg-[rgba(255,255,255,0.10)] transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <button
              onClick={handleReturn}
              className="flex items-center justify-center gap-2 w-full py-2 text-[13px] text-[rgba(238,242,255,0.40)] hover:text-[rgba(238,242,255,0.60)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to 44CLUB
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
