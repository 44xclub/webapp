// =====================================================
// Voice Scheduling v1 — Shared types
// =====================================================

/** Workout item from voice input (free-text names in v1) */
export interface VoiceWorkoutItem {
  name: string
  sets: number | null
  reps: number | null
  notes: string
}

/** Payload stored inside blocks.payload for voice-created blocks */
export interface VoiceBlockPayload {
  source: 'voice'
  voice: {
    command_id: string
  }
  workout: {
    duration_minutes: number
    items: VoiceWorkoutItem[]
  }
}

// ---- LLM Output Contract (strict) ----

export interface LLMCreateBlock {
  intent: 'create_block'
  block: {
    block_type: 'workout'
    date_local: string // YYYY-MM-DD
    start_time_local: string // HH:MM
    duration_minutes: number
    title: string
    notes: string
    payload: {
      workout: {
        items: VoiceWorkoutItem[]
      }
    }
  }
  needs_clarification: string[]
}

export interface LLMRescheduleBlock {
  intent: 'reschedule_block'
  target: {
    block_id: string | null
    selector: {
      date_local: string
      start_time_local: string
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
  target: {
    block_id: string | null
    selector: {
      date_local: string
      start_time_local: string
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
  summary_text: string
  needs_clarification: string[]
  confidence: number
}

export interface VoiceExecuteRequest {
  command_id: string
  approved_action: LLMAction
}

export interface VoiceExecuteResponse {
  status: 'executed' | 'failed'
  block_id: string | null
  result_summary: string
}
