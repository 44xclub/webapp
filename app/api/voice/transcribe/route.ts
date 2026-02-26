import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'

/** Max audio file size: 10MB (Whisper limit is 25MB) */
const MAX_AUDIO_SIZE = 10 * 1024 * 1024

/** Whisper-supported file extensions mapped from MIME types */
const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'm4a',
  'audio/3gpp': 'mp3',
  'audio/3gpp2': 'mp3',
  'audio/amr': 'mp3',
  'video/mp4': 'm4a', // iOS sometimes reports video/mp4 for audio-only recordings
}

/** Structured error codes for the frontend */
type ErrorCode =
  | 'UNAUTHORIZED'
  | 'CONFIG_ERROR'
  | 'MISSING_AUDIO'
  | 'FILE_TOO_LARGE'
  | 'WHISPER_API_ERROR'
  | 'NO_SPEECH'
  | 'SERVER_ERROR'

function errorResponse(error: string, code: ErrorCode, status: number) {
  return NextResponse.json({ error, code }, { status })
}

/**
 * POST /api/voice/transcribe
 *
 * Accepts an audio blob (from MediaRecorder or file capture) and transcribes it
 * using the OpenAI Whisper API. Returns the transcript text.
 *
 * Supports audio from:
 * - MediaRecorder (audio/webm, audio/mp4)
 * - iOS file capture (audio/m4a, audio/mp4, video/mp4)
 * - Android file capture (audio/3gpp, audio/ogg, audio/amr)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await resolveUser(request)
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[VoiceTranscribe] OPENAI_API_KEY not configured')
      return errorResponse('Server configuration error', 'CONFIG_ERROR', 500)
    }

    // 2. Read audio from request body (multipart form data)
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return errorResponse('Audio file is required', 'MISSING_AUDIO', 400)
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return errorResponse('Audio file too large (max 10MB)', 'FILE_TOO_LARGE', 400)
    }

    // 3. Determine file extension for Whisper
    const contentType = audioFile.type || 'audio/webm'
    const ext = MIME_TO_EXT[contentType] || extensionFromName(audioFile.name) || 'webm'
    const fileName = `recording.${ext}`

    console.log(`[VoiceTranscribe] user=${user.id} size=${audioFile.size} type=${contentType} ext=${ext}`)

    // 4. Send to OpenAI Whisper API
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
      console.error(`[VoiceTranscribe] Whisper API error: status=${response.status} body=${body.slice(0, 500)}`)
      return errorResponse(
        `Transcription service error (${response.status})`,
        'WHISPER_API_ERROR',
        502
      )
    }

    const data = await response.json()
    const transcript = data.text?.trim()

    console.log(`[VoiceTranscribe] user=${user.id} transcript_length=${transcript?.length || 0}`)

    if (!transcript) {
      return errorResponse('No speech detected in audio', 'NO_SPEECH', 422)
    }

    return NextResponse.json({ transcript })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceTranscribe] Unhandled error:', message)
    return errorResponse('Transcription failed unexpectedly', 'SERVER_ERROR', 500)
  }
}

/** Try to extract extension from filename (e.g. "voice_001.m4a" → "m4a") */
function extensionFromName(name: string): string | null {
  const match = name.match(/\.(\w+)$/)
  if (!match) return null
  const ext = match[1].toLowerCase()
  // Only return Whisper-compatible extensions
  const valid = ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'mpeg', 'mpga']
  return valid.includes(ext) ? ext : null
}
