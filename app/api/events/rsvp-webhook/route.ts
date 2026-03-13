import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET handler for diagnostics — check if env vars are wired
export async function GET() {
  const webhookUrl = process.env.N8N_RSVP_WEBHOOK_URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return NextResponse.json({
    webhook_url_set: !!webhookUrl,
    webhook_url_preview: webhookUrl ? webhookUrl.substring(0, 30) + '...' : null,
    supabase_url_set: !!supabaseUrl,
    has_service_key: hasServiceKey,
    has_anon_key: hasAnonKey,
  })
}

export async function POST(req: NextRequest) {
  const WEBHOOK_URL = process.env.N8N_RSVP_WEBHOOK_URL

  console.log('[rsvp-webhook] POST hit. WEBHOOK_URL set:', !!WEBHOOK_URL)

  if (!WEBHOOK_URL) {
    console.warn('[rsvp-webhook] N8N_RSVP_WEBHOOK_URL is not set — skipping')
    return NextResponse.json({ ok: true, skipped: true, reason: 'N8N_RSVP_WEBHOOK_URL not configured' })
  }

  try {
    const body = await req.json()
    const { eventId, userId, response } = body
    console.log('[rsvp-webhook] Payload received:', { eventId, userId, response })

    if (!eventId || !userId || !response) {
      console.error('[rsvp-webhook] Missing required fields:', { eventId, userId, response })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch event and user details for the webhook payload
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      console.error('[rsvp-webhook] Supabase credentials missing')
      return NextResponse.json({ ok: true, skipped: true, reason: 'Supabase not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const [{ data: event, error: eventErr }, { data: profile, error: profileErr }] = await Promise.all([
      supabase.from('events').select('id, title, starts_at, ends_at, timezone, location_type, location_text, meeting_url, city, capacity, rsvp_going_count').eq('id', eventId).single(),
      supabase.from('profiles').select('id, display_name, whop_email').eq('id', userId).single(),
    ])

    if (eventErr) console.error('[rsvp-webhook] Event fetch error:', eventErr.message)
    if (profileErr) console.error('[rsvp-webhook] Profile fetch error:', profileErr.message)

    if (!event || !profile) {
      console.error('[rsvp-webhook] Event or profile not found:', { event: !!event, profile: !!profile })
      return NextResponse.json({ error: 'Event or user not found', details: { event: !!event, profile: !!profile } }, { status: 404 })
    }

    console.log('[rsvp-webhook] Fetched event:', event.title, '| User:', profile.display_name, '| Email:', profile.whop_email)

    const spotsLeft = event.capacity != null
      ? Math.max(0, event.capacity - event.rsvp_going_count)
      : null

    const payload = {
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
    }

    console.log('[rsvp-webhook] Forwarding to n8n:', WEBHOOK_URL.substring(0, 30) + '...')

    // Fire webhook to n8n
    const webhookRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const responseText = await webhookRes.text()
    console.log('[rsvp-webhook] n8n response:', webhookRes.status, responseText.substring(0, 200))

    if (!webhookRes.ok) {
      return NextResponse.json({ ok: false, n8n_status: webhookRes.status, n8n_body: responseText.substring(0, 200) })
    }

    return NextResponse.json({ ok: true, n8n_status: webhookRes.status })
  } catch (err) {
    console.error('[rsvp-webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook failed', message: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
