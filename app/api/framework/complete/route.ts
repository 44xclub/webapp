import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyFrameworkCompleted } from '@/lib/services/notifications'

/**
 * POST /api/framework/complete
 *
 * Called when a user completes all framework criteria for the day.
 * Creates a deduplicated notification — fires once per user per date.
 *
 * Body: { userId: string, date: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, date } = body

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'Missing userId or date' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify completion: check that all items are actually checked
    const { data: userFramework } = await supabase
      .from('user_frameworks')
      .select('framework_template_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!userFramework) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'No active framework' })
    }

    // Get all framework items for today
    const { data: items } = await supabase
      .from('daily_framework_items')
      .select('checked')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('framework_template_id', userFramework.framework_template_id)

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'No items found' })
    }

    const allChecked = items.every((item) => item.checked)
    if (!allChecked) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Not all items checked' })
    }

    // Create deduplicated notification
    await notifyFrameworkCompleted(supabase, userId, date)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/framework/complete] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
