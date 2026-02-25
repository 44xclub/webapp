import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_WORKOUT_DURATION_MINUTES } from '@/lib/voice/config'
import type { VoiceExecuteRequest, LLMAction, VoiceBlockPayload, VoiceWorkoutItem, VoiceMode } from '@/lib/voice/types'
import { resolveUser } from '@/app/api/voice/_auth'

type SupabaseClient = ReturnType<typeof createAdminClient>

/**
 * POST /api/voice/execute
 *
 * Executes a previously proposed voice command after user confirmation.
 * Supports all block types, LOG vs SCHEDULE mode, and feed post creation.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await resolveUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createAdminClient()

    // 2. Parse request
    const body = (await request.json()) as VoiceExecuteRequest

    if (!body.command_id || !body.approved_action) {
      return NextResponse.json(
        { error: 'command_id and approved_action are required' },
        { status: 400 }
      )
    }

    const { command_id, approved_action, mode, resolved_datetime } = body

    // 3. Verify the command log exists and belongs to this user
    const { data: logRow, error: logError } = await db
      .from('voice_commands_log')
      .select('id, user_id, status')
      .eq('id', command_id)
      .single()

    if (logError || !logRow) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 })
    }

    if (logRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Command does not belong to this user' }, { status: 403 })
    }

    if (logRow.status !== 'proposed') {
      return NextResponse.json(
        { error: `Command already has status: ${logRow.status}` },
        { status: 409 }
      )
    }

    // 4. Validate the action intent
    const intent = approved_action.intent
    if (!['create_block', 'reschedule_block', 'cancel_block'].includes(intent)) {
      await markFailed(db, command_id, `Invalid intent: ${intent}`)
      return NextResponse.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
    }

    // 5. Execute based on intent
    let blockId: string | null = null
    let resultSummary = ''

    try {
      switch (intent) {
        case 'create_block': {
          const result = await executeCreate(db, user.id, command_id, approved_action, mode, resolved_datetime)
          blockId = result.blockId
          resultSummary = result.summary
          break
        }
        case 'reschedule_block': {
          const result = await executeReschedule(db, user.id, approved_action)
          blockId = result.blockId
          resultSummary = result.summary
          break
        }
        case 'cancel_block': {
          const result = await executeCancel(db, user.id, approved_action)
          blockId = result.blockId
          resultSummary = result.summary
          break
        }
      }
    } catch (execErr) {
      const errMsg = execErr instanceof Error ? execErr.message : 'Execution failed'
      await markFailed(db, command_id, errMsg)
      return NextResponse.json(
        { status: 'failed', block_id: null, result_summary: errMsg },
        { status: 422 }
      )
    }

    // 6. Update voice_commands_log to executed
    await db
      .from('voice_commands_log')
      .update({
        status: 'executed',
        block_id: blockId,
        executed_at: new Date().toISOString(),
      })
      .eq('id', command_id)

    return NextResponse.json({
      status: 'executed',
      block_id: blockId,
      result_summary: resultSummary,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceExecute] Error:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// ---- Helpers ----

async function markFailed(
  db: SupabaseClient,
  commandId: string,
  errorMessage: string
) {
  await db
    .from('voice_commands_log')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', commandId)
}

/**
 * Create a block from voice input.
 * - LOG mode: is_planned=false, completed_at=performed_at=resolved_datetime, shared_to_feed=true, create feed_posts row
 * - SCHEDULE mode: is_planned=true
 */
async function executeCreate(
  db: SupabaseClient,
  userId: string,
  commandId: string,
  action: LLMAction,
  mode: VoiceMode | null,
  resolvedDatetime: string | null
) {
  if (action.intent !== 'create_block') throw new Error('Wrong intent')

  const { block } = action
  const isLog = mode === 'log'
  const now = new Date().toISOString()

  // Parse date and start_time from datetime_local
  const datetimeStr = resolvedDatetime || block.datetime_local
  let dateLocal: string
  let startTimeLocal: string

  if (datetimeStr) {
    // datetime_local format: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DDTHH:MM
    dateLocal = datetimeStr.slice(0, 10)
    startTimeLocal = datetimeStr.slice(11, 16)
  } else {
    // No datetime — use today + current time
    dateLocal = now.slice(0, 10)
    startTimeLocal = now.slice(11, 16)
  }

  // Calculate end_time from start_time + duration
  const durationMinutes = block.duration_minutes || DEFAULT_WORKOUT_DURATION_MINUTES
  const [hours, mins] = startTimeLocal.split(':').map(Number)
  const totalMins = hours * 60 + mins + durationMinutes
  const endHours = Math.floor(totalMins / 60) % 24
  const endMins = totalMins % 60
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

  // Build voice payload
  const voicePayload: VoiceBlockPayload = {
    source: 'voice',
    voice_command_id: commandId,
  }

  // Attach workout items if present
  const workoutData = block.payload?.workout as { items?: VoiceWorkoutItem[] } | undefined
  if (block.block_type === 'workout' && workoutData?.items) {
    voicePayload.workout = {
      duration_minutes: durationMinutes,
      items: workoutData.items,
    }
  }

  // Build default title based on block type
  const defaultTitles: Record<string, string> = {
    workout: 'Workout',
    habit: 'Habit',
    nutrition: 'Meal',
    checkin: 'Check-in',
    personal: 'Personal',
  }
  const title = block.title || defaultTitles[block.block_type] || 'Block'

  // Build insert data
  const insertData: Record<string, unknown> = {
    user_id: userId,
    date: dateLocal,
    start_time: startTimeLocal,
    end_time: endTime,
    block_type: block.block_type,
    title,
    notes: block.notes || null,
    payload: { ...voicePayload, ...block.payload, source: 'voice', voice_command_id: commandId } as Record<string, unknown>,
    is_planned: !isLog,
  }

  // LOG mode fields
  if (isLog) {
    const performedAt = datetimeStr ? new Date(datetimeStr).toISOString() : now
    insertData.completed_at = performedAt
    insertData.performed_at = performedAt
    insertData.shared_to_feed = block.block_type !== 'personal'
  }

  const { data: newBlock, error } = await db
    .from('blocks')
    .insert(insertData)
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create block: ${error.message}`)

  // Create feed post for logged blocks (except personal)
  if (isLog && block.block_type !== 'personal') {
    try {
      await db.from('feed_posts').insert({
        user_id: userId,
        block_id: newBlock.id,
        title,
        body: block.notes || null,
        payload: { block_type: block.block_type, source: 'voice' },
      })
    } catch (feedErr) {
      console.error('[VoiceExecute] Feed post creation failed:', feedErr)
      // Non-fatal — block was still created
    }
  }

  const verb = isLog ? 'Logged' : 'Scheduled'
  return {
    blockId: newBlock.id,
    summary: `${verb}: ${title} — ${startTimeLocal}`,
  }
}

async function executeReschedule(
  db: SupabaseClient,
  userId: string,
  action: LLMAction
) {
  if (action.intent !== 'reschedule_block') throw new Error('Wrong intent')

  const blockId = await resolveTargetBlock(db, userId, action.target)

  const { error } = await db
    .from('blocks')
    .update({
      date: action.new_time.date_local,
      start_time: action.new_time.start_time_local,
    })
    .eq('id', blockId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to reschedule block: ${error.message}`)

  return {
    blockId,
    summary: `Moved to ${action.new_time.date_local} at ${action.new_time.start_time_local}`,
  }
}

async function executeCancel(
  db: SupabaseClient,
  userId: string,
  action: LLMAction
) {
  if (action.intent !== 'cancel_block') throw new Error('Wrong intent')

  const blockId = await resolveTargetBlock(db, userId, action.target)

  const { error } = await db
    .from('blocks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', blockId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to cancel block: ${error.message}`)

  return {
    blockId,
    summary: 'Block cancelled',
  }
}

/**
 * Resolve which block the user is referring to.
 * Supports direct block_id or selector-based lookup with block_type and title_contains.
 * Only matches scheduled (is_planned=true), non-deleted blocks.
 */
async function resolveTargetBlock(
  db: SupabaseClient,
  userId: string,
  target: {
    block_id: string | null
    selector: {
      date_local: string | null
      start_time_local: string | null
      block_type: string | null
      title_contains: string | null
    } | null
  }
): Promise<string> {
  // Direct ID
  if (target.block_id) {
    const { data, error } = await db
      .from('blocks')
      .select('id')
      .eq('id', target.block_id)
      .eq('user_id', userId)
      .eq('is_planned', true)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new Error('Target block not found, already completed, or already deleted')
    return data.id
  }

  // Selector-based lookup
  if (!target.selector) {
    throw new Error('No block_id or selector provided')
  }

  let query = db
    .from('blocks')
    .select('id, title')
    .eq('user_id', userId)
    .eq('is_planned', true)
    .is('deleted_at', null)

  if (target.selector.date_local) {
    query = query.eq('date', target.selector.date_local)
  }
  if (target.selector.start_time_local) {
    query = query.eq('start_time', target.selector.start_time_local)
  }
  if (target.selector.block_type) {
    query = query.eq('block_type', target.selector.block_type)
  }

  const { data: matches, error } = await query

  if (error) throw new Error(`Block lookup failed: ${error.message}`)

  if (!matches || matches.length === 0) {
    throw new Error('No matching scheduled block found')
  }

  // If title_contains is provided, filter further
  if (target.selector.title_contains && matches.length > 1) {
    const keyword = target.selector.title_contains.toLowerCase()
    const filtered = matches.filter(
      (m: { id: string; title: string | null }) => m.title?.toLowerCase().includes(keyword)
    )
    if (filtered.length === 1) return filtered[0].id
    if (filtered.length > 1) {
      throw new Error('Multiple matching blocks found — please be more specific')
    }
    // No title matches — fall through to count check below
  }

  if (matches.length > 1) {
    throw new Error('Multiple blocks found at that time — please specify which one')
  }

  return matches[0].id
}
