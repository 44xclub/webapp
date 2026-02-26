'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, Check, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * External Voice Capture Page — Strategy B (Breakout Recording)
 *
 * This page opens in the system browser (outside the Whop iframe) where
 * getUserMedia works normally. After recording, it transcribes the audio
 * and stores the result in the voice_capture_sessions table. The embedded
 * app polls for the result.
 *
 * URL: /voice-capture?session_id=xxx
 */
export default function VoiceCapturePage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'init' | 'ready' | 'recording' | 'uploading' | 'done' | 'error'>('init')
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
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

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      })
      streamRef.current = stream

      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

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
  }, [])

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
      // 1. Transcribe
      const headers = await getAuthHeaders()
      const formData = new FormData()
      const ext = blob.type.includes('mp4') ? 'recording.mp4' : 'recording.webm'
      formData.append('audio', blob, ext)

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!transcribeRes.ok) {
        const body = await transcribeRes.json().catch(() => ({}))
        throw new Error(body.error || `Transcription failed (${transcribeRes.status})`)
      }

      const { transcript: text } = await transcribeRes.json()
      if (!text) throw new Error('No speech detected in recording')

      // 2. Store transcript in session
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('voice_capture_sessions')
        .update({ status: 'completed', transcript: text })
        .eq('id', sessionId)

      if (updateError) {
        throw new Error('Failed to save transcript')
      }

      setTranscript(text)
      setPhase('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)

      // Mark session as failed
      try {
        const supabase = createClient()
        await supabase
          .from('voice_capture_sessions')
          .update({ status: 'failed', error_message: msg })
          .eq('id', sessionId)
      } catch { /* best effort */ }

      setPhase('error')
    }
  }, [sessionId, getAuthHeaders])

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
              className="h-20 w-20 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg scale-110 transition-transform"
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
        {(phase === 'done' || phase === 'error') && (
          <div className="space-y-3">
            <p className="text-[12px] text-[rgba(238,242,255,0.40)]">
              {phase === 'done'
                ? 'Your voice command has been saved. Return to the app to continue.'
                : 'You can close this page and try again from the app.'}
            </p>
            <button
              onClick={() => window.close()}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-[10px] bg-[rgba(255,255,255,0.06)] text-[14px] font-medium text-[#eef2ff] hover:bg-[rgba(255,255,255,0.10)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to 44CLUB
            </button>
          </div>
        )}

        {/* Retry */}
        {phase === 'error' && (
          <button
            onClick={() => { setError(null); setPhase('ready') }}
            className="text-[13px] text-[#3b82f6] hover:text-[#3b82f6]/80 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
