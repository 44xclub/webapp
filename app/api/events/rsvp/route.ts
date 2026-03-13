import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rsvpToEvent } from '@/lib/services/events'

/**
 * POST /api/events/rsvp
 *
 * Server-side RSVP state machine.
 * Frontend calls this instead of directly writing to event_rsvps.
 * The server determines whether user goes to 'going' or 'waitlist'.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, userId } = body

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Missing eventId or userId' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const result = await rsvpToEvent(supabase, eventId, userId)

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    })
  } catch (err) {
    console.error('[api/events/rsvp] Error:', err)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
