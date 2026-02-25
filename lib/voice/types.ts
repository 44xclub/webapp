// =====================================================
// Voice Blocks v2 — Shared types
// =====================================================

import type { BlockType } from '@/lib/types/database'

/** Block types supported by voice commands */
export type VoiceBlockType = Exclude<BlockType, 'challenge'>

/** Whether the voice command results in a scheduled or logged block */
export type VoiceMode = 'schedule' | 'log'

/** Workout item from voice input (free-text names) */
export interface VoiceWorkoutItem {
  name: string
  sets: number | null
  reps: number | null
  weight: string | null
  notes: string
}

/** Payload stored inside blocks.payload for voice-created blocks */
export interface VoiceBlockPayload {
  source: 'voice'
  voice_command_id: string
  workout?: {
    duration_minutes: number
    items: VoiceWorkoutItem[]
  }
}

// ---- LLM Output Contract v2 (strict) ----

export interface LLMCreateBlock {
  intent: 'create_block'
  confidence: number
  block: {
    block_type: VoiceBlockType
    datetime_local: string | null // YYYY-MM-DDTHH:MM:SS or null
    duration_minutes: number | null
    title: string | null
    notes: string | null
    payload: Record<string, unknown>
  }
  target: null
  needs_clarification: string[]
}

export interface LLMRescheduleBlock {
  intent: 'reschedule_block'
  confidence: number
  block: null
  target: {
    block_id: string | null
    selector: {
      date_local: string | null
      start_time_local: string | null
      block_type: VoiceBlockType | null
      title_contains: string | null
    } | null
  }
  new_time: {
    date_local: string
    start_time_local: string
  }
  needs_clarification: string[]
}

export interface LLMCancelBlock {
  intent: 'cancel_block'
  confidence: number
  block: null
  target: {
    block_id: string | null
    selector: {
      date_local: string | null
      start_time_local: string | null
      block_type: VoiceBlockType | null
      title_contains: string | null
    } | null
  }
  needs_clarification: string[]
}

export type LLMAction = LLMCreateBlock | LLMRescheduleBlock | LLMCancelBlock

// ---- API request / response types ----

export interface VoiceParseRequest {
  transcript: string
}

export interface VoiceParseResponse {
  command_id: string
  proposed_action: LLMAction
  /** 'schedule' or 'log' — computed server-side for create_block */
  mode: VoiceMode | null
  /** Resolved datetime in user's local timezone */
  resolved_datetime: string | null
  summary_text: string
  needs_clarification: string[]
  confidence: number
}

export interface VoiceExecuteRequest {
  command_id: string
  approved_action: LLMAction
  mode: VoiceMode | null
  resolved_datetime: string | null
}

export interface VoiceExecuteResponse {
  status: 'executed' | 'failed'
  block_id: string | null
  result_summary: string
}
