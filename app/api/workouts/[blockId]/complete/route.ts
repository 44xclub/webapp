import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWhopToken } from '@/lib/whop/verify-token'
import { postWorkoutCompletion } from '@/lib/whop/chat'

/**
 * POST /api/workouts/{blockId}/complete
 *
 * Marks a workout block as completed and posts a message to the
 * configured Whop Elite Community Chat channel.
 *
 * Authentication: requires a valid Whop iframe JWT in the
 * x-whop-user-token header.
 *
 * Idempotent: completing an already-completed block returns success
 * without posting a duplicate chat message.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { blockId: string } }
) {
  const { blockId } = params

  // 1. Verify Whop JWT
  const whopToken = request.headers.get('x-whop-user-token')
  if (!whopToken) {
    return NextResponse.json(
      { error: 'Missing x-whop-user-token header' },
      { status: 401 }
    )
  }

  let whopUserId: string
  try {
    const payload = await verifyWhopToken(whopToken)
    whopUserId = payload.sub
    console.log('[WorkoutComplete] JWT verified for Whop user')
  } catch (err) {
    console.error('[WorkoutComplete] JWT verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid or expired Whop token' },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()

  // 2. Look up internal user by whop_user_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('whop_user_id', whopUserId)
    .single()

  if (profileError || !profile) {
    console.error('[WorkoutComplete] Profile lookup failed:', profileError?.message)
    return NextResponse.json(
      { error: 'No linked profile found for this Whop account' },
      { status: 404 }
    )
  }

  const userId = profile.id

  // 3. Fetch the block and validate ownership + type + status
  const { data: block, error: blockError } = await supabase
    .from('blocks')
    .select('id, user_id, block_type, title, payload, completed_at, chat_message_sent_at, deleted_at')
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

  // 4. Idempotency: if already completed, return success without duplicate post
  if (block.completed_at) {
    return NextResponse.json({
      success: true,
      already_completed: true,
      completed_at: block.completed_at,
      chat_sent: !!block.chat_message_sent_at,
    })
  }

  // 5. Mark as completed in DB
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('blocks')
    .update({
      completed_at: now,
      chat_dispatch_status: 'pending',
    })
    .eq('id', blockId)
    .eq('user_id', userId)

  if (updateError) {
    console.error('[WorkoutComplete] DB update failed:', updateError.message)
    return NextResponse.json(
      { error: 'Failed to mark block as completed' },
      { status: 500 }
    )
  }

  console.log('[WorkoutComplete] Block marked completed:', blockId)

  // 6. Post to Whop chat (non-blocking — do not fail the completion)
  let chatSent = false
  try {
    await postWorkoutCompletion({
      displayName: profile.display_name || 'A member',
      workoutTitle: block.title,
      payload: (block.payload as Record<string, unknown>) || {},
    })

    // Record success
    await supabase
      .from('blocks')
      .update({
        chat_message_sent_at: new Date().toISOString(),
        chat_dispatch_status: 'sent',
        chat_dispatch_error: null,
      })
      .eq('id', blockId)

    chatSent = true
    console.log('[WorkoutComplete] Chat message sent for block:', blockId)
  } catch (chatErr) {
    const errMsg = chatErr instanceof Error ? chatErr.message : 'Unknown chat error'
    console.error('[WorkoutComplete] Chat dispatch failed:', errMsg)

    // Record failure — completion still succeeds
    await supabase
      .from('blocks')
      .update({
        chat_dispatch_status: 'failed',
        chat_dispatch_error: errMsg,
      })
      .eq('id', blockId)
  }

  // 7. Return success (completion is the primary concern)
  return NextResponse.json({
    success: true,
    completed_at: now,
    chat_sent: chatSent,
  })
}
