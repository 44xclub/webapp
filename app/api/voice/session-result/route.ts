import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/voice/session-result?session_id=xxx
 *
 * Polls for the result of a breakout voice capture session.
 * Returns the full parse result once the external page has completed
 * recording, transcription, and LLM parsing.
 *
 * Statuses:
 * - created: session created, waiting for external capture
 * - uploaded: audio received, processing
 * - transcribed: audio transcribed, parsing
 * - parsed: fully processed — transcript + proposed_action available
 * - expired: session timed out (10 min TTL)
 * - failed: capture, transcription, or parse failed
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
    if (new Date(session.expires_at) < new Date() && session.status !== 'parsed') {
      return NextResponse.json({
        status: 'expired',
        transcript: null,
        proposed_action: null,
        summary_text: null,
        command_id: null,
      })
    }

    // For parsed sessions, return the full result
    if (session.status === 'parsed' && session.parse_result) {
      const pr = session.parse_result as Record<string, unknown>
      return NextResponse.json({
        status: 'parsed',
        transcript: session.transcript,
        proposed_action: pr.proposed_action || null,
        summary_text: pr.summary_text || null,
        command_id: pr.command_id || null,
        mode: pr.mode || null,
        resolved_datetime: pr.resolved_datetime || null,
        needs_clarification: pr.needs_clarification || [],
        confidence: pr.confidence || null,
      })
    }

    // For failed sessions, include error
    if (session.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error_message: session.error_message || 'Unknown error',
        transcript: session.transcript || null,
        proposed_action: null,
        summary_text: null,
        command_id: null,
      })
    }

    // Still processing (created, uploaded, transcribed)
    return NextResponse.json({
      status: session.status,
      transcript: null,
      proposed_action: null,
      summary_text: null,
      command_id: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceSessionResult] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
