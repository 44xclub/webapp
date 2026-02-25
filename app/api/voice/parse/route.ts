import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseTranscript, summarizeAction, determineMode } from '@/lib/voice/parse-transcript'
import { DEFAULT_TIMEZONE, MAX_TRANSCRIPT_LENGTH } from '@/lib/voice/config'
import type { VoiceParseRequest } from '@/lib/voice/types'
import { resolveUser } from '@/app/api/voice/_auth'

/**
 * POST /api/voice/parse
 *
 * Accepts a transcript, runs it through the LLM to produce a proposed
 * block action, determines LOG vs SCHEDULE, logs the attempt in
 * voice_commands_log, and returns the proposed action for user confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await resolveUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createAdminClient()

    // 2. Parse request body
    const body = (await request.json()) as VoiceParseRequest

    if (!body.transcript || typeof body.transcript !== 'string') {
      return NextResponse.json(
        { error: 'transcript is required' },
        { status: 400 }
      )
    }

    const transcript = body.transcript.trim()
    if (transcript.length === 0) {
      return NextResponse.json(
        { error: 'transcript cannot be empty' },
        { status: 400 }
      )
    }

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { error: `transcript exceeds maximum length of ${MAX_TRANSCRIPT_LENGTH} characters` },
        { status: 400 }
      )
    }

    // 3. Get user timezone from profile
    const { data: profile } = await db
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()

    const timezone = profile?.timezone || DEFAULT_TIMEZONE

    // 4. Get current time in user's timezone
    const nowISO = new Date().toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T')

    // 5. Call LLM to parse transcript
    const { action, confidence, needs_clarification } = await parseTranscript(
      transcript,
      timezone,
      nowISO
    )

    // 6. Determine LOG vs SCHEDULE for create_block
    const { mode, resolvedDatetime } = determineMode(action, nowISO)

    const summaryText = summarizeAction(action, action.intent === 'create_block' ? mode : null)

    // 7. Log to voice_commands_log with status='proposed'
    const { data: logRow, error: logError } = await db
      .from('voice_commands_log')
      .insert({
        user_id: user.id,
        input_type: 'text' as const,
        intent: action.intent,
        raw_transcript: transcript,
        proposed_action: action as unknown as Record<string, unknown>,
        confidence,
        needs_clarification,
        status: 'proposed',
      })
      .select('id')
      .single()

    if (logError) {
      console.error('[VoiceParse] Failed to create log row:', logError.message)
      return NextResponse.json(
        { error: 'Failed to log voice command' },
        { status: 500 }
      )
    }

    // 8. Return proposed action with mode
    return NextResponse.json({
      command_id: logRow.id,
      proposed_action: action,
      mode: action.intent === 'create_block' ? mode : null,
      resolved_datetime: resolvedDatetime,
      summary_text: summaryText,
      needs_clarification,
      confidence,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[VoiceParse] Error:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
