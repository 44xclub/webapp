// =====================================================
// Voice Blocks v2 — Transcript Parser (OpenAI)
// =====================================================

import { buildSystemPrompt } from './prompt'
import { VOICE_LLM_MODEL, MIN_CONFIDENCE_THRESHOLD } from './config'
import type { LLMAction, VoiceBlockType, VoiceMode } from './types'

const VALID_INTENTS = ['create_block', 'reschedule_block', 'cancel_block']
const VALID_BLOCK_TYPES: VoiceBlockType[] = ['workout', 'habit', 'nutrition', 'checkin', 'personal']

interface ParseResult {
  action: LLMAction
  confidence: number
  needs_clarification: string[]
}

/**
 * Send transcript to OpenAI and get back a structured action.
 * Throws on invalid response or API errors.
 */
export async function parseTranscript(
  transcript: string,
  timezone: string,
  nowISO: string
): Promise<ParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const systemPrompt = buildSystemPrompt(timezone, nowISO)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOICE_LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
      max_tokens: 800,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${body}`)
  }

  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content?.trim()

  if (!rawContent) {
    throw new Error('Empty response from OpenAI')
  }

  // Strip code fences if the model wraps in them despite instructions
  const jsonStr = rawContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error(`Failed to parse LLM JSON: ${jsonStr.slice(0, 200)}`)
  }

  // Validate intent
  const intent = parsed.intent as string
  if (!VALID_INTENTS.includes(intent)) {
    throw new Error(`Unknown intent: ${intent}`)
  }

  // Validate block_type for create_block
  if (intent === 'create_block') {
    const block = parsed.block as Record<string, unknown> | null
    if (!block) throw new Error('create_block requires a block object')
    const blockType = block.block_type as string
    if (!VALID_BLOCK_TYPES.includes(blockType as VoiceBlockType)) {
      throw new Error(`Unsupported block_type: ${blockType}`)
    }
  }

  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
  const needs_clarification = Array.isArray(parsed.needs_clarification)
    ? (parsed.needs_clarification as string[])
    : []

  // If confidence is too low, force clarification
  if (confidence < MIN_CONFIDENCE_THRESHOLD && needs_clarification.length === 0) {
    needs_clarification.push('Could you clarify what you meant?')
  }

  return {
    action: parsed as unknown as LLMAction,
    confidence,
    needs_clarification,
  }
}

/**
 * Determine whether a create_block action should be LOG or SCHEDULE.
 * Compares the resolved datetime against the current time in the user's timezone.
 */
export function determineMode(
  action: LLMAction,
  nowISO: string
): { mode: VoiceMode; resolvedDatetime: string | null } {
  if (action.intent !== 'create_block' || !action.block) {
    return { mode: 'schedule', resolvedDatetime: null }
  }

  const block = action.block
  const datetimeStr = block.datetime_local

  // Checkins are always logged
  if (block.block_type === 'checkin') {
    return {
      mode: 'log',
      resolvedDatetime: datetimeStr || nowISO,
    }
  }

  // No datetime provided — default to schedule
  if (!datetimeStr) {
    return { mode: 'schedule', resolvedDatetime: null }
  }

  // Compare datetime against now
  const intended = new Date(datetimeStr)
  const now = new Date(nowISO)

  if (intended.getTime() < now.getTime()) {
    return { mode: 'log', resolvedDatetime: datetimeStr }
  }
  return { mode: 'schedule', resolvedDatetime: datetimeStr }
}

/**
 * Generate a human-readable summary of the proposed action.
 */
export function summarizeAction(
  action: LLMAction,
  mode: VoiceMode | null
): string {
  switch (action.intent) {
    case 'create_block': {
      const { block } = action
      if (!block) return 'Create block'
      const verb = mode === 'log' ? 'Log' : 'Schedule'
      const typeName = block.block_type === 'checkin' ? 'Check-in' : (block.title || capitalise(block.block_type))
      const timeStr = block.datetime_local
        ? ` on ${block.datetime_local.slice(0, 10)} at ${block.datetime_local.slice(11, 16)}`
        : ''
      return `${verb} ${typeName}${timeStr}`
    }
    case 'reschedule_block': {
      const from = action.target?.selector
        ? `${action.target.selector.date_local || '?'} ${action.target.selector.start_time_local || '?'}`
        : action.target?.block_id || 'unknown'
      const rAction = action as LLMAction & { new_time?: { date_local: string; start_time_local: string } }
      const to = rAction.new_time
        ? `${rAction.new_time.date_local} at ${rAction.new_time.start_time_local}`
        : 'new time'
      return `Move block from ${from} to ${to}`
    }
    case 'cancel_block': {
      const target = action.target?.selector
        ? `${action.target.selector.date_local || '?'} at ${action.target.selector.start_time_local || '?'}`
        : action.target?.block_id || 'unknown'
      return `Cancel block on ${target}`
    }
  }
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
