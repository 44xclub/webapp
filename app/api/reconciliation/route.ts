import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runReconciliation } from '@/lib/reconciliation/engine'

/**
 * POST /api/reconciliation
 *
 * Daily reconciliation endpoint. Computes scores, updates streaks,
 * evaluates badge eligibility, and generates team daily overviews.
 *
 * Authentication: requires CRON_SECRET header to prevent unauthorized access.
 * Call from Railway cron, Supabase pg_cron, or any scheduler.
 *
 * Idempotent: running twice for the same dates will not double-count.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const result = await runReconciliation(supabase)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (err) {
    console.error('[Reconciliation] Fatal error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support GET for easy testing / health checks (no mutation)
export async function GET() {
  return NextResponse.json({
    service: 'reconciliation',
    status: 'ready',
    description: 'POST to this endpoint to run daily reconciliation. Include x-cron-secret header.',
  })
}
