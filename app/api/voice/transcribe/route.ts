import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'

/** Max audio file size: 10MB (Whisper limit is 25MB) */
const MAX_AUDIO_SIZE = 10 * 1024 * 1024

/**
 * Map content-type to a file extension that Whisper accepts.
 * Whisper supports: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
 */
function whisperFilename(contentType: string, originalName: string): string {
  const ct = contentType.toLowerCase()
  if (ct.includes('mp4') || ct.includes('m4a')) return 'recording.mp4'
  if (ct.includes('aac')) return 'recording.m4a' // AAC → m4a container for Whisper
  if (ct.includes('wav')) return 'recording.wav'
  if (ct.includes('ogg') || ct.includes('oga')) return 'recording.ogg'
  if (ct.includes('mp3') || ct.includes('mpeg')) return 'recording.mp3'
  if (ct.includes('flac')) return 'recording.flac'
  if (ct.includes('webm')) return 'recording.webm'
  // Fall back to original filename or default webm
  if (originalName && /\.\w{2,4}$/.test(originalName)) return originalName
  return 'recording.webm'
}

/**
 * POST /api/voice/transcribe
 *
 * Accepts an audio blob (from MediaRecorder or file input capture) and
 * transcribes it using the OpenAI Whisper API. Returns the transcript text.
 *
 * Supports variable MIME types: audio/webm, audio/mp4, audio/m4a, audio/aac,
 * audio/wav, etc. — from both MediaRecorder and OS-level file capture.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await resolveUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_FAILED' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured', code: 'CONFIG_ERROR' }, { status: 500 })
    }

    // 2. Read audio from request body (multipart form data)
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'audio file is required', code: 'MISSING_AUDIO' }, { status: 400 })
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'Audio file too large (max 10MB)', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      )
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty', code: 'EMPTY_AUDIO' },
        { status: 400 }
      )
    }

    // Log incoming audio metadata for debugging
    const contentType = audioFile.type || 'unknown'
    const fileName = whisperFilename(contentType, audioFile.name)
    console.log(
      '[VoiceTranscribe] Incoming audio:',
      JSON.stringify({
        userId: user.id,
        contentType,
        originalName: audioFile.name,
        mappedName: fileName,
        size: audioFile.size,
      })
    )

    // 3. Send to OpenAI Whisper API
    const whisperForm = new FormData()
    whisperForm.append('file', audioFile, fileName)
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: whisperForm,
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(
        '[VoiceTranscribe] Whisper API error:',
        JSON.stringify({
          userId: user.id,
          status: response.status,
          body: body.slice(0, 500),
          contentType,
          fileName,
          fileSize: audioFile.size,
        })
      )
      return NextResponse.json(
        { error: `Transcription failed (${response.status})`, code: 'WHISPER_ERROR' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const transcript = data.text?.trim()

    if (!transcript) {
      console.log('[VoiceTranscribe] No speech detected:', { userId: user.id, contentType, fileSize: audioFile.size })
      return NextResponse.json(
        { error: 'No speech detected in audio', code: 'NO_SPEECH' },
        { status: 422 }
      )
    }

    console.log('[VoiceTranscribe] Success:', { userId: user.id, transcriptLength: transcript.length })
    return NextResponse.json({ transcript })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceTranscribe] Error:', message)
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
