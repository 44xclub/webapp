import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { broadcastNewEventAdded } from '@/lib/services/notifications'

/**
 * POST /api/events/broadcast
 *
 * Broadcast a newly published event to all active users.
 * Idempotent: uses event_broadcasts tracking to prevent duplicates.
 *
 * Body: { eventId: string }
 *
 * Auth: requires CRON_SECRET or is triggered by admin action.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch event details
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, title, starts_at, timezone, status')
      .eq('id', eventId)
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.status !== 'published') {
      return NextResponse.json({ error: 'Event is not published' }, { status: 400 })
    }

    const result = await broadcastNewEventAdded(supabase, {
      id: event.id,
      title: event.title,
      starts_at: event.starts_at,
      timezone: event.timezone,
    })

    return NextResponse.json({
      ok: true,
      userCount: result.userCount,
      alreadyBroadcast: result.userCount === 0,
    })
  } catch (err) {
    console.error('[api/events/broadcast] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
