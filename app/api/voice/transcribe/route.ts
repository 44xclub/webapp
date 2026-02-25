import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'

/** Max audio file size: 10MB (Whisper limit is 25MB) */
const MAX_AUDIO_SIZE = 10 * 1024 * 1024

/**
 * POST /api/voice/transcribe
 *
 * Accepts an audio blob (from MediaRecorder) and transcribes it
 * using the OpenAI Whisper API. Returns the transcript text.
 *
 * This is the fallback path for environments where the Web Speech API
 * is not available (e.g. Whop mobile WebView).
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
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })
    }

    // 2. Read audio from request body (multipart form data)
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Audio file too large (max 10MB)' }, { status: 400 })
    }

    // 3. Send to OpenAI Whisper API
    const whisperForm = new FormData()
    whisperForm.append('file', audioFile, 'recording.webm')
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
      console.error('[VoiceTranscribe] Whisper API error:', response.status, body)
      return NextResponse.json(
        { error: `Transcription failed (${response.status})` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const transcript = data.text?.trim()

    if (!transcript) {
      return NextResponse.json(
        { error: 'No speech detected in audio' },
        { status: 422 }
      )
    }

    return NextResponse.json({ transcript })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceTranscribe] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
