import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/voice/capture-session
 *
 * Creates a temporary voice capture session. Used by Strategy B (breakout
 * recording) when mic capture is blocked inside the Whop mobile iframe.
 *
 * The client opens an external page in the system browser that records
 * audio, uploads it, and stores the transcript under this session_id.
 * The embedded app then polls /api/voice/session-result to retrieve it.
 *
 * Body: { return_url?: string }
 * Returns: { session_id, capture_url }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await resolveUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const returnUrl = body.return_url || null

    const supabase = await createClient()

    // Create a capture session record
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min TTL

    const { error: insertError } = await supabase
      .from('voice_capture_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        status: 'pending',
        return_url: returnUrl,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('[VoiceCaptureSession] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Build the capture URL — external page that opens in system browser
    const origin = request.nextUrl.origin
    const captureUrl = `${origin}/voice-capture?session_id=${sessionId}`

    return NextResponse.json({
      session_id: sessionId,
      capture_url: captureUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceCaptureSession] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
