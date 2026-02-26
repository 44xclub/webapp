import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseTranscript, summarizeAction, determineMode } from '@/lib/voice/parse-transcript'
import { DEFAULT_TIMEZONE, MAX_TRANSCRIPT_LENGTH } from '@/lib/voice/config'

/** Max audio file size: 10MB */
const MAX_AUDIO_SIZE = 10 * 1024 * 1024

/**
 * Map content-type to a file extension that Whisper accepts.
 */
function whisperFilename(contentType: string, originalName: string): string {
  const ct = contentType.toLowerCase()
  if (ct.includes('mp4') || ct.includes('m4a')) return 'recording.mp4'
  if (ct.includes('aac')) return 'recording.m4a'
  if (ct.includes('wav')) return 'recording.wav'
  if (ct.includes('ogg') || ct.includes('oga')) return 'recording.ogg'
  if (ct.includes('mp3') || ct.includes('mpeg')) return 'recording.mp3'
  if (ct.includes('flac')) return 'recording.flac'
  if (ct.includes('webm')) return 'recording.webm'
  if (originalName && /\.\w{2,4}$/.test(originalName)) return originalName
  return 'recording.webm'
}

/**
 * POST /api/voice/upload
 *
 * Accepts an audio blob + session_id from the external /voice-capture page.
 * Pipeline: store audio → transcribe (Whisper) → parse (LLM) → save on session.
 *
 * Input: multipart form data with fields:
 *   - audio: File blob
 *   - session_id: string
 *
 * Returns: { status, transcript, proposed_action, summary_text, command_id }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await resolveUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    // 2. Parse form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const sessionId = formData.get('session_id') as string | null

    if (!audioFile) {
      return NextResponse.json({ error: 'audio file required' }, { status: 400 })
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Audio too large (max 10MB)' }, { status: 400 })
    }
    if (audioFile.size === 0) {
      return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 })
    }

    const db = createAdminClient()

    // 3. Verify session exists and belongs to user
    const { data: session, error: sessionError } = await db
      .from('voice_capture_sessions')
      .select('id, user_id, status, expires_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }
    if (new Date(session.expires_at) < new Date()) {
      await db.from('voice_capture_sessions').update({ status: 'expired' }).eq('id', sessionId)
      return NextResponse.json({ error: 'Session expired' }, { status: 410 })
    }

    // 4. Mark as uploaded
    await db.from('voice_capture_sessions').update({ status: 'uploaded' }).eq('id', sessionId)

    console.log('[VoiceUpload] Received audio:', {
      userId: user.id,
      sessionId,
      contentType: audioFile.type,
      size: audioFile.size,
    })

    // 5. Transcribe via Whisper
    const fileName = whisperFilename(audioFile.type || '', audioFile.name)
    const whisperForm = new FormData()
    whisperForm.append('file', audioFile, fileName)
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'en')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const body = await whisperRes.text()
      console.error('[VoiceUpload] Whisper error:', { sessionId, status: whisperRes.status, body: body.slice(0, 500) })
      await markFailed(db, sessionId, `Transcription failed (${whisperRes.status})`)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
    }

    const whisperData = await whisperRes.json()
    const transcript = whisperData.text?.trim()

    if (!transcript) {
      await markFailed(db, sessionId, 'No speech detected')
      return NextResponse.json({ error: 'No speech detected in audio' }, { status: 422 })
    }

    // 6. Update session with transcript
    await db.from('voice_capture_sessions')
      .update({ status: 'transcribed', transcript })
      .eq('id', sessionId)

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      await markFailed(db, sessionId, 'Transcript too long')
      return NextResponse.json({ error: 'Transcript exceeds maximum length' }, { status: 400 })
    }

    // 7. Parse transcript via LLM
    const { data: profile } = await db
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()

    const timezone = profile?.timezone || DEFAULT_TIMEZONE
    const nowISO = new Date().toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T')

    const { action, confidence, needs_clarification } = await parseTranscript(transcript, timezone, nowISO)
    const { mode, resolvedDatetime } = determineMode(action, nowISO)
    const summaryText = summarizeAction(action, action.intent === 'create_block' ? mode : null)

    // 8. Log to voice_commands_log
    const { data: logRow, error: logError } = await db
      .from('voice_commands_log')
      .insert({
        user_id: user.id,
        input_type: 'audio' as const,
        intent: action.intent,
        raw_transcript: transcript,
        proposed_action: action as unknown as Record<string, unknown>,
        confidence,
        needs_clarification,
        status: 'proposed',
      })
      .select('id')
      .single()

    if (logError) {
      console.error('[VoiceUpload] Failed to log command:', logError.message)
      await markFailed(db, sessionId, 'Failed to log voice command')
      return NextResponse.json({ error: 'Failed to log voice command' }, { status: 500 })
    }

    // 9. Store parse result on session
    const parseResult = {
      command_id: logRow.id,
      proposed_action: action,
      mode: action.intent === 'create_block' ? mode : null,
      resolved_datetime: resolvedDatetime,
      summary_text: summaryText,
      needs_clarification,
      confidence,
    }

    await db.from('voice_capture_sessions')
      .update({ status: 'parsed', parse_result: parseResult })
      .eq('id', sessionId)

    console.log('[VoiceUpload] Success:', { sessionId, commandId: logRow.id, intent: action.intent })

    return NextResponse.json({
      status: 'parsed',
      transcript,
      ...parseResult,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceUpload] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markFailed(db: any, sessionId: string, errorMessage: string) {
  try {
    await db.from('voice_capture_sessions')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', sessionId)
  } catch { /* best effort */ }
}
