import { NextRequest, NextResponse } from 'next/server'
import { resolveUser } from '@/app/api/voice/_auth'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/voice/capture-session
 *
 * Creates a voice capture session for breakout recording. The embedded app
 * calls this when inline mic capture is blocked, then opens the external
 * /voice-capture page in the system browser.
 *
 * Body: { return_url?: string }
 * Returns: { session_id, capture_url, return_url }
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

    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min TTL

    const { error: insertError } = await supabase
      .from('voice_capture_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        status: 'created',
        return_url: returnUrl,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('[VoiceCaptureSession] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    const origin = request.nextUrl.origin
    const captureUrl = `${origin}/voice-capture?session_id=${sessionId}`

    return NextResponse.json({
      session_id: sessionId,
      capture_url: captureUrl,
      return_url: returnUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceCaptureSession] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
