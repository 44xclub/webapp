import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/notifications/dispatch
 *
 * Queue processor for notification_dispatch_queue.
 * Picks up pending rows and attempts delivery.
 *
 * For email: calls the configured email provider adapter.
 * Idempotent: marks rows as processing/sent/failed.
 *
 * Auth: CRON_SECRET required.
 */

// Email provider adapter — isolates provider logic
async function sendEmail(params: {
  to: string
  subject: string
  body: string
  payload: Record<string, unknown>
}): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.N8N_EMAIL_WEBHOOK_URL || process.env.N8N_RSVP_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('[dispatch] No email webhook URL configured — skipping send')
    return { ok: true } // Don't fail, just skip
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'notification_email',
        to: params.to,
        subject: params.subject,
        body: params.body,
        ...params.payload,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch pending dispatch rows (limit batch size)
    const { data: pendingRows, error: fetchErr } = await supabase
      .from('notification_dispatch_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!pendingRows || pendingRows.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No pending items' })
    }

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const row of pendingRows) {
      // Mark as processing
      await supabase
        .from('notification_dispatch_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', row.id)

      if (row.channel === 'email') {
        // Get user email
        const { data: profile } = await supabase
          .from('profiles')
          .select('whop_email, display_name')
          .eq('id', row.user_id)
          .single()

        if (!profile?.whop_email) {
          // No email — mark as failed
          await supabase
            .from('notification_dispatch_queue')
            .update({
              status: 'failed',
              error_message: 'No email address on profile',
              attempts: row.attempts + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
          failed++
          continue
        }

        const result = await sendEmail({
          to: profile.whop_email,
          subject: row.subject || 'Notification',
          body: row.body || '',
          payload: {
            ...((row.payload as Record<string, unknown>) || {}),
            user_name: profile.display_name,
            event_key: row.event_key,
          },
        })

        if (result.ok) {
          await supabase
            .from('notification_dispatch_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: row.attempts + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
          sent++
        } else {
          const newAttempts = row.attempts + 1
          await supabase
            .from('notification_dispatch_queue')
            .update({
              status: newAttempts >= row.max_attempts ? 'failed' : 'pending',
              error_message: result.error || 'Unknown error',
              attempts: newAttempts,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
          failed++
        }
      } else {
        // Unknown channel — skip
        await supabase
          .from('notification_dispatch_queue')
          .update({
            status: 'failed',
            error_message: `Unsupported channel: ${row.channel}`,
            attempts: row.attempts + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        skipped++
      }
    }

    return NextResponse.json({
      ok: true,
      processed: pendingRows.length,
      sent,
      failed,
      skipped,
    })
  } catch (err) {
    console.error('[api/notifications/dispatch] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'notification-dispatch',
    status: 'ready',
    description: 'POST to process pending notification queue. Include x-cron-secret header.',
  })
}
