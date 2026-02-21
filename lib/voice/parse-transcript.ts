// =====================================================
// Voice Scheduling v1 — Transcript Parser (OpenAI)
// =====================================================

import { buildSystemPrompt } from './prompt'
import { VOICE_LLM_MODEL, MIN_CONFIDENCE_THRESHOLD } from './config'
import type { LLMAction } from './types'

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

  // Validate required fields
  const intent = parsed.intent as string
  if (!['create_block', 'reschedule_block', 'cancel_block'].includes(intent)) {
    throw new Error(`Unknown intent: ${intent}`)
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
 * Generate a human-readable summary of the proposed action.
 */
export function summarizeAction(action: LLMAction): string {
  switch (action.intent) {
    case 'create_block': {
      const { block } = action
      const items = block.payload?.workout?.items || []
      const itemNames = items.map((i) => i.name).join(', ')
      const itemStr = itemNames ? ` — ${itemNames}` : ''
      return `Schedule ${block.title || 'Workout'} on ${block.date_local} at ${block.start_time_local}${itemStr}`
    }
    case 'reschedule_block': {
      const from = action.target.selector
        ? `${action.target.selector.date_local} ${action.target.selector.start_time_local}`
        : action.target.block_id || 'unknown'
      return `Move workout from ${from} to ${action.new_time.date_local} at ${action.new_time.start_time_local}`
    }
    case 'cancel_block': {
      const target = action.target.selector
        ? `${action.target.selector.date_local} at ${action.target.selector.start_time_local}`
        : action.target.block_id || 'unknown'
      return `Cancel workout on ${target}`
    }
  }
}
