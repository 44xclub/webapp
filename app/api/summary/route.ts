import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyDailySummaryAvailable } from '@/lib/services/notifications'

/**
 * POST /api/summary
 *
 * Daily summary notification job. Runs at 12:00 (Europe/London).
 * Uses daily_summary_runs for idempotency — only runs once per date.
 *
 * Flow:
 * 1. Determine summary_date
 * 2. Check if already run for this date
 * 3. Mark status = 'processing'
 * 4. Notify all active users
 * 5. Mark status = 'completed'
 *
 * Auth: CRON_SECRET required.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Use Europe/London timezone as the app default
    const summaryDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    // Check if already run for this date
    const { data: existingRun } = await supabase
      .from('daily_summary_runs')
      .select('id, status')
      .eq('summary_date', summaryDate)
      .maybeSingle()

    if (existingRun?.status === 'completed') {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Summary already completed for ${summaryDate}`,
      })
    }

    if (existingRun?.status === 'processing') {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Summary still processing for ${summaryDate}`,
      })
    }

    // Create or update run record
    if (existingRun) {
      await supabase
        .from('daily_summary_runs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', existingRun.id)
    } else {
      const { error: insertErr } = await supabase
        .from('daily_summary_runs')
        .insert({
          summary_date: summaryDate,
          status: 'processing',
          started_at: new Date().toISOString(),
        })

      if (insertErr) {
        // Unique constraint — another process started the run
        if (insertErr.code === '23505') {
          return NextResponse.json({
            ok: true,
            skipped: true,
            reason: 'Run already started by another process',
          })
        }
        throw insertErr
      }
    }

    // Fetch all active users
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('membership_status', 'active')

    if (usersErr) {
      await supabase
        .from('daily_summary_runs')
        .update({
          status: 'failed',
          error_message: usersErr.message,
        })
        .eq('summary_date', summaryDate)

      throw usersErr
    }

    if (!users || users.length === 0) {
      await supabase
        .from('daily_summary_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          user_count: 0,
        })
        .eq('summary_date', summaryDate)

      return NextResponse.json({ ok: true, userCount: 0, summaryDate })
    }

    // Notify users in batches
    const batchSize = 20
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      await Promise.all(
        batch.map((user) =>
          notifyDailySummaryAvailable(supabase, user.id, summaryDate)
        )
      )
    }

    // Mark completed
    await supabase
      .from('daily_summary_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        user_count: users.length,
      })
      .eq('summary_date', summaryDate)

    return NextResponse.json({
      ok: true,
      summaryDate,
      userCount: users.length,
    })
  } catch (err) {
    console.error('[api/summary] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'daily-summary',
    status: 'ready',
    description: 'POST to generate daily summary notifications. Include x-cron-secret header.',
    timezone: 'Europe/London',
  })
}
