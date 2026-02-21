// =====================================================
// Voice Scheduling v1 — Configuration
// =====================================================

/** Default workout duration in minutes when not specified by user */
export const DEFAULT_WORKOUT_DURATION_MINUTES = 60

/** Default timezone when profile has none */
export const DEFAULT_TIMEZONE = 'Europe/London'

/** Confidence threshold — below this, needs_clarification is forced */
export const MIN_CONFIDENCE_THRESHOLD = 0.6

/** OpenAI model used for transcript parsing */
export const VOICE_LLM_MODEL = 'gpt-4o-mini'

/** Max transcript length accepted */
export const MAX_TRANSCRIPT_LENGTH = 1000
