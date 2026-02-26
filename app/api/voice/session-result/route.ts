import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/voice/session-result?session_id=xxx
 *
 * Polls for the result of a breakout voice capture session.
 * Returns the transcript once the external capture page has completed
 * recording and transcription.
 *
 * Statuses:
 * - pending: session created, waiting for external capture
 * - completed: audio captured and transcribed, transcript available
 * - expired: session timed out (10 min TTL)
 * - failed: capture or transcription failed
 */
export async function GET(request: NextRequest) {
  try {
    const user = await resolveUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: session, error: fetchError } = await supabase
      .from('voice_capture_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({
        status: 'expired',
        transcript: null,
      })
    }

    return NextResponse.json({
      status: session.status,
      transcript: session.transcript || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceSessionResult] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
