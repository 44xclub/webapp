import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_WORKOUT_DURATION_MINUTES } from '@/lib/voice/config'
import type { VoiceExecuteRequest, LLMAction, VoiceBlockPayload } from '@/lib/voice/types'

/**
 * POST /api/voice/execute
 *
 * Executes a previously proposed voice command after user confirmation.
 * Performs the actual DB write (create / update / soft-delete) on blocks
 * and updates voice_commands_log.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request
    const body = (await request.json()) as VoiceExecuteRequest

    if (!body.command_id || !body.approved_action) {
      return NextResponse.json(
        { error: 'command_id and approved_action are required' },
        { status: 400 }
      )
    }

    const { command_id, approved_action } = body

    // 3. Verify the command log exists and belongs to this user
    const { data: logRow, error: logError } = await supabase
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
      await markFailed(supabase, command_id, `Invalid intent: ${intent}`)
      return NextResponse.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
    }

    // 5. Execute based on intent
    let blockId: string | null = null
    let resultSummary = ''

    try {
      switch (intent) {
        case 'create_block': {
          const result = await executeCreate(supabase, user.id, command_id, approved_action)
          blockId = result.blockId
          resultSummary = result.summary
          break
        }
        case 'reschedule_block': {
          const result = await executeReschedule(supabase, user.id, approved_action)
          blockId = result.blockId
          resultSummary = result.summary
          break
        }
        case 'cancel_block': {
          const result = await executeCancel(supabase, user.id, approved_action)
          blockId = result.blockId
          resultSummary = result.summary
          break
        }
      }
    } catch (execErr) {
      const errMsg = execErr instanceof Error ? execErr.message : 'Execution failed'
      await markFailed(supabase, command_id, errMsg)
      return NextResponse.json(
        { status: 'failed', block_id: null, result_summary: errMsg },
        { status: 422 }
      )
    }

    // 6. Update voice_commands_log to executed
    await supabase
      .from('voice_commands_log')
      .update({
        approved_action: approved_action as unknown as Record<string, unknown>,
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  commandId: string,
  errorMessage: string
) {
  await supabase
    .from('voice_commands_log')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', commandId)
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function executeCreate(
  supabase: SupabaseClient,
  userId: string,
  commandId: string,
  action: LLMAction
) {
  if (action.intent !== 'create_block') throw new Error('Wrong intent')

  const { block } = action
  const durationMinutes = block.duration_minutes || DEFAULT_WORKOUT_DURATION_MINUTES

  // Calculate end_time from start_time + duration
  const [hours, mins] = block.start_time_local.split(':').map(Number)
  const totalMins = hours * 60 + mins + durationMinutes
  const endHours = Math.floor(totalMins / 60) % 24
  const endMins = totalMins % 60
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

  // Build voice payload
  const voicePayload: VoiceBlockPayload = {
    source: 'voice',
    voice: { command_id: commandId },
    workout: {
      duration_minutes: durationMinutes,
      items: block.payload?.workout?.items || [],
    },
  }

  const { data: newBlock, error } = await supabase
    .from('blocks')
    .insert({
      user_id: userId,
      date: block.date_local,
      start_time: block.start_time_local,
      end_time: endTime,
      block_type: 'workout',
      title: block.title || 'Workout',
      notes: block.notes || null,
      payload: voicePayload as unknown as Record<string, unknown>,
      is_planned: true,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create block: ${error.message}`)

  return {
    blockId: newBlock.id,
    summary: `Scheduled: ${block.title || 'Workout'} — ${block.start_time_local}`,
  }
}

async function executeReschedule(
  supabase: SupabaseClient,
  userId: string,
  action: LLMAction
) {
  if (action.intent !== 'reschedule_block') throw new Error('Wrong intent')

  const blockId = await resolveTargetBlock(supabase, userId, action.target)

  const { error } = await supabase
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
  supabase: SupabaseClient,
  userId: string,
  action: LLMAction
) {
  if (action.intent !== 'cancel_block') throw new Error('Wrong intent')

  const blockId = await resolveTargetBlock(supabase, userId, action.target)

  const { error } = await supabase
    .from('blocks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', blockId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to cancel block: ${error.message}`)

  return {
    blockId,
    summary: 'Workout cancelled',
  }
}

/**
 * Resolve which block the user is referring to.
 * Either by direct block_id or by (user_id, date, start_time, block_type=workout).
 */
async function resolveTargetBlock(
  supabase: SupabaseClient,
  userId: string,
  target: { block_id: string | null; selector: { date_local: string; start_time_local: string } | null }
): Promise<string> {
  // Direct ID
  if (target.block_id) {
    const { data, error } = await supabase
      .from('blocks')
      .select('id')
      .eq('id', target.block_id)
      .eq('user_id', userId)
      .eq('block_type', 'workout')
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new Error('Target block not found or already deleted')
    return data.id
  }

  // Selector-based lookup
  if (!target.selector) {
    throw new Error('No block_id or selector provided')
  }

  const { data: matches, error } = await supabase
    .from('blocks')
    .select('id')
    .eq('user_id', userId)
    .eq('date', target.selector.date_local)
    .eq('start_time', target.selector.start_time_local)
    .eq('block_type', 'workout')
    .is('deleted_at', null)

  if (error) throw new Error(`Block lookup failed: ${error.message}`)

  if (!matches || matches.length === 0) {
    throw new Error('No matching workout found at that time')
  }

  if (matches.length > 1) {
    throw new Error('Multiple workouts found at that time — please specify which one')
  }

  return matches[0].id
}
