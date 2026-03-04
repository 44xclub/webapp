import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/workouts/{blockId}/complete
 *
 * Marks a workout block as completed.
 *
 * Authentication: uses Supabase session (cookie-based).
 *
 * Idempotent: completing an already-completed block returns success
 * without duplicate side effects.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { blockId: string } }
) {
  const { blockId } = params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const userId = user.id

  // Fetch the block and validate ownership + type + status
  const { data: block, error: blockError } = await supabase
    .from('blocks')
    .select('id, user_id, block_type, title, payload, completed_at, deleted_at')
    .eq('id', blockId)
    .single()

  if (blockError || !block) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 })
  }

  if (block.user_id !== userId) {
    return NextResponse.json({ error: 'Block does not belong to this user' }, { status: 403 })
  }

  if (block.deleted_at) {
    return NextResponse.json({ error: 'Block has been deleted' }, { status: 410 })
  }

  if (block.block_type !== 'workout') {
    return NextResponse.json({ error: 'Block is not a workout type' }, { status: 422 })
  }

  // Idempotency: if already completed, return success
  if (block.completed_at) {
    return NextResponse.json({
      success: true,
      already_completed: true,
      completed_at: block.completed_at,
    })
  }

  // Mark as completed in DB
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('blocks')
    .update({ completed_at: now })
    .eq('id', blockId)
    .eq('user_id', userId)

  if (updateError) {
    console.error('[WorkoutComplete] DB update failed:', updateError.message)
    return NextResponse.json(
      { error: 'Failed to mark block as completed' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    completed_at: now,
  })
}
