import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const WEBHOOK_URL = process.env.N8N_RSVP_WEBHOOK_URL

export async function POST(req: NextRequest) {
  if (!WEBHOOK_URL) {
    // Webhook not configured — silently succeed so the client isn't affected
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    const { eventId, userId, response } = await req.json()

    if (!eventId || !userId || !response) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch event and user details for the webhook payload
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const [{ data: event }, { data: profile }] = await Promise.all([
      supabase.from('events').select('id, title, starts_at, ends_at, timezone, location_type, location_text, meeting_url, city, capacity, rsvp_going_count').eq('id', eventId).single(),
      supabase.from('profiles').select('id, display_name, whop_email').eq('id', userId).single(),
    ])

    if (!event || !profile) {
      return NextResponse.json({ error: 'Event or user not found' }, { status: 404 })
    }

    const spotsLeft = event.capacity != null
      ? Math.max(0, event.capacity - event.rsvp_going_count)
      : null

    // Fire webhook to n8n
    const webhookRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'event_rsvp',
        response,
        event: {
          id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          timezone: event.timezone,
          location_type: event.location_type,
          location_text: event.location_text,
          meeting_url: event.meeting_url,
          city: event.city,
          spots_left: spotsLeft,
        },
        user: {
          id: profile.id,
          name: profile.display_name,
          email: profile.whop_email,
        },
        timestamp: new Date().toISOString(),
      }),
    })

    if (!webhookRes.ok) {
      console.error('[rsvp-webhook] n8n returned', webhookRes.status)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[rsvp-webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
