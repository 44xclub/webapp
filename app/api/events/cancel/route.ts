import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelEventRsvp } from '@/lib/services/events'

/**
 * POST /api/events/cancel
 *
 * Cancel RSVP + auto-promote next waitlisted user.
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
    const result = await cancelEventRsvp(supabase, eventId, userId)

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    })
  } catch (err) {
    console.error('[api/events/cancel] Error:', err)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
